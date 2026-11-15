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
  const existing = id ? await prisma.artwork.findUnique({ where: { id } }) : null;
  const type = existing?.type ?? (str(fd.get('type')) === 'VENTA' ? 'VENTA' : 'RIFA');
  const title = str(fd.get('title'), 80), artist = str(fd.get('artist'), 80), size = str(fd.get('size'), 40);
  if (!title) return { error: 'Ponle un título a la obra.' };
  if (!artist) return { error: 'Indica el nombre del artista.' };
  if (!size) return { error: 'Indica las medidas, por ejemplo 60 × 80 cm.' };
  let imageUrl: string | null;
  try { imageUrl = await saveImage(fd.get('image')); } catch (e) { return { error: (e as Error).message }; }

  const base = {
    title, artist, size, technique: str(fd.get('technique'), 60), value: int(fd.get('value')) || null,
    description: str(fd.get('description'), 1200) || null, ...(imageUrl ? { imageUrl } : {}),
  };

  if (type === 'RIFA') {
    const total = int(fd.get('totalTickets')), price = int(fd.get('price'));
    const endsAt = fromChileInput(str(fd.get('endsAt')));
    const policy = ['DRAW', 'EXTEND', 'CANCEL'].includes(str(fd.get('policy'))) ? str(fd.get('policy')) : 'DRAW';
    const sold = existing ? await prisma.ticket.count({ where: { artworkId: existing.id, order: { status: { in: ['PAID', 'PENDING'] } } } }) : 0;
    if (total < 2 || total > 500) return { error: 'La cantidad de tickets debe estar entre 2 y 500.' };
    if (total < sold) return { error: `Ya hay ${sold} tickets vendidos o reservados; la cantidad no puede ser menor.` };
    if (!existing || sold === 0) { if (price < 500) return { error: 'El precio por ticket debe ser de al menos $500.' }; }
    if (!endsAt || isNaN(+endsAt) || +endsAt < Date.now() + 3_600_000) return { error: 'Elige una fecha de cierre al menos 1 hora en el futuro.' };
    const data = { ...base, totalTickets: total, endsAt, policy, ...(sold === 0 ? { price } : {}) };
    if (existing) {
      if (existing.status !== 'OPEN') return { error: 'Esta obra ya está cerrada y no se puede editar.' };
      await prisma.artwork.update({ where: { id: existing.id }, data });
    } else {
      await prisma.artwork.create({ data: { ...data, price, type, slug: await uniqueSlug(title), ...newSeed() } });
    }
  } else {
    const price = int(fd.get('price'));
    if (price < 1000) return { error: 'Indica un precio de venta válido.' };
    if (existing) {
      if (existing.status !== 'OPEN') return { error: 'Esta obra ya fue vendida y no se puede editar.' };
      await prisma.artwork.update({ where: { id: existing.id }, data: { ...base, price } });
    } else {
      await prisma.artwork.create({ data: { ...base, price, type, slug: await uniqueSlug(title) } });
    }
  }
  revalidatePath('/', 'layout');
  redirect(`/admin?ok=${encodeURIComponent(existing ? `Se guardaron los cambios de “${title}”` : `“${title}” quedó publicada`)}`);
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
