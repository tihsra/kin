import { randomBytes, scrypt as derive, timingSafeEqual, createHash } from 'node:crypto';
import { promisify } from 'node:util';

const scrypt = promisify(derive);
export const token = () => randomBytes(32).toString('hex');
export const digest = (value: string) => createHash('sha256').update(value).digest('hex');
export async function hashPassword(password: string) {
  const salt = randomBytes(16).toString('hex');
  const key = (await scrypt(password, salt, 64)) as Buffer;
  return `${salt}:${key.toString('hex')}`;
}
export async function verifyPassword(password: string, hash: string) {
  const [salt, stored] = hash.split(':');
  if (!salt || !stored) return false;
  const key = (await scrypt(password, salt, 64)) as Buffer;
  const expected = Buffer.from(stored, 'hex');
  return key.length === expected.length && timingSafeEqual(key, expected);
}
export function cookieValue(header: string | undefined, name: string) {
  return header
    ?.split(';')
    .map((part) => part.trim())
    .find((part) => part.startsWith(`${name}=`))
    ?.slice(name.length + 1);
}
