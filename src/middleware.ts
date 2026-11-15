import { NextResponse, type NextRequest } from 'next/server';
import { jwtVerify } from 'jose';

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  if (pathname === '/admin/login') return NextResponse.next();
  const token = req.cookies.get('lemur_admin')?.value;
  let ok = false;
  if (token && process.env.SESSION_SECRET) {
    try { await jwtVerify(token, new TextEncoder().encode(process.env.SESSION_SECRET)); ok = true; } catch { ok = false; }
  }
  if (ok) return NextResponse.next();
  return NextResponse.redirect(new URL('/admin/login', req.url));
}

export const config = { matcher: ['/admin/:path*'] };
