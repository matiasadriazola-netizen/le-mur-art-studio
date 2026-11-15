import { prisma } from './db';

export async function getSettings() {
  return (await prisma.siteSettings.findUnique({ where: { id: 1 } })) ?? (await prisma.siteSettings.create({ data: { id: 1 } }));
}
