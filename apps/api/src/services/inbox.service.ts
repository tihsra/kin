import { db } from '../lib/db.ts';

export async function notifications(userId: string) {
  const { rows } = await db.query(
    'SELECT id,request_id,title,body,read_at,created_at FROM notifications WHERE user_id=$1 ORDER BY created_at DESC LIMIT 100',
    [userId],
  );
  return rows;
}
export async function markRead(userId: string, id: string) {
  await db.query(
    'UPDATE notifications SET read_at=coalesce(read_at,now()) WHERE id=$1 AND user_id=$2',
    [id, userId],
  );
  return { message: 'Marked as read' };
}
export async function invitations(userId: string) {
  const { rows } = await db.query(
    `SELECT i.id,i.request_id,i.status,i.expires_at,r.hospital,r.blood_group,r.city,r.status AS request_status
    FROM invitations i JOIN requests r ON r.id=i.request_id WHERE i.donor_id=$1 ORDER BY i.created_at DESC LIMIT 100`,
    [userId],
  );
  return rows;
}
export async function decline(userId: string, id: string) {
  await db.query(
    `UPDATE invitations SET status='declined' WHERE id=$1 AND donor_id=$2 AND status='pending'`,
    [id, userId],
  );
  return { message: 'Invitation declined' };
}
