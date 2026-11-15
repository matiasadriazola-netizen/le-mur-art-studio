/**
 * Datos de ejemplo para desarrollo: obras, compras pagadas y sorteos ya realizados.
 * Genera ilustraciones SVG en public/seed para que el sitio se vea completo sin fotos reales.
 * Uso: npm run db:seed   (borra los datos existentes)
 */
import { PrismaClient } from '@prisma/client';
import { mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { computeWinner, newSeed, shortCode } from '../src/lib/draw';

const prisma = new PrismaClient();
const OUT = path.join(process.cwd(), 'public', 'seed');

function rng(seed: number) { let s = seed >>> 0; return () => { s = (Math.imul(s, 1664525) + 1013904223) >>> 0; return s / 4294967296; }; }
const PAL = [
  ['#0E3B5C', '#1F6E8C', '#7FB7BE', '#EAD7A4', '#F2F0E6', '#D9583B'],
  ['#2D2A32', '#5B6C8F', '#A3B4C8', '#E8E2D0', '#C86B4A', '#F0C75E'],
  ['#F4E9C9', '#E8C547', '#9BB35B', '#4E7A45', '#2F4B3A', '#F6F3EA'],
  ['#B8572F', '#D99A5B', '#EBD3A8', '#5E3B2C', '#2B2421', '#8DA39B'],
];

/** Ilustración abstracta en SVG (solo para datos de ejemplo). */
function art(style: number, seed: number, w = 800, h = 1000) {
  const r = rng(seed), p = PAL[style % 4], pick = () => p[Math.floor(r() * p.length)], m = Math.min(w, h);
  const out: string[] = [`<rect width="${w}" height="${h}" fill="${p[4]}"/>`];
  if (style % 4 === 0) {
    for (let b = 0; b < 9; b++) {
      const y0 = h * (0.25 + b * 0.09), k = 30 + r() * 40, amp = 10 * (1 + r()) * (w / 300);
      let d = `M0 ${h}`; for (let x = 0; x <= w; x += 10) d += ` L${x} ${(y0 + Math.sin(x / (k * w / 300) + b) * amp).toFixed(1)}`;
      out.push(`<path d="${d} L${w} ${h}Z" fill="${p[b % 4]}" opacity=".85"/>`);
    }
    out.push(`<circle cx="${w * 0.72}" cy="${h * 0.18}" r="${m * 0.09}" fill="${p[5]}"/>`);
  } else if (style % 4 === 1) {
    for (let k = 0; k < 3; k++) {
      const top = (h * k) / 3; out.push(`<rect y="${top}" width="${w}" height="${h / 3}" fill="${p[3 - k]}"/>`);
      let d = `M0 ${top + h / 3}`, x = 0; while (x < w) { x += w * (0.04 + r() * 0.1); d += ` L${x.toFixed(1)} ${(top + h * (0.05 + r() * 0.22)).toFixed(1)}`; }
      out.push(`<path d="${d} L${w} ${top + h / 3}Z" fill="${p[k === 1 ? 4 : k]}"/>`);
      out.push(`<circle cx="${w * (0.2 + r() * 0.6)}" cy="${top + h * 0.07}" r="${m * 0.04}" fill="${p[5]}" opacity=".9"/>`);
    }
  } else if (style % 4 === 2) {
    out.push(`<rect y="${h * 0.62}" width="${w}" height="${h * 0.38}" fill="${p[0]}"/>`);
    for (let i = 0; i < 14; i++) out.push(`<ellipse cx="${w * (0.1 + r() * 0.8)}" cy="${h * (0.2 + r() * 0.55)}" rx="${m * (0.05 + r() * 0.1)}" ry="${m * (0.05 + r() * 0.08)}" transform="rotate(${r() * 180})" fill="${pick()}" opacity="${0.75 + r() * 0.25}"/>`.replace(/rotate\(([\d.]+)\)/, (_, a) => `rotate(${a} ${w / 2} ${h / 2})`));
  } else {
    out.push(`<rect width="${w}" height="${h}" fill="${p[2]}"/>`);
    for (let i = 0; i < 7; i++) {
      const x = r() * w * 0.8, y = h * (0.2 + r() * 0.6), s = m * (0.2 + r() * 0.4), c = pick();
      out.push(r() > 0.5 ? `<rect x="${x}" y="${y}" width="${s}" height="${s * 0.5}" fill="${c}" opacity=".9"/>` : `<path d="M${x} ${y + s * 0.6} L${x + s / 2} ${y} L${x + s} ${y + s * 0.6}Z" fill="${c}" opacity=".9"/>`);
    }
    out.push(`<circle cx="${w * 0.3}" cy="${h * 0.2}" r="${m * 0.12}" fill="${p[0]}"/>`);
  }
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" preserveAspectRatio="xMidYMid slice">${out.join('')}</svg>`;
}

const NAMES = [['Javiera', 'Muñoz'], ['Tomás', 'Rojas'], ['Fernanda', 'López'], ['Benjamín', 'Soto'], ['Catalina', 'González'], ['Matías', 'Orellana'], ['Isidora', 'Pérez'], ['Vicente', 'Araya'], ['Martina', 'Castro'], ['Joaquín', 'Herrera'], ['Florencia', 'Bravo'], ['Agustín', 'Vargas'], ['Sofía', 'Tapia'], ['Lucas', 'Navarro'], ['Antonia', 'Díaz'], ['Emilia', 'Zúñiga'], ['Cristóbal', 'Fuentes'], ['Josefa', 'Ibáñez'], ['Sebastián', 'Urrutia'], ['Valentina', 'Salas']];

const H = 3_600_000, D = 24 * H, now = Date.now();
const SEED = [
  { slug: 'marea-en-valparaiso', type: 'RIFA', title: 'Marea en Valparaíso', artist: 'Camila Rojas', technique: 'Acrílico sobre tela', size: '60 × 80 cm', value: 380000, price: 5000, total: 20, sold: 19, style: 0, seed: 11, created: now - 14 * D, ends: now + 5.2 * H },
  { slug: 'cordillera-en-tres-tiempos', type: 'RIFA', title: 'Cordillera en tres tiempos', artist: 'Diego Fuentes', technique: 'Óleo sobre tela', size: '50 × 70 cm', value: 290000, price: 3000, total: 30, sold: 12, style: 1, seed: 42, created: now - 10 * D, ends: now + 4 * D },
  { slug: 'patio-de-los-limones', type: 'RIFA', title: 'Patio de los limones', artist: 'Antonia Vera', technique: 'Acuarela sobre papel', size: '40 × 50 cm', value: 150000, price: 2000, total: 20, sold: 7, style: 2, seed: 7, created: now - 6 * D, ends: now + 9 * D },
  { slug: 'humedal', type: 'RIFA', title: 'Humedal', artist: 'Camila Rojas', technique: 'Acrílico sobre tela', size: '80 × 80 cm', value: 410000, price: 5000, total: 40, sold: 31, style: 0, seed: 301, created: now - 18 * D, ends: now + 30 * H },
  { slug: 'norte-quieto', type: 'RIFA', title: 'Norte quieto', artist: 'Ignacio Pérez', technique: 'Técnica mixta', size: '70 × 100 cm', value: 520000, price: 8000, total: 25, sold: 25, style: 3, seed: 93, created: now - 36 * D, ends: now - 13 * D, drawn: true },
  { slug: 'quinta-normal-domingo', type: 'RIFA', title: 'Quinta Normal, domingo', artist: 'Rocío Albornoz', technique: 'Óleo sobre madera', size: '45 × 60 cm', value: 240000, price: 4000, total: 20, sold: 20, style: 2, seed: 58, created: now - 45 * D, ends: now - 28 * D, drawn: true },
  { slug: 'bruma-sobre-el-maipo', type: 'VENTA', title: 'Bruma sobre el Maipo', artist: 'Sofía Herrera', technique: 'Óleo sobre tela', size: '70 × 90 cm', price: 450000, style: 1, seed: 120, created: now - 12 * D },
  { slug: 'feria-del-sabado', type: 'VENTA', title: 'Feria del sábado', artist: 'Martín Lagos', technique: 'Acrílico sobre tela', size: '50 × 60 cm', price: 220000, style: 2, seed: 77, created: now - 8 * D },
  { slug: 'salar', type: 'VENTA', title: 'Salar', artist: 'Ignacio Pérez', technique: 'Técnica mixta', size: '100 × 70 cm', price: 610000, style: 3, seed: 15, created: now - 5 * D },
  { slug: 'costa-de-cobquecura', type: 'VENTA', title: 'Costa de Cobquecura', artist: 'Camila Rojas', technique: 'Acrílico sobre tela', size: '60 × 60 cm', price: 310000, style: 0, seed: 205, created: now - 26 * D, buyer: true },
  { slug: 'cerro-alegre', type: 'VENTA', title: 'Cerro Alegre', artist: 'Diego Fuentes', technique: 'Óleo sobre tela', size: '40 × 50 cm', price: 180000, style: 1, seed: 66, created: now - 3 * D },
] as const;

let bo = 0;
const buyOrder = () => `SEED${(++bo).toString().padStart(6, '0')}`;

async function main() {
  mkdirSync(OUT, { recursive: true });
  writeFileSync(path.join(OUT, 'hero.svg'), art(1, 4242, 1800, 1000));
  writeFileSync(path.join(OUT, 'show.svg'), art(0, 808, 1000, 800));
  writeFileSync(path.join(OUT, 'placeholder.svg'), `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 1000"><rect width="800" height="1000" fill="#EBE8E1"/><rect x="250" y="350" width="300" height="300" rx="24" fill="none" stroke="#B9B3A7" stroke-width="8"/></svg>`);

  await prisma.draw.deleteMany(); await prisma.ticket.deleteMany(); await prisma.order.deleteMany(); await prisma.artwork.deleteMany();
  await prisma.siteSettings.upsert({ where: { id: 1 }, update: {}, create: { id: 1 } });

  for (const s of SEED) {
    writeFileSync(path.join(OUT, `${s.slug}.svg`), art(s.style, s.seed));
    const base = { slug: s.slug, type: s.type, title: s.title, artist: s.artist, technique: s.technique, size: s.size, price: s.price, imageUrl: `/seed/${s.slug}.svg`, createdAt: new Date(s.created) };
    if (s.type === 'VENTA') {
      const a = await prisma.artwork.create({ data: { ...base, status: 'buyer' in s ? 'SOLD' : 'OPEN' } });
      if ('buyer' in s) await prisma.order.create({ data: { artworkId: a.id, firstName: 'Gonzalo', lastName: 'Pizarro', email: 'gonzalo@ejemplo.cl', comuna: 'Ñuñoa', amount: s.price, status: 'PAID', buyOrder: buyOrder(), paidAt: new Date(now - 11 * D), authCode: '1213', cardLast4: '6623' } });
      continue;
    }
    const { seed, seedHash } = newSeed();
    const a = await prisma.artwork.create({ data: { ...base, value: s.value, totalTickets: s.total, endsAt: new Date(s.ends), policy: 'DRAW', seed, seedHash } });
    // números vendidos, agrupados en compras con fecha
    const r = rng(s.seed * 7 + 3), nums = Array.from({ length: s.total }, (_, i) => i + 1);
    for (let i = nums.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [nums[i], nums[j]] = [nums[j], nums[i]]; }
    const sold = nums.slice(0, s.sold), groups: number[][] = [];
    for (let i = 0; i < sold.length;) { const k = Math.min(sold.length - i, 1 + Math.floor(r() * r() * 4)); groups.push(sold.slice(i, i + k).sort((x, y) => x - y)); i += k; }
    const end = 'drawn' in s ? s.ends - 60_000 : now - H;
    for (const [gi, g] of groups.entries()) {
      const [fn, ln] = NAMES[(gi * 7 + s.seed) % NAMES.length];
      const at = new Date(s.created + ((end - s.created) * (gi + 0.2 + r() * 0.6)) / groups.length);
      const o = await prisma.order.create({ data: { artworkId: a.id, firstName: fn, lastName: ln, email: `${fn.toLowerCase()}@ejemplo.cl`.normalize('NFD').replace(/[̀-ͯ]/g, ''), numbers: g.join(','), amount: g.length * s.price, status: 'PAID', buyOrder: buyOrder(), createdAt: at, paidAt: at } });
      await prisma.ticket.createMany({ data: g.map((number) => ({ artworkId: a.id, number, orderId: o.id })) });
    }
    if ('drawn' in s) {
      const tickets = await prisma.ticket.findMany({ where: { artworkId: a.id }, include: { order: true } });
      const w = computeWinner(seed, tickets.map((t) => ({ number: t.number, orderId: t.orderId })));
      const win = tickets.find((t) => t.number === w.winner.number)!;
      await prisma.draw.create({ data: { artworkId: a.id, winnerNumber: win.number, winnerName: `${win.order.firstName} ${win.order.lastName[0]}.`, orderId: win.orderId, ticketsSold: tickets.length, ticketList: w.ticketList, digest: w.digest, code: shortCode(w.digest), createdAt: new Date(s.ends) } });
      await prisma.artwork.update({ where: { id: a.id }, data: { status: 'DRAWN' } });
    }
  }
  console.log(`Listo: ${SEED.length} obras de ejemplo.`);
}

main().finally(() => prisma.$disconnect());
