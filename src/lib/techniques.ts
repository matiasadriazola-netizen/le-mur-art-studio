import { prisma } from './db';

const DEFAULTS = ['Óleo sobre tela', 'Acrílico sobre tela', 'Acuarela sobre papel', 'Técnica mixta', 'Óleo sobre madera', 'Fotografía', 'Grabado', 'Dibujo', 'Serigrafía', 'Escultura'];

/** Tipos de cuadro sugeridos: los de base más todos los que ya se usaron en obras publicadas. */
export async function techniqueOptions() {
  const used = await prisma.artwork.findMany({ where: { technique: { not: '' } }, select: { technique: true }, distinct: ['technique'] });
  return [...new Set([...DEFAULTS, ...used.map((u) => u.technique)])].sort((a, b) => a.localeCompare(b, 'es'));
}
