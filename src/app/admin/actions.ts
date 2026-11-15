'use server';
import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { prisma } from '@/lib/db';
import { checkPassword, createSession, destroySession, requireAdmin } from '@/lib/auth';
import { saveImage } from '@/lib/uploads';
import { newSeed } from '@/lib/draw';
import { fromChileInput, slugify } from '@/lib/format';
import { cancelRaffle, runDraw } from '@/lib/raffle';
import { webpay } from '@/lib/webpay';

export type FormState = { error?: string; ok?: string };
const MAX_PHOTOS = 12;

export async function login(_: FormState, fd: FormData): Promise<FormState> {
  if (!checkPassword(String(fd.get('password') ?? ''))) return { error: 'Clave incorrecta.' };
  await createSession();
  redirect('/admin');
}

export async function logout() {
  await destroySession();
  redirect('/admin/login');
}

const int = (v: FormDataEntryValue | null) => { const n = parseInt(String(v ?? '').replace(/\D/g, ''), 10); return Number.isFinite(n) ? n : 0; };
const str = (v: FormDataEntryValue | null, max = 200) => String(v ?? '').trim().slice(0, max);

async function uniqueSlug(base: string, exceptId?: string) {
  let slug = slugify(base), i = 2;
  while (true) {
    const hit = await prisma.artwork.findUnique({ where: { slug } });
    if (!hit || hit.id === exceptId) return slug;
    slug = `${slugify(base)}-${i++}`;
  }
}

export async function saveArtwork(_: FormState, fd: FormData): Promise<FormState> {
  await requireAdmin();
  const id = str(fd.get('id')) || null;
  const existing = id ? await prisma.artwork.findUnique({ where: { id }, include: { images: { orderBy: { position: 'asc' } }, draw: true } }) : null;
  // "PASADO": sorteo que ya se hizo fuera del sitio y solo se publica como resultado
  const past = existing ? !!existing.draw?.external : str(fd.get('type')) === 'PASADO';
  const type = past ? 'RIFA' : existing?.type ?? (str(fd.get('type')) === 'VENTA' ? 'VENTA' : 'RIFA');
  const title = str(fd.get('title'), 80);
  if (!title) return { error: 'Ponle un título a la obra.' };
  if (existing && existing.status !== 'OPEN' && !past) return { error: 'Esta obra ya está cerrada y no se puede editar.' };

  const base = {
    title, artist: str(fd.get('artist'), 80), size: str(fd.get('size'), 40), technique: str(fd.get('technique'), 60), frame: str(fd.get('frame'), 60),
    value: int(fd.get('value')) || null, description: str(fd.get('description'), 1200) || null,
  };

  // Validación de precios y tickets antes de guardar fotos
  let typed: Record<string, unknown>;
  let pastDraw: { winnerName: string; winnerNumber: number; ticketsSold: number; createdAt: Date; proofUrl: string | null } | null = null;
  const price = int(fd.get('price'));
  if (past) {
    const total = int(fd.get('totalTickets')), drawAt = fromChileInput(str(fd.get('drawAt')));
    const winnerName = str(fd.get('winnerName'), 60), winnerNumber = int(fd.get('winnerNumber'));
    const ticketsSold = int(fd.get('ticketsSold')) || total, proof = str(fd.get('proofUrl'), 300);
    if (total < 1 || total > 5000) return { error: 'Indica cuántos tickets tuvo el sorteo.' };
    if (!drawAt || isNaN(+drawAt) || +drawAt > Date.now() + 60_000) return { error: 'Indica la fecha en que se hizo el sorteo (no puede ser futura).' };
    if (!winnerName) return { error: 'Escribe el nombre del ganador, por ejemplo “Valentina S.”.' };
    if (winnerNumber < 1 || winnerNumber > total) return { error: `El número ganador debe estar entre 1 y ${total}.` };
    if (ticketsSold > total) return { error: 'Los tickets vendidos no pueden ser más que el total.' };
    if (proof && !/^https?:\/\/\S+$/.test(proof)) return { error: 'El enlace de respaldo debe empezar con https://' };
    pastDraw = { winnerName, winnerNumber, ticketsSold, createdAt: drawAt, proofUrl: proof || null };
    typed = { totalTickets: total, price, endsAt: drawAt, policy: null, status: 'DRAWN' };
  } else if (type === 'RIFA') {
    const total = int(fd.get('totalTickets'));
    const endsAt = fromChileInput(str(fd.get('endsAt')));
    const policy = ['DRAW', 'EXTEND', 'CANCEL'].includes(str(fd.get('policy'))) ? str(fd.get('policy')) : 'DRAW';
    const sold = existing ? await prisma.ticket.count({ where: { artworkId: existing.id, order: { status: { in: ['PAID', 'PENDING'] } } } }) : 0;
    if (total < 2 || total > 500) return { error: 'La cantidad de tickets debe estar entre 2 y 500.' };
    if (total < sold) return { error: `Ya hay ${sold} tickets vendidos o reservados; la cantidad no puede ser menor.` };
    if (sold === 0 && price < 500) return { error: 'El precio por ticket debe ser de al menos $500.' };
    if (!endsAt || isNaN(+endsAt) || +endsAt < Date.now() + 3_600_000) return { error: 'Elige una fecha de cierre al menos 1 hora en el futuro.' };
    typed = { totalTickets: total, endsAt, policy, ...(sold === 0 ? { price } : {}) };
  } else {
    if (price < 1000) return { error: 'Indica un precio de venta válido.' };
    typed = { price };
  }

  // Fotos: el orden llega como ["url:/uploads/a.jpg", "new:0", ...]; la primera es la principal
  let photos: string[];
  try {
    const order: string[] = JSON.parse(str(fd.get('photoOrder'), 20000) || '[]');
    const files = fd.getAll('images').filter((f): f is File => typeof f !== 'string' && f.size > 0);
    if (files.length > MAX_PHOTOS) return { error: `Puedes subir hasta ${MAX_PHOTOS} fotos por obra.` };
    const saved: string[] = [];
    for (const f of files) { const url = await saveImage(f); if (url) saved.push(url); }
    const known = new Set([...(existing?.images.map((i) => i.url) ?? []), ...(existing?.imageUrl ? [existing.imageUrl] : [])]);
    photos = order.map((t) => (t.startsWith('new:') ? saved[Number(t.slice(4))] : known.has(t.slice(4)) ? t.slice(4) : undefined)).filter((u): u is string => !!u);
    for (const u of saved) if (!photos.includes(u)) photos.push(u);
    photos = [...new Set(photos)].slice(0, MAX_PHOTOS);
  } catch (e) { return { error: (e as Error).message || 'No se pudieron guardar las fotos.' }; }

  const data = { ...base, ...typed, imageUrl: photos[0] ?? null };
  const artworkId = existing
    ? (await prisma.artwork.update({ where: { id: existing.id }, data })).id
    : (await prisma.artwork.create({ data: { ...data, price, type, slug: await uniqueSlug(title), ...(type === 'RIFA' && !past ? newSeed() : {}) } })).id;
  if (pastDraw) {
    await prisma.draw.upsert({
      where: { artworkId },
      update: { ...pastDraw, external: true },
      create: { artworkId, ...pastDraw, external: true },
    });
  }
  await prisma.$transaction([
    prisma.artworkImage.deleteMany({ where: { artworkId } }),
    prisma.artworkImage.createMany({ data: photos.map((url, position) => ({ artworkId, url, position })) }),
  ]);
  revalidatePath('/', 'layout');
  redirect(`/admin?ok=${encodeURIComponent(existing ? `Se guardaron los cambios de “${title}”` : past ? `Se publicó el sorteo de “${title}” en Ganadores` : `“${title}” quedó publicada`)}`);
}

export async function extendRaffle(fd: FormData) {
  await requireAdmin();
  const a = await prisma.artwork.findUnique({ where: { id: str(fd.get('id')) } });
  if (!a || a.status !== 'OPEN' || a.type !== 'RIFA') return;
  const from = Math.max(a.endsAt?.getTime() ?? 0, Date.now());
  await prisma.artwork.update({ where: { id: a.id }, data: { endsAt: new Date(from + 7 * 86_400_000) } });
  revalidatePath('/', 'layout');
}

export async function deleteArtwork(fd: FormData) {
  await requireAdmin();
  const id = str(fd.get('id'));
  const orders = await prisma.order.count({ where: { artworkId: id, status: { in: ['PAID', 'PENDING', 'REFUND_PENDING'] } } });
  if (orders) return; // solo se pueden borrar obras sin compras
  await prisma.order.deleteMany({ where: { artworkId: id } });
  await prisma.artwork.delete({ where: { id } });
  revalidatePath('/', 'layout');
}

export async function drawNow(fd: FormData) {
  await requireAdmin();
  await runDraw(str(fd.get('id')), true);
  revalidatePath('/', 'layout');
}

export async function cancelNow(fd: FormData) {
  await requireAdmin();
  await cancelRaffle(str(fd.get('id')), 'El estudio canceló el sorteo.');
  revalidatePath('/', 'layout');
}

/** Devuelve el dinero de una orden por Webpay (anulación). */
export async function refundOrder(fd: FormData) {
  await requireAdmin();
  const o = await prisma.order.findUnique({ where: { id: str(fd.get('id')) } });
  if (!o || o.status !== 'REFUND_PENDING' || !o.token) return;
  try {
    const r = await webpay().refund(o.token, o.amount);
    await prisma.order.update({ where: { id: o.id }, data: { status: 'REFUNDED', note: `${o.note ?? ''} Reembolso Webpay: ${r.type ?? 'OK'}`.trim() } });
  } catch (e) {
    await prisma.order.update({ where: { id: o.id }, data: { note: `${o.note ?? ''} Error al reembolsar: ${(e as Error).message}`.trim() } });
  }
  revalidatePath('/admin/pagos');
}

export async function saveSite(_: FormState, fd: FormData): Promise<FormState> {
  await requireAdmin();
  const data: Record<string, string | null> = {
    name: str(fd.get('name'), 40) || 'Le Mur Art Studio', title: str(fd.get('title'), 40), highlight: str(fd.get('highlight'), 30), lead: str(fd.get('lead'), 240),
  };
  try {
    for (const [field, key] of [['logo', 'logoUrl'], ['hero', 'heroUrl'], ['show', 'showUrl']] as const) {
      const url = await saveImage(fd.get(field));
      if (url) data[key] = url;
      if (fd.get(`clear_${field}`) === 'on') data[key] = null;
    }
  } catch (e) { return { error: (e as Error).message }; }
  if (fd.get('restore_logo') === 'on') data.logoUrl = '/brand/logo-le-mur.png';
  await prisma.siteSettings.upsert({ where: { id: 1 }, update: data, create: { id: 1, ...data } });
  revalidatePath('/', 'layout');
  return { ok: 'Se guardaron los cambios del sitio.' };
}
