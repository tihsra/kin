import { transaction } from '../lib/db.ts';
import { config } from '../config.ts';
import { getRequest, enqueue, notify } from '../repositories/request.repository.ts';

export const radii = config.OUTREACH_RADII;
export async function outreach(requestId: string, stage: number) {
  await transaction(async (tx) => {
    const r = await getRequest(tx, requestId, true);
    if (r.status !== 'open' || new Date(r.deadline).getTime() <= Date.now()) return;
    const { rows: timing } = await tx.query('SELECT next_outreach_at FROM requests WHERE id=$1', [
      requestId,
    ]);
    if (timing[0].next_outreach_at && new Date(timing[0].next_outreach_at).getTime() > Date.now())
      return;
    const { rows: candidates } = await tx.query(
      `SELECT d.user_id,d.email_invitations FROM donor_profiles d
      JOIN users u ON u.id=d.user_id
      WHERE d.blood_group=$2 AND d.available AND (d.available_until IS NULL OR d.available_until>now())
      AND u.verified_at IS NOT NULL AND u.suspended_at IS NULL AND d.user_id<>$3
      AND ST_DWithin(d.location,(SELECT location FROM requests WHERE id=$1),$4)
      AND ST_DWithin(d.location,(SELECT location FROM requests WHERE id=$1),d.radius_km*1000)
      AND NOT EXISTS(SELECT 1 FROM commitments c WHERE c.donor_id=d.user_id AND c.status='confirmed')
      AND NOT EXISTS(SELECT 1 FROM invitations i WHERE i.donor_id=d.user_id AND i.request_id=$1)
      AND (SELECT count(*) FROM invitations i WHERE i.donor_id=d.user_id AND i.created_at>now()-interval '24 hours')<$5
      ORDER BY ST_Distance(d.location,(SELECT location FROM requests WHERE id=$1)),
        (SELECT max(created_at) FROM invitations WHERE donor_id=d.user_id) NULLS FIRST,d.user_id LIMIT $6`,
      [
        requestId,
        r.blood_group,
        r.owner_id,
        radii[Math.min(stage, radii.length - 1)] * 1000,
        config.INVITATION_DAILY_LIMIT,
        config.OUTREACH_BATCH_SIZE,
      ],
    );
    for (const donor of [...candidates].sort((a, b) => a.user_id.localeCompare(b.user_id))) {
      await tx.query('SELECT pg_advisory_xact_lock(hashtextextended($1,1))', [donor.user_id]);
      const { rows: cap } = await tx.query(
        `SELECT count(*)::int AS count FROM invitations WHERE donor_id=$1 AND created_at>now()-interval '24 hours'`,
        [donor.user_id],
      );
      if (cap[0].count >= config.INVITATION_DAILY_LIMIT) continue;
      const { rows } = await tx.query(
        `INSERT INTO invitations(request_id,donor_id,expires_at) VALUES($1,$2,least($3::timestamptz,now()+$4*interval '1 minute')) ON CONFLICT DO NOTHING RETURNING id`,
        [requestId, donor.user_id, r.deadline, config.INVITATION_EXPIRY_MINUTES],
      );
      if (rows[0])
        await notify(
          tx,
          donor.user_id,
          requestId,
          `A ${r.blood_group} request near ${r.city}`,
          `A collection request at ${r.hospital} may fit your availability. Review the destination and timing before offering.`,
          donor.email_invitations,
          true,
        );
    }
    if (!candidates.length && stage >= radii.length - 1) {
      await tx.query('UPDATE requests SET outreach_exhausted=true WHERE id=$1', [requestId]);
      return;
    }
    const nextStage =
      candidates.length === config.OUTREACH_BATCH_SIZE
        ? stage
        : Math.min(stage + 1, radii.length - 1);
    const runAt = new Date(
      Date.now() + (candidates.length ? config.OUTREACH_WAIT_MINUTES * 60000 : 1000),
    );
    await tx.query('UPDATE requests SET next_outreach_at=$2 WHERE id=$1', [requestId, runAt]);
    await enqueue(
      tx,
      'outreach',
      { requestId, stage: nextStage },
      `outreach:${requestId}:${crypto.randomUUID()}`,
      runAt,
    );
  });
}
