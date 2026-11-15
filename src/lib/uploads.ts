import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { randomBytes } from 'node:crypto';

const TYPES: Record<string, string> = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp', 'image/svg+xml': 'svg' };
const MAX = 8 * 1024 * 1024;

/** Guarda una imagen subida en public/uploads y devuelve su URL pública, o null si no venía archivo. */
export async function saveImage(file: FormDataEntryValue | null): Promise<string | null> {
  if (!file || typeof file === 'string' || file.size === 0) return null;
  const ext = TYPES[file.type];
  if (!ext) throw new Error('Formato no permitido. Usa JPG, PNG, WEBP o SVG.');
  if (file.size > MAX) throw new Error('La imagen pesa más de 8 MB.');
  const dir = path.join(process.cwd(), 'public', 'uploads');
  await mkdir(dir, { recursive: true });
  const name = `${Date.now().toString(36)}-${randomBytes(4).toString('hex')}.${ext}`;
  await writeFile(path.join(dir, name), Buffer.from(await file.arrayBuffer()));
  return `/uploads/${name}`;
}
