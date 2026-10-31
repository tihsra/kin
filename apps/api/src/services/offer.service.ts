import { transaction, db } from '../lib/db.ts';
import { ensure } from '../lib/errors.ts';
import { offerSchema, assertArrival } from '../models/schemas.ts';
import {
  getRequest,
  activity,
  notify,
  scheduleOutreach,
} from '../repositories/request.repository.ts';
import type { Database } from '../models/types.ts';

export async function offer(userId: string, requestId: string, input: unknown) {
  const v = offerSchema.parse(input);
  return transaction(async (tx) => {
    const r = await getRequest(tx, requestId, true);
    ensure(r.owner_id !== userId, 400, 'You cannot offer on your own request');
    ensure(
      r.status === 'open' && new Date(r.deadline).getTime() > Date.now(),
      409,
      'This request is no longer open',
    );
    ensure(
      assertArrival(v.arrival_start, v.arrival_end, r.deadline),
      400,
      'Choose a future arrival window ending before the deadline',
    );
    const { rows: profile } = await tx.query(
      'SELECT blood_group FROM donor_profiles WHERE user_id=$1',
      [userId],
    );
    ensure(profile[0], 400, 'Set up your donor profile first');
    ensure(
      profile[0].blood_group === r.blood_group,
      400,
      'This request specifies a different blood group',
    );
    const { rows } = await tx.query(
      `INSERT INTO offers(request_id,donor_id,arrival_start,arrival_end,note) VALUES($1,$2,$3,$4,$5)
      ON CONFLICT(request_id,donor_id) DO NOTHING RETURNING id`,
      [requestId, userId, v.arrival_start, v.arrival_end, v.note],
    );
    if (rows[0]) {
      await tx.query(
        `UPDATE invitations SET status='responded' WHERE request_id=$1 AND donor_id=$2 AND status='pending'`,
        [requestId, userId],
      );
      await notify(
        tx,
        r.owner_id,
        requestId,
        'A donor offered to help',
        'Review the arrival window and confirm if it works for your collection arrangement.',
      );
    }
    return {
      message: rows[0]
        ? 'Offer sent. Wait for the requester to confirm before travelling.'
        : 'You already responded to this request.',
    };
  });
}
export async function confirm(userId: string, requestId: string, offerId: string) {
  return transaction(async (tx) => {
    const r = await getRequest(tx, requestId, true);
    ensure(r.owner_id === userId, 403, 'Only the requester can confirm an offer');
    const { rows } = await tx.query(
      'SELECT * FROM offers WHERE id=$1 AND request_id=$2 FOR UPDATE',
      [offerId, requestId],
    );
    const o = rows[0];
    ensure(o, 404, 'Offer not found');
    if (o.status === 'confirmed') return { message: 'This offer is already confirmed' };
    ensure(o.status === 'pending', 409, 'This offer is no longer pending');
    ensure(
      r.status === 'open' && new Date(r.deadline).getTime() > Date.now(),
      409,
      'This request is not open',
    );
    ensure(r.confirmed < r.target, 409, 'All donor slots are already covered');
    ensure(new Date(o.arrival_end).getTime() > Date.now(), 409, 'This arrival window has passed');
    await tx.query('SELECT pg_advisory_xact_lock(hashtextextended($1,0))', [o.donor_id]);
    const { rows: donor } = await tx.query('SELECT suspended_at FROM users WHERE id=$1 FOR SHARE', [
      o.donor_id,
    ]);
    ensure(donor[0] && !donor[0].suspended_at, 409, 'This donor is not available');
    const { rows: active } = await tx.query(
      `SELECT id FROM commitments WHERE donor_id=$1 AND status='confirmed'`,
      [o.donor_id],
    );
    ensure(!active[0], 409, 'This donor already has a confirmed arrangement');
    await tx.query('INSERT INTO commitments(request_id,offer_id,donor_id) VALUES($1,$2,$3)', [
      requestId,
      offerId,
      o.donor_id,
    ]);
    await tx.query(`UPDATE offers SET status='confirmed' WHERE id=$1`, [offerId]);
    if (r.confirmed + 1 >= r.target)
      await tx.query(`UPDATE requests SET status='covered' WHERE id=$1`, [requestId]);
    await activity(tx, requestId, userId, 'A donor arrangement was confirmed');
    await notify(
      tx,
      o.donor_id,
      requestId,
      'Your offer is confirmed',
      'Review the collection destination and arrival window. You can now choose to share your number privately.',
    );
    return { message: 'Arrangement confirmed' };
  });
}
export async function withdraw(userId: string, requestId: string, offerId: string, reject = false) {
  return transaction(async (tx) => {
    const r = await getRequest(tx, requestId, true);
    const { rows } = await tx.query(
      'SELECT * FROM offers WHERE id=$1 AND request_id=$2 FOR UPDATE',
      [offerId, requestId],
    );
    ensure(rows[0], 404, 'Offer not found');
    ensure(
      reject ? r.owner_id === userId : rows[0].donor_id === userId,
      403,
      'You cannot change this offer',
    );
    ensure(rows[0].status === 'pending', 409, 'This offer is no longer pending');
    await tx.query('UPDATE offers SET status=$2 WHERE id=$1', [
      offerId,
      reject ? 'rejected' : 'withdrawn',
    ]);
    return { message: reject ? 'Offer declined' : 'Offer withdrawn' };
  });
}
export async function cancelInTransaction(tx: Database, commitmentId: string, actor: string) {
  const { rows: found } = await tx.query('SELECT request_id FROM commitments WHERE id=$1', [
    commitmentId,
  ]);
  ensure(found[0], 404, 'Arrangement not found');
  const r = await getRequest(tx, found[0].request_id, true);
  const { rows } = await tx.query('SELECT * FROM commitments WHERE id=$1 FOR UPDATE', [
    commitmentId,
  ]);
  const c = rows[0];
  if (c.status !== 'confirmed') return { message: 'This arrangement has already ended' };
  await tx.query(
    `UPDATE commitments SET status='cancelled',cancelled_by=$2,ended_at=now() WHERE id=$1`,
    [commitmentId, actor],
  );
  if (['open', 'covered'].includes(r.status) && new Date(r.deadline).getTime() > Date.now()) {
    await tx.query(`UPDATE requests SET status='open',outreach_exhausted=false WHERE id=$1`, [
      r.id,
    ]);
    await scheduleOutreach(tx, r.id);
  }
  await activity(tx, r.id, actor, 'A donor arrangement was cancelled');
  await notify(
    tx,
    actor === r.owner_id ? c.donor_id : r.owner_id,
    r.id,
    'Arrangement cancelled',
    'The arrangement has ended. Check the request for its latest progress.',
  );
  return { message: 'Arrangement cancelled' };
}
export async function cancel(userId: string, commitmentId: string) {
  return transaction(async (tx) => {
    const { rows } = await tx.query(
      `SELECT c.donor_id,r.owner_id FROM commitments c JOIN requests r ON r.id=c.request_id WHERE c.id=$1`,
      [commitmentId],
    );
    ensure(
      rows[0] && [rows[0].owner_id, rows[0].donor_id].includes(userId),
      404,
      'Arrangement not found',
    );
    return cancelInTransaction(tx, commitmentId, userId);
  });
}
export async function share(userId: string, commitmentId: string) {
  return transaction(async (tx) => {
    const { rows: found } = await tx.query('SELECT request_id FROM commitments WHERE id=$1', [
      commitmentId,
    ]);
    ensure(found[0], 404, 'Arrangement not found');
    const r = await getRequest(tx, found[0].request_id, true);
    const { rows } = await tx.query('SELECT * FROM commitments WHERE id=$1 FOR UPDATE', [
      commitmentId,
    ]);
    const c = rows[0];
    ensure([r.owner_id, c.donor_id].includes(userId), 404, 'Arrangement not found');
    ensure(
      c.status === 'confirmed' &&
        ['open', 'covered'].includes(r.status) &&
        new Date(r.deadline).getTime() > Date.now(),
      409,
      'This arrangement is no longer active',
    );
    const { rows: users } = await tx.query('SELECT phone FROM users WHERE id=$1', [userId]);
    ensure(users[0].phone, 400, 'Add a phone number in settings first');
    const column = r.owner_id === userId ? 'owner_shared' : 'donor_shared';
    await tx.query(`UPDATE commitments SET ${column}=true,${column}_phone=$2 WHERE id=$1`, [
      commitmentId,
      users[0].phone,
    ]);
    return { message: 'Your number is now shared with this participant only' };
  });
}
export async function mine(userId: string) {
  const { rows } = await db.query(
    `SELECT o.id,o.status,o.arrival_start,o.arrival_end,o.request_id,r.hospital,r.city,r.blood_group,
    r.status AS request_status,c.id AS commitment_id,c.status AS commitment_status FROM offers o
    JOIN requests r ON r.id=o.request_id LEFT JOIN commitments c ON c.offer_id=o.id
    WHERE o.donor_id=$1 ORDER BY o.created_at DESC LIMIT 100`,
    [userId],
  );
  return rows;
}
