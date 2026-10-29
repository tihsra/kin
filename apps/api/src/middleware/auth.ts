import type { RequestHandler } from 'express';
import { db } from '../lib/db.ts';
import { cookieValue, digest } from '../lib/security.ts';
import { ensure } from '../lib/errors.ts';
import { config } from '../config.ts';

export const loadSession: RequestHandler = async (req, _res, next) => {
  const raw = cookieValue(req.headers.cookie, 'kin_session');
  if (raw && /^[a-f0-9]{64}$/.test(raw)) {
    const { rows } = await db.query(
      `SELECT u.id,u.name,u.email,u.phone,u.verified_at,u.role,s.csrf_token
      FROM sessions s JOIN users u ON u.id=s.user_id
      WHERE s.token_hash=$1 AND s.expires_at>now() AND u.suspended_at IS NULL AND u.verified_at IS NOT NULL`,
      [digest(raw)],
    );
    if (rows[0]) {
      const { csrf_token, ...user } = rows[0];
      req.user = user as typeof req.user;
      req.csrf = csrf_token;
      req.sessionHash = digest(raw);
    }
  }
  next();
};
export const originGuard: RequestHandler = (req, _res, next) => {
  if (!['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {
    ensure(
      req.headers.origin === new URL(config.APP_ORIGIN).origin,
      403,
      'Request origin is not allowed',
    );
    if (req.user)
      ensure(
        req.headers['x-csrf-token'] === req.csrf,
        403,
        'Session security token is missing. Refresh and try again.',
      );
  }
  next();
};
export const authenticated: RequestHandler = (req, _res, next) => {
  ensure(req.user?.verified_at, 401, 'Verify your email and sign in to continue');
  next();
};
export const verified: RequestHandler = (req, _res, next) => {
  ensure(req.user?.verified_at, 403, 'Verify your email before taking this action');
  next();
};
export const admin: RequestHandler = (req, _res, next) => {
  ensure(req.user?.role === 'admin', 403, 'Administrator access required');
  next();
};
