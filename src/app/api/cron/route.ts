import { NextResponse } from 'next/server';
import { housekeeping } from '@/lib/raffle';

/** Llamar cada minuto desde un programador (cron) con ?key=CRON_SECRET para cerrar sorteos vencidos aunque nadie visite el sitio. */
export async function GET(req: Request) {
  if (!process.env.CRON_SECRET || new URL(req.url).searchParams.get('key') !== process.env.CRON_SECRET)
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  await housekeeping(true);
  return NextResponse.json({ ok: true, at: new Date().toISOString() });
}
