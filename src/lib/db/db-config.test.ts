import { describe, it, expect, vi } from "vitest";

vi.mock("@prisma/client", () => ({ PrismaClient: class { constructor(public opciones: unknown) {} } }));
vi.mock("@prisma/adapter-pg", () => ({ PrismaPg: class { constructor(public pool: unknown) {} } }));
const pools: unknown[] = [];
vi.mock("pg", () => ({ default: { Pool: class { constructor(public config: unknown) { pools.push(config); } } } }));

describe("pool de conexiones", () => {
  it("falla rápido en vez de esperar para siempre, libera ociosas y corta consultas largas", async () => {
    const { POOL_CONFIG } = await import("./index");
    expect(POOL_CONFIG).toMatchObject({ connectionTimeoutMillis: 10_000, idleTimeoutMillis: 30_000, query_timeout: 15_000 });
    expect(pools).toHaveLength(1);
    expect(pools[0]).toMatchObject({ connectionTimeoutMillis: 10_000, idleTimeoutMillis: 30_000, query_timeout: 15_000 });
  });

  it("una sola instancia compartida, también con recargas del módulo (hot reload)", async () => {
    const a = (await import("./index")).db;
    vi.resetModules();
    const b = (await import("./index")).db;
    expect(b).toBe(a);
    expect(pools).toHaveLength(1);
  });

  it("5 conexiones por instancia en producción (el pooler de Supabase reparte las reales), 10 en local", async () => {
    vi.resetModules();
    vi.stubEnv("NODE_ENV", "production");
    expect((await import("./index")).POOL_CONFIG.max).toBe(5);
    vi.unstubAllEnvs();
    vi.resetModules();
    expect((await import("./index")).POOL_CONFIG.max).toBe(10);
  });
});
