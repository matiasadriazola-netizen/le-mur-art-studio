export const CLP = (n: number | null | undefined) =>
  new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 }).format(n ?? 0);

export const fmtDate = (d: Date | string) =>
  new Date(d).toLocaleString('es-CL', { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit', timeZone: 'America/Santiago' });

export const fmtWhen = (d: Date | string) =>
  new Date(d).toLocaleString('es-CL', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit', timeZone: 'America/Santiago' });

export const fmtLong = (d: Date | string) =>
  new Date(d).toLocaleString('es-CL', { dateStyle: 'long', timeStyle: 'short', timeZone: 'America/Santiago' });

/** Nombre público: nombre + inicial del apellido. */
export const publicName = (first: string, last: string) => `${first.trim()} ${last.trim().charAt(0).toUpperCase()}.`;

export const pad = (n: number) => String(n).padStart(2, '0');

export const initials = (name: string) =>
  name.split(/\s+/).map((w) => w[0] ?? '').join('').slice(0, 2).toUpperCase();

export function slugify(s: string) {
  return s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 60) || 'obra';
}

const TZ = 'America/Santiago';
function tzParts(d: Date) {
  const p = new Intl.DateTimeFormat('en-US', { timeZone: TZ, hourCycle: 'h23', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' }).formatToParts(d);
  return Object.fromEntries(p.map((x) => [x.type, x.value])) as Record<string, string>;
}
/** "2026-11-20T18:00" (hora de Chile) → Date. */
export function fromChileInput(local: string) {
  const guess = new Date(`${local}:00Z`);
  if (isNaN(+guess)) return null;
  const g = tzParts(guess);
  const asTz = Date.UTC(+g.year, +g.month - 1, +g.day, +g.hour, +g.minute);
  return new Date(guess.getTime() - (asTz - guess.getTime()));
}
/** Date → "2026-11-20T18:00" en hora de Chile, para <input type="datetime-local">. */
export function toChileInput(d: Date) {
  const g = tzParts(d);
  return `${g.year}-${g.month}-${g.day}T${g.hour}:${g.minute}`;
}

/** Une datos opcionales con " · ", omitiendo los vacíos. */
export const meta = (...parts: (string | null | undefined | false)[]) => parts.filter(Boolean).join(' · ');
/** " de <artista>" o vacío si no hay artista. */
export const deArtist = (artist?: string | null) => (artist ? ` de ${artist}` : '');
