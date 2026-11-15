import { PrismaClient } from '@prisma/client';

// La semilla secreta de los sorteos se omite por defecto: solo se lee al sortear
// y al verificar un sorteo ya hecho (con omit: { seed: false }).
const create = () => new PrismaClient({ omit: { artwork: { seed: true } } });

const g = globalThis as unknown as { prisma?: ReturnType<typeof create> };
export const prisma = g.prisma ?? create();
if (process.env.NODE_ENV !== 'production') g.prisma = prisma;
