import { SignJWT, jwtVerify } from 'jose';
import { cookies } from 'next/headers';
import { createHash, timingSafeEqual } from 'node:crypto';

export const SESSION_COOKIE = 'lemur_admin';
const key = () => new TextEncoder().encode(process.env.SESSION_SECRET || '');

export function checkPassword(input: string) {
  const expected = process.env.ADMIN_PASSWORD;
  if (!expected) return false;
  const a = createHash('sha256').update(input).digest();
  const b = createHash('sha256').update(expected).digest();
  return timingSafeEqual(a, b);
}

export async function createSession() {
  const token = await new SignJWT({ role: 'admin' }).setProtectedHeader({ alg: 'HS256' }).setIssuedAt().setExpirationTime('7d').sign(key());
  (await cookies()).set(SESSION_COOKIE, token, {
    httpOnly: true, sameSite: 'lax', secure: process.env.NODE_ENV === 'production', path: '/', maxAge: 60 * 60 * 24 * 7,
  });
}

export async function destroySession() {
  (await cookies()).delete(SESSION_COOKIE);
}

export async function verifyToken(token?: string) {
  if (!token || !process.env.SESSION_SECRET) return false;
  try { await jwtVerify(token, key()); return true; } catch { return false; }
}

export async function isAdmin() {
  return verifyToken((await cookies()).get(SESSION_COOKIE)?.value);
}

export async function requireAdmin() {
  if (!(await isAdmin())) throw new Error('No autorizado');
}
