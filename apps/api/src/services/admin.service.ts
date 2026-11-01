import { db, transaction } from '../lib/db.ts';
import { ensure } from '../lib/errors.ts';
import { closeInTransaction } from './request.service.ts';
import { cancelInTransaction } from './offer.service.ts';

export async function report(userId: string, requestId: string, reason: string, targetId?: string) {
  const { rows } = await db.query('SELECT owner_id,status FROM requests WHERE id=$1', [requestId]);
  ensure(rows[0] && rows[0].status !== 'draft', 404, 'Request not found');
  const target = targetId || rows[0].owner_id;
  if (target !== rows[0].owner_id) {
    const { rows: participant } = await db.query(
      'SELECT id FROM offers WHERE request_id=$1 AND donor_id=$2',
      [requestId, target],
    );
    ensure(
      rows[0].owner_id === userId && participant[0],
      403,
      'Only the requester can report a donor participating in this request',
    );
  }
  await db.query(
    'INSERT INTO reports(reporter_id,target_id,request_id,reason) VALUES($1,$2,$3,$4)',
    [userId, target, requestId, reason],
  );
  return { message: 'Report submitted for review' };
}
export async function overview() {
  const { rows: reports } =
    await db.query(`SELECT p.id,p.reason,p.status,p.created_at,p.request_id,r.hospital,r.owner_id,u.name,target.name AS target_name
    FROM reports p JOIN requests r ON r.id=p.request_id JOIN users u ON u.id=p.reporter_id JOIN users target ON target.id=p.target_id ORDER BY p.created_at DESC LIMIT 100`);
  const { rows: jobs } = await db.query(
    `SELECT kind,status,count(*)::int AS count FROM jobs GROUP BY kind,status`,
  );
  return { reports, jobs };
}
export async function resolve(adminId: string, reportId: string, action: string) {
  return transaction(async (tx) => {
    const { rows } = await tx.query(
      `SELECT p.*,r.owner_id FROM reports p JOIN requests r ON r.id=p.request_id WHERE p.id=$1 FOR UPDATE OF p`,
      [reportId],
    );
    const r = rows[0];
    ensure(r, 404, 'Report not found');
    if (r.status === 'resolved') return { message: 'Report already resolved' };
    if (action === 'remove') await closeInTransaction(tx, r.request_id, adminId, 'cancelled');
    if (action === 'suspend') {
      ensure(r.target_id !== adminId, 400, 'You cannot suspend yourself');
      await tx.query('UPDATE users SET suspended_at=now() WHERE id=$1', [r.target_id]);
      await tx.query('DELETE FROM sessions WHERE user_id=$1', [r.target_id]);
      const { rows: owned } = await tx.query(
        `SELECT id FROM requests WHERE owner_id=$1 AND status IN ('draft','open','covered') ORDER BY id`,
        [r.target_id],
      );
      for (const request of owned) await closeInTransaction(tx, request.id, adminId, 'cancelled');
      const { rows: commitments } = await tx.query(
        `SELECT id FROM commitments WHERE donor_id=$1 AND status='confirmed' ORDER BY request_id`,
        [r.target_id],
      );
      for (const c of commitments) await cancelInTransaction(tx, c.id, adminId);
      await tx.query(
        `UPDATE offers SET status='withdrawn' WHERE donor_id=$1 AND status='pending'`,
        [r.target_id],
      );
    }
    await tx.query(`UPDATE reports SET status='resolved',resolved_by=$2 WHERE id=$1`, [
      reportId,
      adminId,
    ]);
    return { message: 'Report resolved' };
  });
}
