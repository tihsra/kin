import { db, transaction } from '../lib/db.ts';
import { token, digest, hashPassword, verifyPassword } from '../lib/security.ts';
import { ensure } from '../lib/errors.ts';
import { enqueue } from '../repositories/request.repository.ts';
import { config } from '../config.ts';

export { beginSignup as register } from './signup.service.ts';
import { beginSignup } from './signup.service.ts';

async function accountMail(
  tx: import('../models/types.ts').Database,
  userId: string,
  email: string,
  purpose: 'reset',
) {
  const raw = token();
  await tx.query(`DELETE FROM account_tokens WHERE user_id=$1 AND purpose=$2`, [userId, purpose]);
  await tx.query(
    `INSERT INTO account_tokens(token_hash,user_id,purpose,expires_at) VALUES($1,$2,$3,now()+interval '1 hour')`,
    [digest(raw), userId, purpose],
  );
  const url = `${config.APP_ORIGIN}/account/${purpose}?token=${raw}`;
  await enqueue(
    tx,
    'email',
    {
      recipient: email,
      subject: 'Reset your Kin password',
      text: `Open this link within one hour: ${url}`,
    },
    `account:${digest(raw)}`,
  );
}
export async function login(email: string, password: string) {
  const { rows } = await db.query('SELECT * FROM users WHERE email=$1', [email]);
  const user = rows[0];
  const valid = await verifyPassword(password, user?.password_hash || 'invalid:00');
  ensure(user && valid, 401, 'Email or password is incorrect');
  ensure(!user.suspended_at, 403, 'This account is suspended');
  if (!user.verified_at)
    return {
      verificationRequired: true as const,
      ...(await beginSignup({ name: user.name, email, password })),
    };
  const raw = token();
  const csrf = token();
  await db.query(
    `INSERT INTO sessions(token_hash,user_id,csrf_token,expires_at) VALUES($1,$2,$3,now()+interval '7 days')`,
    [digest(raw), user.id, csrf],
  );
  return { verificationRequired: false as const, raw, csrf };
}
export async function forgot(email: string) {
  await transaction(async (tx) => {
    const { rows } = await tx.query(
      'SELECT id FROM users WHERE email=$1 AND suspended_at IS NULL FOR UPDATE',
      [email],
    );
    if (rows[0]) await accountMail(tx, rows[0].id, email, 'reset');
  });
  return { message: 'If an account exists, a reset link will arrive shortly.' };
}
export async function reset(raw: string, password: string) {
  const hash = await hashPassword(password);
  return transaction(async (tx) => {
    const { rows } = await tx.query(
      `DELETE FROM account_tokens WHERE token_hash=$1 AND purpose='reset' AND expires_at>now() RETURNING user_id`,
      [digest(raw)],
    );
    ensure(rows[0], 400, 'This link is invalid or has expired');
    await tx.query('UPDATE users SET password_hash=$1 WHERE id=$2', [hash, rows[0].user_id]);
    await tx.query('DELETE FROM sessions WHERE user_id=$1', [rows[0].user_id]);
    return { message: 'Password updated. Sign in again.' };
  });
}
