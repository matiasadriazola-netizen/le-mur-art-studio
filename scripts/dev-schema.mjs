// Copia el esquema de producción (PostgreSQL) cambiando el proveedor a SQLite para desarrollo local.
import { readFileSync, writeFileSync } from 'node:fs';
const src = readFileSync('prisma/schema.prisma', 'utf8');
writeFileSync('prisma/dev.schema.prisma', '// ARCHIVO GENERADO por scripts/dev-schema.mjs — no editar\n' + src.replace('provider = "postgresql"', 'provider = "sqlite"'));
console.log('prisma/dev.schema.prisma listo (SQLite)');
