import { transaction } from '../lib/db.ts';
import { hashPassword, token, digest } from '../lib/security.ts';
import { AppError, ensure } from '../lib/errors.ts';
import {
  createOtp,
  hashOtp,
  matchesOtp,
  otpLifetimeMinutes,
  otpCooldownSeconds,
  otpAttemptLimit,
  otpHourlySendLimit,
} from '../lib/otp.ts';
import { otpSecret } from '../config.ts';
import { enqueue } from '../repositories/request.repository.ts';
import type { Database } from '../models/types.ts';

async function lockEmail(tx: Database, email: string) {
  await tx.query('SELECT pg_advisory_xact_lock(hashtextextended($1,2))', [email]);
}
function checkDelivery(challenge: Record<string, any> | undefined) {
  if (!challenge) return;
  ensure(
    new Date(challenge.resend_after).getTime() <= Date.now(),
    429,
    'Please wait 60 seconds before requesting another code.',
  );
  const sameWindow = new Date(challenge.delivery_window_start).getTime() > Date.now() - 3600000;
  ensure(
    !sameWindow || challenge.send_count < otpHourlySendLimit,
    429,
    'Too many codes requested for this email. Please try again in an hour.',
  );
}
async function queueCode(tx: Database, challenge: Record<string, any>, code: string) {
  await enqueue(
    tx,
    'email',
    {
      recipient: challenge.email,
      subject: 'Your Kin verification code',
      text: `Your Kin verification code is ${code}. It expires in ${otpLifetimeMinutes} minutes. If you did not request this code, you can ignore this email.`,
      signupChallengeId: challenge.id,
      signupCodeHash: challenge.code_hash,
    },
    `signup:${challenge.id}:${challenge.code_hash}`,
  );
}
function response(challenge: Record<string, any>) {
  return {
    challengeId: challenge.id,
    expiresAt: challenge.expires_at,
    resendAt: challenge.resend_after,
    message:
      'If this address can be registered, a six-digit verification code will arrive shortly.',
  };
}
export async function beginSignup(input: { name: string; email: string; password: string }) {
  const passwordHash = await hashPassword(input.password);
  return transaction(async (tx) => {
    await lockEmail(tx, input.email);
    const { rows: existing } = await tx.query('SELECT verified_at FROM users WHERE email=$1', [
      input.email,
    ]);
    if (existing[0]?.verified_at)
      return response({
        id: crypto.randomUUID(),
        expires_at: new Date(Date.now() + otpLifetimeMinutes * 60000),
        resend_after: new Date(Date.now() + otpCooldownSeconds * 1000),
      });
    const { rows: previous } = await tx.query(
      'SELECT * FROM signup_challenges WHERE email=$1 FOR UPDATE',
      [input.email],
    );
    checkDelivery(previous[0]);
    const id = crypto.randomUUID();
    const code = createOtp();
    const { rows } = await tx.query(
      `INSERT INTO signup_challenges(id,email,name,password_hash,code_hash,expires_at,resend_after)
      VALUES($1,$2,$3,$4,$5,now()+$6*interval '1 minute',now()+$7*interval '1 second')
      ON CONFLICT(email) DO UPDATE SET id=excluded.id,name=excluded.name,password_hash=excluded.password_hash,
        code_hash=excluded.code_hash,attempts=0,expires_at=excluded.expires_at,resend_after=excluded.resend_after,
        send_count=CASE WHEN signup_challenges.delivery_window_start<=now()-interval '1 hour' THEN 1 ELSE signup_challenges.send_count+1 END,
        delivery_window_start=CASE WHEN signup_challenges.delivery_window_start<=now()-interval '1 hour' THEN now() ELSE signup_challenges.delivery_window_start END
      RETURNING *`,
      [
        id,
        input.email,
        input.name,
        passwordHash,
        hashOtp(id, code, otpSecret),
        otpLifetimeMinutes,
        otpCooldownSeconds,
      ],
    );
    await queueCode(tx, rows[0], code);
    return response(rows[0]);
  });
}
export async function resendSignup(challengeId: string) {
  return transaction(async (tx) => {
    const { rows: found } = await tx.query('SELECT email FROM signup_challenges WHERE id=$1', [
      challengeId,
    ]);
    ensure(found[0], 400, 'This signup has expired. Please start again.');
    await lockEmail(tx, found[0].email);
    const { rows } = await tx.query('SELECT * FROM signup_challenges WHERE id=$1 FOR UPDATE', [
      challengeId,
    ]);
    ensure(rows[0], 400, 'This signup has expired. Please start again.');
    checkDelivery(rows[0]);
    const code = createOtp();
    const { rows: updated } = await tx.query(
      `UPDATE signup_challenges SET code_hash=$2,attempts=0,
      expires_at=now()+$3*interval '1 minute',resend_after=now()+$4*interval '1 second',
      send_count=CASE WHEN delivery_window_start<=now()-interval '1 hour' THEN 1 ELSE send_count+1 END,
      delivery_window_start=CASE WHEN delivery_window_start<=now()-interval '1 hour' THEN now() ELSE delivery_window_start END
      WHERE id=$1 RETURNING *`,
      [challengeId, hashOtp(challengeId, code, otpSecret), otpLifetimeMinutes, otpCooldownSeconds],
    );
    await queueCode(tx, updated[0], code);
    return response(updated[0]);
  });
}
export async function verifySignup(challengeId: string, code: string) {
  const result = await transaction(async (tx) => {
    const { rows: found } = await tx.query('SELECT email FROM signup_challenges WHERE id=$1', [
      challengeId,
    ]);
    if (!found[0])
      return { error: 'This code is invalid or already used. Please start signup again.' };
    await lockEmail(tx, found[0].email);
    const { rows } = await tx.query('SELECT * FROM signup_challenges WHERE id=$1 FOR UPDATE', [
      challengeId,
    ]);
    const challenge = rows[0];
    if (!challenge || new Date(challenge.expires_at).getTime() <= Date.now())
      return { error: 'This code has expired. Request a new code.' };
    if (challenge.attempts >= otpAttemptLimit)
      return { error: 'Too many incorrect codes. Request a new code.' };
    if (!matchesOtp(challengeId, code, challenge.code_hash, otpSecret)) {
      await tx.query('UPDATE signup_challenges SET attempts=attempts+1 WHERE id=$1', [challengeId]);
      const remaining = otpAttemptLimit - challenge.attempts - 1;
      return {
        error: remaining
          ? `Incorrect code. ${remaining} attempts remaining.`
          : 'Too many incorrect codes. Request a new code.',
      };
    }
    const { rows: existing } = await tx.query(
      'SELECT id,verified_at,suspended_at FROM users WHERE email=$1 FOR UPDATE',
      [challenge.email],
    );
    if (existing[0]?.verified_at || existing[0]?.suspended_at) {
      await tx.query('DELETE FROM signup_challenges WHERE id=$1', [challengeId]);
      return { error: 'This account cannot be registered. Please sign in or reset your password.' };
    }
    let userId: string;
    if (existing[0]) {
      userId = existing[0].id;
      await tx.query('UPDATE users SET name=$2,password_hash=$3,verified_at=now() WHERE id=$1', [
        userId,
        challenge.name,
        challenge.password_hash,
      ]);
      await tx.query('DELETE FROM sessions WHERE user_id=$1', [userId]);
      await tx.query('DELETE FROM account_tokens WHERE user_id=$1', [userId]);
    } else {
      const { rows: created } = await tx.query(
        'INSERT INTO users(name,email,password_hash,verified_at) VALUES($1,$2,$3,now()) RETURNING id',
        [challenge.name, challenge.email, challenge.password_hash],
      );
      userId = created[0].id;
    }
    await tx.query('DELETE FROM signup_challenges WHERE id=$1', [challengeId]);
    const raw = token();
    const csrf = token();
    await tx.query(
      `INSERT INTO sessions(token_hash,user_id,csrf_token,expires_at) VALUES($1,$2,$3,now()+interval '7 days')`,
      [digest(raw), userId, csrf],
    );
    return { raw, csrf };
  });
  // Return validation failures after commit so incorrect-attempt counters are retained.
  if ('error' in result) throw new AppError(400, result.error!);
  return result;
}
