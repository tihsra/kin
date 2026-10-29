import type { RequestHandler } from 'express';
import { z } from 'zod';
import { resendSignup, verifySignup } from '../services/signup.service.ts';
import * as auth from '../services/auth.service.ts';
import { registerSchema, loginSchema } from '../models/schemas.ts';
import { db } from '../lib/db.ts';
import { config } from '../config.ts';

const cookie = {
  httpOnly: true,
  secure: config.NODE_ENV === 'production',
  sameSite: 'lax' as const,
  path: '/',
  maxAge: 7 * 86400000,
};
export const session: RequestHandler = (req, res) => {
  res.json({ user: req.user || null, csrf: req.csrf || null });
};
export const register: RequestHandler = async (req, res) => {
  res.status(201).json(await auth.register(registerSchema.parse(req.body)));
};
export const login: RequestHandler = async (req, res) => {
  const v = loginSchema.parse(req.body);
  const result = await auth.login(v.email, v.password);
  if (result.verificationRequired) {
    res.json(result);
    return;
  }
  if (req.sessionHash)
    await db.query('DELETE FROM sessions WHERE token_hash=$1', [req.sessionHash]);
  res.cookie('kin_session', result.raw, cookie).json({ message: 'Signed in', csrf: result.csrf });
};
export const logout: RequestHandler = async (req, res) => {
  await db.query('DELETE FROM sessions WHERE token_hash=$1', [req.sessionHash]);
  res.clearCookie('kin_session', { ...cookie, maxAge: undefined }).json({ message: 'Signed out' });
};
export const verify: RequestHandler = async (req, res) => {
  const input = z
    .object({ challengeId: z.uuid(), code: z.string().regex(/^\d{6}$/) })
    .parse(req.body);
  const result = await verifySignup(input.challengeId, input.code);
  if (req.sessionHash)
    await db.query('DELETE FROM sessions WHERE token_hash=$1', [req.sessionHash]);
  res
    .cookie('kin_session', result.raw, cookie)
    .json({ message: 'Email verified', csrf: result.csrf });
};
export const resend: RequestHandler = async (req, res) => {
  res.json(await resendSignup(z.uuid().parse(req.body.challengeId)));
};
export const forgot: RequestHandler = async (req, res) => {
  res.json(await auth.forgot(z.email().toLowerCase().parse(req.body.email)));
};
export const reset: RequestHandler = async (req, res) => {
  const v = z
    .object({ token: z.string().regex(/^[a-f0-9]{64}$/), password: z.string().min(10).max(128) })
    .parse(req.body);
  res.json(await auth.reset(v.token, v.password));
};
