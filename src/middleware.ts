import { NextResponse, type NextRequest } from 'next/server';
import { jwtVerify } from 'jose';

/** URL pública base: APP_URL en producción (detrás de nginx), o el origen de la petición en desarrollo. */
function publicUrl(req: NextRequest, path: string) {
  return new URL(path, process.env.APP_URL || req.nextUrl.origin);
}

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  if (pathname === '/admin/login') return NextResponse.next();
  const token = req.cookies.get('lemur_admin')?.value;
  let ok = false;
  if (token && process.env.SESSION_SECRET) {
    try { await jwtVerify(token, new TextEncoder().encode(process.env.SESSION_SECRET)); ok = true; } catch { ok = false; }
  }
  if (ok) return NextResponse.next();
  return NextResponse.redirect(publicUrl(req, '/admin/login'));
}

export const config = { matcher: ['/admin/:path*'] };
