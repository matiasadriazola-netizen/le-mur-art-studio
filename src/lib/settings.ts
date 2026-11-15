import { prisma } from './db';

/** Configuración del sitio (fila única). Se crea con valores por defecto la primera vez. */
export async function getSettings() {
  const s = await prisma.siteSettings.findUnique({ where: { id: 1 } });
  if (s) return s;
  try {
    return await prisma.siteSettings.upsert({ where: { id: 1 }, update: {}, create: { id: 1 } });
  } catch {
    // Otra petición la creó al mismo tiempo
    return prisma.siteSettings.findUniqueOrThrow({ where: { id: 1 } });
  }
}
