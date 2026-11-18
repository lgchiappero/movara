import { PrismaClient } from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'
import pg from 'pg'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

/** Configuración del pool de conexiones (una sola instancia por proceso:
 * en desarrollo se guarda en globalThis para que el hot reload no cree
 * pools nuevos).
 *
 * - max: en Vercel cada instancia de función tiene su propio pool y todas
 *   pasan por el pooler de Supabase (Supavisor, modo transaction), que es
 *   el que reparte las conexiones reales: 5 por instancia alcanza para las
 *   ráfagas del admin (ej. el detalle de una unidad lanza ~20 consultas en
 *   paralelo, que esperan su turno) sin agotar el pooler. En local, 10.
 * - connectionTimeoutMillis: sin esto, si no hay conexión libre se espera
 *   PARA SIEMPRE (el default de pg es 0). A los 10 s falla con error y la
 *   ruta responde un error controlado.
 * - idleTimeoutMillis: libera conexiones ociosas a los 30 s.
 * - query_timeout: corta en el cliente una consulta que tarde más de 15 s
 *   (funciona igual con el pooler en modo transaction, que no acepta
 *   parámetros de sesión como statement_timeout al conectar). */
export const POOL_CONFIG = {
  max: process.env.NODE_ENV === 'production' ? 5 : 10,
  connectionTimeoutMillis: 10_000,
  idleTimeoutMillis: 30_000,
  query_timeout: 15_000,
} as const

function createPrismaClient() {
  const pool = new pg.Pool({
    connectionString: process.env.DATABASE_URL,
    ...POOL_CONFIG,
  })
  const adapter = new PrismaPg(pool)
  return new PrismaClient({
    adapter,
    log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
  })
}

export const db = globalForPrisma.prisma ?? createPrismaClient()

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = db
