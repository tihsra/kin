import { db, transaction } from './lib/db.ts';
import { outreach } from './jobs/outreach.ts';
import { sendEmail } from './jobs/email.ts';
import { closeInTransaction } from './services/request.service.ts';

let stopping = false;
for (const signal of ['SIGTERM', 'SIGINT'])
  process.on(signal, () => {
    stopping = true;
  });

async function expire() {
  const { rows } = await db.query(
    `SELECT id FROM requests WHERE status IN ('open','covered') AND deadline<=now() ORDER BY id LIMIT 50`,
  );
  for (const r of rows) await transaction((tx) => closeInTransaction(tx, r.id, null, 'expired'));
  await db.query(
    `UPDATE invitations SET status='expired' WHERE status='pending' AND expires_at<=now()`,
  );
  await db.query(`DELETE FROM signup_challenges WHERE expires_at<now()-interval '1 hour'`);
  await db.query(`DELETE FROM sessions WHERE expires_at<=now()`);
  await db.query(`DELETE FROM account_tokens WHERE expires_at<=now()`);
  await db.query(`DELETE FROM rate_limits WHERE resets_at<now()-interval '1 day'`);
}
async function tick() {
  const lock = crypto.randomUUID();
  const { rows } = await db.query(
    `UPDATE jobs SET status='running',locked_at=now(),lock_token=$1,attempts=attempts+1
    WHERE id=(SELECT id FROM jobs WHERE (status='pending' AND run_at<=now()) OR
      (status='running' AND locked_at<now()-interval '2 minutes') ORDER BY run_at FOR UPDATE SKIP LOCKED LIMIT 1)
    RETURNING *`,
    [lock],
  );
  const job = rows[0];
  if (!job) return false;
  try {
    if (job.kind === 'outreach') await outreach(job.payload.requestId, job.payload.stage);
    else await sendEmail({ ...job.payload, deliveryKey: job.id });
    await db.query(`UPDATE jobs SET status='done',locked_at=NULL WHERE id=$1 AND lock_token=$2`, [
      job.id,
      lock,
    ]);
  } catch (error) {
    const message = error instanceof Error ? error.message.slice(0, 240) : 'Job failed';
    await db.query(
      `UPDATE jobs SET status=CASE WHEN attempts>=5 THEN 'failed' ELSE 'pending' END,
      run_at=now()+power(2,least(attempts,8))*interval '30 seconds',last_error=$3,locked_at=NULL
      WHERE id=$1 AND lock_token=$2`,
      [job.id, lock, message],
    );
    console.error(
      JSON.stringify({ event: 'job_failed', jobId: job.id, kind: job.kind, error: message }),
    );
  }
  return true;
}
let sweep = 0;
try {
  while (!stopping) {
    if (Date.now() - sweep > 30000) {
      await expire();
      sweep = Date.now();
    }
    if (!(await tick())) await new Promise((resolve) => setTimeout(resolve, 1000));
  }
} catch (error) {
  console.error('Worker stopped:', error instanceof Error ? error.message : 'Unknown error');
  process.exitCode = 1;
} finally {
  await db.end();
}
