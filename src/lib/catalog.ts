import { prisma } from './db';
import { housekeeping, soldCounts } from './raffle';

export type CardItem = {
  id: string; slug: string; type: 'RIFA' | 'VENTA'; title: string; artist: string; technique: string; size: string;
  price: number; value: number | null; imageUrl: string | null; status: string; createdAt: string;
  totalTickets: number | null; sold: number; endsAt: string | null;
  winnerName: string | null; winnerNumber: number | null; drawCode: string | null; drawAt: string | null; drawSold: number | null;
};

export async function catalog(): Promise<CardItem[]> {
  await housekeeping();
  const [arts, counts] = await Promise.all([
    prisma.artwork.findMany({ include: { draw: true }, orderBy: { createdAt: 'desc' } }),
    soldCounts(),
  ]);
  return arts.map((a) => ({
    id: a.id, slug: a.slug, type: a.type as 'RIFA' | 'VENTA', title: a.title, artist: a.artist, technique: a.technique, size: a.size,
    price: a.price, value: a.value, imageUrl: a.imageUrl, status: a.status, createdAt: a.createdAt.toISOString(),
    totalTickets: a.totalTickets, sold: counts[a.id] ?? 0, endsAt: a.endsAt?.toISOString() ?? null,
    winnerName: a.draw?.winnerName ?? null, winnerNumber: a.draw?.winnerNumber ?? null, drawCode: a.draw?.code ?? null,
    drawAt: a.draw?.createdAt.toISOString() ?? null, drawSold: a.draw?.ticketsSold ?? null,
  }));
}

export const isOpenRifa = (a: CardItem) => a.type === 'RIFA' && a.status === 'OPEN';
export const leftOf = (a: CardItem) => (a.totalTickets ?? 0) - a.sold;
