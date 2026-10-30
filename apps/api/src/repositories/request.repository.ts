import type { Database, BloodRequest } from '../models/types.ts';
import { ensure } from '../lib/errors.ts';

export const requestProjection = `r.id, r.owner_id, r.hospital, r.destination, r.city, r.blood_group,
  r.component, r.quantity, r.target, r.deadline, r.instructions, r.checked_instructions, r.status,
  r.outreach_exhausted, r.created_at, r.published_at,
  ST_Y(r.location::geometry) AS latitude, ST_X(r.location::geometry) AS longitude,
  (SELECT count(*)::int FROM commitments c WHERE c.request_id=r.id AND c.status='confirmed') AS confirmed`;
export async function getRequest(tx: Database, id: string, lock = false): Promise<BloodRequest> {
  // Read capacity in a fresh statement after any competing transaction releases the lock.
  if (lock) await tx.query('SELECT id FROM requests WHERE id=$1 FOR UPDATE', [id]);
  const { rows } = await tx.query<BloodRequest>(
    `SELECT ${requestProjection} FROM requests r WHERE r.id=$1`,
    [id],
  );
  ensure(rows[0], 404, 'Request not found');
  return rows[0];
}
export async function activity(
  tx: Database,
  requestId: string,
  actor: string | null,
  description: string,
) {
  await tx.query('INSERT INTO activity(request_id,actor_id,description) VALUES($1,$2,$3)', [
    requestId,
    actor,
    description,
  ]);
}
export async function enqueue(
  tx: Database,
  kind: string,
  payload: object,
  key: string,
  runAt = new Date(),
) {
  await tx.query(
    `INSERT INTO jobs(kind,payload,dedupe_key,run_at) VALUES($1,$2,$3,$4) ON CONFLICT(dedupe_key) DO NOTHING`,
    [kind, JSON.stringify(payload), key, runAt],
  );
}
export async function scheduleOutreach(tx: Database, requestId: string) {
  await tx.query('UPDATE requests SET next_outreach_at=NULL WHERE id=$1', [requestId]);
  await enqueue(
    tx,
    'outreach',
    { requestId, stage: 0 },
    `outreach:${requestId}:${crypto.randomUUID()}`,
  );
}
export async function notify(
  tx: Database,
  userId: string,
  requestId: string | null,
  title: string,
  body: string,
  email = true,
  invitation = false,
) {
  const { rows } = await tx.query(
    `INSERT INTO notifications(user_id,request_id,title,body) VALUES($1,$2,$3,$4) RETURNING id`,
    [userId, requestId, title, body],
  );
  if (email)
    await enqueue(
      tx,
      'email',
      { userId, requestId, subject: title, text: body, notificationId: rows[0].id, invitation },
      `email:${rows[0].id}`,
    );
}
