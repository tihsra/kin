import type { RequestHandler } from 'express';
import { db } from '../lib/db.ts';
import { ensure } from '../lib/errors.ts';
import { digest } from '../lib/security.ts';

export function limit(scope: string, maximum: number, seconds: number): RequestHandler {
  return async (req, res, next) => {
    const identity = req.user?.id || req.ip || 'unknown';
    const key = digest(`${scope}:${identity}`);
    const { rows } = await db.query(
      `INSERT INTO rate_limits(key,hits,resets_at) VALUES($1,1,now()+$2*interval '1 second')
      ON CONFLICT(key) DO UPDATE SET hits=CASE WHEN rate_limits.resets_at<=now() THEN 1 ELSE rate_limits.hits+1 END,
      resets_at=CASE WHEN rate_limits.resets_at<=now() THEN now()+$2*interval '1 second' ELSE rate_limits.resets_at END
      RETURNING hits,resets_at`,
      [key, seconds],
    );
    res.setHeader('RateLimit-Limit', maximum);
    if (rows[0].hits > maximum)
      res.setHeader(
        'Retry-After',
        Math.max(1, Math.ceil((new Date(rows[0].resets_at).getTime() - Date.now()) / 1000)),
      );
    ensure(rows[0].hits <= maximum, 429, 'Too many attempts. Please try again later.');
    next();
  };
}
