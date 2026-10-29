import { createHmac, randomInt, timingSafeEqual } from 'node:crypto';

export const otpLifetimeMinutes = 10;
export const otpCooldownSeconds = 60;
export const otpAttemptLimit = 5;
export const otpHourlySendLimit = 5;
export const createOtp = () => randomInt(0, 1_000_000).toString().padStart(6, '0');
export function hashOtp(challengeId: string, code: string, secret: string) {
  return createHmac('sha256', secret).update(`${challengeId}:${code}`).digest('hex');
}
export function matchesOtp(challengeId: string, code: string, stored: string, secret: string) {
  const expected = Buffer.from(stored, 'hex');
  const actual = Buffer.from(hashOtp(challengeId, code, secret), 'hex');
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}
