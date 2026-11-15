import { prisma } from './db';

const DEFAULTS = ['Óleo sobre tela', 'Acrílico sobre tela', 'Acuarela sobre papel', 'Técnica mixta', 'Óleo sobre madera', 'Fotografía', 'Grabado', 'Dibujo', 'Serigrafía', 'Escultura'];

/** Tipos de cuadro sugeridos: los de base más todos los que ya se usaron en obras publicadas. */
const FRAMES = ['Sin marco (solo bastidor)', 'Marco de madera natural', 'Marco negro', 'Marco blanco', 'Marco dorado', 'Marco con paspartú y vidrio'];

/** Tipos de marco sugeridos: los de base más los que ya se usaron. */
export async function frameOptions() {
  const used = await prisma.artwork.findMany({ where: { frame: { not: '' } }, select: { frame: true }, distinct: ['frame'] });
  return [...new Set([...FRAMES, ...used.map((u) => u.frame)])].sort((a, b) => a.localeCompare(b, 'es'));
}

/** Categorías existentes, ordenadas por nombre. */
export async function categoryOptions() {
  return (await prisma.category.findMany({ orderBy: { name: 'asc' } })).map((c) => c.name);
}

export async function techniqueOptions() {
  const used = await prisma.artwork.findMany({ where: { technique: { not: '' } }, select: { technique: true }, distinct: ['technique'] });
  return [...new Set([...DEFAULTS, ...used.map((u) => u.technique)])].sort((a, b) => a.localeCompare(b, 'es'));
}
