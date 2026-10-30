import { z } from 'zod';
import { db, transaction } from '../lib/db.ts';
import { ensure } from '../lib/errors.ts';
import { requestSchema } from '../models/schemas.ts';
import {
  activity,
  getRequest,
  notify,
  requestProjection,
  scheduleOutreach,
} from '../repositories/request.repository.ts';
import type { Database } from '../models/types.ts';

export async function list(userId: string, query: Record<string, unknown>) {
  const q = z
    .object({
      scope: z.enum(['discover', 'mine']).default('discover'),
      page: z.coerce.number().int().min(1).max(10000).default(1),
      blood_group: z.string().max(3).optional(),
      component: z.string().max(30).optional(),
      latitude: z.coerce.number().min(-90).max(90).optional(),
      longitude: z.coerce.number().min(-180).max(180).optional(),
      radius: z.coerce.number().min(1).max(1000).optional(),
    })
    .parse(query);
  const values: unknown[] = [userId];
  const conditions = [
    q.scope === 'mine'
      ? 'r.owner_id=$1'
      : `r.status='open' AND r.deadline>now() AND r.owner_id<>$1`,
  ];
  for (const [column, value] of [
    ['blood_group', q.blood_group],
    ['component', q.component],
  ]) {
    if (value) {
      values.push(value);
      conditions.push(`r.${column}=$${values.length}`);
    }
  }
  if (q.latitude !== undefined && q.longitude !== undefined && q.radius !== undefined) {
    values.push(q.longitude, q.latitude, q.radius * 1000);
    conditions.push(
      `ST_DWithin(r.location,ST_SetSRID(ST_MakePoint($${values.length - 2},$${values.length - 1}),4326)::geography,$${values.length})`,
    );
  }
  values.push((q.page - 1) * 12);
  const { rows } = await db.query(
    `SELECT ${requestProjection},count(*) OVER()::int AS total FROM requests r
    WHERE ${conditions.join(' AND ')} ORDER BY r.deadline,r.id LIMIT 12 OFFSET $${values.length}`,
    values,
  );
  return { items: rows, total: rows[0]?.total || 0, page: q.page };
}
export async function create(userId: string, input: unknown) {
  const v = requestSchema.parse(input);
  const { rows } = await db.query(
    `INSERT INTO requests(owner_id,hospital,destination,city,location,blood_group,component,quantity,target,deadline,instructions,checked_instructions)
    VALUES($1,$2,$3,$4,ST_SetSRID(ST_MakePoint($5,$6),4326)::geography,$7,$8,$9,$10,$11,$12,$13) RETURNING id`,
    [
      userId,
      v.hospital,
      v.destination,
      v.city,
      v.longitude,
      v.latitude,
      v.blood_group,
      v.component,
      v.quantity || null,
      v.target,
      v.deadline,
      v.instructions,
      v.checked_instructions,
    ],
  );
  return getRequest(db, rows[0].id);
}
export async function edit(userId: string, id: string, input: unknown) {
  return transaction(async (tx) => {
    const request = await getRequest(tx, id, true);
    ensure(request.owner_id === userId, 403, 'Only the request owner can edit this request');
    if (request.status === 'draft') {
      const v = requestSchema.parse(input);
      await tx.query(
        `UPDATE requests SET hospital=$2,destination=$3,city=$4,location=ST_SetSRID(ST_MakePoint($5,$6),4326)::geography,
        blood_group=$7,component=$8,quantity=$9,target=$10,deadline=$11,instructions=$12,checked_instructions=$13 WHERE id=$1`,
        [
          id,
          v.hospital,
          v.destination,
          v.city,
          v.longitude,
          v.latitude,
          v.blood_group,
          v.component,
          v.quantity || null,
          v.target,
          v.deadline,
          v.instructions,
          v.checked_instructions,
        ],
      );
    } else {
      ensure(['open', 'covered'].includes(request.status), 409, 'This request is closed');
      const v = z
        .object({ instructions: z.string().trim().max(2000) })
        .strict()
        .parse(input);
      await tx.query('UPDATE requests SET instructions=$2 WHERE id=$1', [id, v.instructions]);
      await activity(tx, id, userId, 'Collection instructions updated');
      const { rows } = await tx.query(
        `SELECT donor_id FROM commitments WHERE request_id=$1 AND status='confirmed'`,
        [id],
      );
      for (const row of rows)
        await notify(
          tx,
          row.donor_id,
          id,
          'Collection instructions changed',
          'Please review the updated instructions before travelling.',
        );
    }
    return getRequest(tx, id);
  });
}
export async function publish(userId: string, id: string) {
  return transaction(async (tx) => {
    const request = await getRequest(tx, id, true);
    ensure(request.owner_id === userId, 403, 'Only the owner can publish');
    if (request.status === 'open' || request.status === 'covered') return request;
    ensure(request.status === 'draft', 409, 'This request cannot be published');
    ensure(request.checked_instructions, 400, 'Confirm the collection instructions first');
    ensure(new Date(request.deadline).getTime() > Date.now(), 400, 'Choose a future deadline');
    await tx.query(`UPDATE requests SET status='open',published_at=now() WHERE id=$1`, [id]);
    await activity(tx, id, userId, 'Request published');
    await scheduleOutreach(tx, id);
    return getRequest(tx, id);
  });
}
export async function closeInTransaction(
  tx: Database,
  id: string,
  actor: string | null,
  status: 'fulfilled' | 'cancelled' | 'expired',
) {
  const r = await getRequest(tx, id, true);
  if (['fulfilled', 'cancelled', 'expired'].includes(r.status)) return r;
  await tx.query('UPDATE requests SET status=$2 WHERE id=$1', [id, status]);
  const { rows } = await tx.query(
    `UPDATE commitments SET status='closed',ended_at=now() WHERE request_id=$1 AND status='confirmed' RETURNING donor_id`,
    [id],
  );
  await tx.query(`UPDATE offers SET status='closed' WHERE request_id=$1 AND status='pending'`, [
    id,
  ]);
  await tx.query(
    `UPDATE invitations SET status='withdrawn' WHERE request_id=$1 AND status='pending'`,
    [id],
  );
  await activity(tx, id, actor, `Request ${status}`);
  if (actor !== r.owner_id) {
    await notify(
      tx,
      r.owner_id,
      id,
      `Request ${status}`,
      'Review your dashboard for the latest request status. Outreach has stopped.',
    );
  }
  for (const row of rows)
    await notify(
      tx,
      row.donor_id,
      id,
      `Request ${status}`,
      'This arrangement has ended. You no longer have an active commitment for this request.',
    );
  return getRequest(tx, id);
}
export async function close(userId: string, id: string, status: 'fulfilled' | 'cancelled') {
  return transaction(async (tx) => {
    const r = await getRequest(tx, id, true);
    ensure(r.owner_id === userId, 403, 'Only the owner can close this request');
    ensure(r.status !== 'draft' || status === 'cancelled', 409, 'Publish before marking fulfilled');
    return closeInTransaction(tx, id, userId, status);
  });
}
export async function removeDraft(userId: string, id: string) {
  const { rowCount } = await db.query(
    `DELETE FROM requests WHERE id=$1 AND owner_id=$2 AND status='draft'`,
    [id, userId],
  );
  ensure(rowCount, 404, 'Draft not found');
  return { message: 'Draft discarded' };
}
export async function retry(userId: string, id: string) {
  return transaction(async (tx) => {
    const r = await getRequest(tx, id, true);
    ensure(r.owner_id === userId, 403, 'Only the owner can retry outreach');
    ensure(
      r.status === 'open' && new Date(r.deadline).getTime() > Date.now(),
      409,
      'This request is not open',
    );
    const { rowCount } = await tx.query(
      `UPDATE requests SET last_retry_at=now(),outreach_exhausted=false WHERE id=$1
      AND (last_retry_at IS NULL OR last_retry_at<now()-interval '15 minutes')`,
      [id],
    );
    ensure(rowCount, 429, 'Wait 15 minutes between outreach retries');
    await scheduleOutreach(tx, id);
    return { message: 'Outreach scheduled' };
  });
}
export async function details(userId: string, id: string) {
  const r = await getRequest(db, id);
  ensure(r.status !== 'draft' || r.owner_id === userId, 404, 'Request not found');
  const owner = r.owner_id === userId;
  const { rows: offers } = await db.query(
    `SELECT o.id,o.donor_id,o.arrival_start,o.arrival_end,o.note,o.status,o.created_at,u.name,
    c.id AS commitment_id,c.status AS commitment_status,
    CASE WHEN c.status='confirmed' AND r.status IN ('open','covered') AND r.deadline>now() AND
      (($2=r.owner_id AND c.donor_shared) OR ($2=o.donor_id AND c.owner_shared))
      THEN CASE WHEN $2=r.owner_id THEN c.donor_shared_phone ELSE c.owner_shared_phone END ELSE NULL END AS shared_phone,
    CASE WHEN $2=r.owner_id THEN c.owner_shared ELSE c.donor_shared END AS i_shared
    FROM offers o JOIN users u ON u.id=o.donor_id JOIN requests r ON r.id=o.request_id JOIN users host ON host.id=r.owner_id
    LEFT JOIN commitments c ON c.offer_id=o.id WHERE o.request_id=$1 AND (r.owner_id=$2 OR o.donor_id=$2) ORDER BY o.created_at`,
    [id, userId],
  );
  const { rows: events } = await db.query(
    `SELECT description,created_at FROM activity WHERE request_id=$1 ORDER BY created_at DESC LIMIT 30`,
    [id],
  );
  const { rows: counts } = owner
    ? await db.query(
        `SELECT count(*)::int AS invited,count(*) FILTER(WHERE status='responded')::int AS responded FROM invitations WHERE request_id=$1`,
        [id],
      )
    : { rows: [] };
  return { request: r, offers, events, outreach: counts[0] || null, isOwner: owner };
}
