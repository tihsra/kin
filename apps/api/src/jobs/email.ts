import { db } from '../lib/db.ts';
import { config } from '../config.ts';

export async function sendEmail(payload: Record<string, any>) {
  if (payload.signupChallengeId) {
    const { rows } = await db.query(
      'SELECT id FROM signup_challenges WHERE id=$1 AND code_hash=$2 AND expires_at>now() AND attempts<5',
      [payload.signupChallengeId, payload.signupCodeHash],
    );
    if (!rows[0]) return;
  }
  let recipient = payload.recipient;
  if (payload.userId) {
    const { rows } = await db.query('SELECT email,suspended_at FROM users WHERE id=$1', [
      payload.userId,
    ]);
    if (!rows[0] || rows[0].suspended_at) return;
    recipient = rows[0].email;
  }
  if (payload.requestId && payload.invitation) {
    const { rows } = await db.query(
      `SELECT r.status FROM requests r JOIN invitations i ON i.request_id=r.id
      WHERE r.id=$1 AND i.donor_id=$2 AND r.status='open' AND r.deadline>now() AND i.status='pending' AND i.expires_at>now()`,
      [payload.requestId, payload.userId],
    );
    if (!rows[0]) return;
  }
  const body =
    payload.text +
    (payload.requestId ? `\n\n${config.APP_ORIGIN}/requests/${payload.requestId}` : '');
  if (config.MAIL_MODE === 'brevo') {
    const match = /^(.*?)\s*<([^>]+)>$/.exec(config.MAIL_FROM);
    const sender = match ? { name: match[1].trim(), email: match[2] } : { email: config.MAIL_FROM };
    const response = await fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      signal: AbortSignal.timeout(10000),
      headers: { 'api-key': config.MAIL_API_KEY!, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sender,
        to: [{ email: recipient }],
        subject: payload.subject,
        textContent: body,
      }),
    });
    if (!response.ok) throw new Error(`Mail provider returned ${response.status}`);
    return;
  }
  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    signal: AbortSignal.timeout(10000),
    headers: {
      Authorization: `Bearer ${config.MAIL_API_KEY}`,
      'Content-Type': 'application/json',
      'Idempotency-Key': payload.deliveryKey,
    },
    body: JSON.stringify({
      from: config.MAIL_FROM,
      to: [recipient],
      subject: payload.subject,
      text: body,
    }),
  });
  if (!response.ok) throw new Error(`Mail provider returned ${response.status}`);
}
