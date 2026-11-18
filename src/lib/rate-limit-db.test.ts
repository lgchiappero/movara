import { describe, it, expect, vi, beforeEach } from "vitest";

const { mockDeleteMany, mockCount, mockCreate } = vi.hoisted(() => ({
  mockDeleteMany: vi.fn().mockResolvedValue({ count: 0 }),
  mockCount: vi.fn(),
  mockCreate: vi.fn().mockResolvedValue({}),
}));

vi.mock("@/lib/db", () => ({
  db: { rateLimitHit: { deleteMany: mockDeleteMany, count: mockCount, create: mockCreate } },
}));

import { borrarHits, claveDe, claveIP, consumirRateLimit, contarHits, registrarHit } from "./rate-limit-db";

beforeEach(() => vi.clearAllMocks());

describe("claveIP", () => {
  it("no contiene la IP en claro y es estable por scope + IP", () => {
    process.env.AUTH_SECRET = "secreto-de-test";
    const a = claveIP("leads", "190.1.2.3");
    expect(a).toMatch(/^leads:[a-f0-9]{64}$/);
    expect(a).not.toContain("190.1.2.3");
    expect(claveIP("leads", "190.1.2.3")).toBe(a);
    expect(claveIP("leads", "190.1.2.4")).not.toBe(a);
    expect(claveIP("otro", "190.1.2.3")).not.toBe(a);
  });

  it("funciona aunque AUTH_SECRET no esté definido", () => {
    delete process.env.AUTH_SECRET;
    expect(claveIP("leads", "1.1.1.1")).toMatch(/^leads:[a-f0-9]{64}$/);
  });
});

describe("consumirRateLimit", () => {
  it("con cupo disponible registra el hit y devuelve true", async () => {
    mockCount.mockResolvedValue(2);
    await expect(consumirRateLimit("k", 3, 60_000)).resolves.toBe(true);
    expect(mockCreate).toHaveBeenCalledWith({ data: { key: "k" } });
  });

  it("sin cupo devuelve false y no consume", async () => {
    mockCount.mockResolvedValue(3);
    await expect(consumirRateLimit("k", 3, 60_000)).resolves.toBe(false);
    expect(mockCreate).not.toHaveBeenCalled();
  });

  it("limpia los hits vencidos de la clave y cuenta solo los de la ventana", async () => {
    mockCount.mockResolvedValue(0);
    const antes = Date.now();
    await consumirRateLimit("k", 3, 60_000);
    const borrado = mockDeleteMany.mock.calls[0][0].where;
    const contado = mockCount.mock.calls[0][0].where;
    expect(borrado.key).toBe("k");
    expect(borrado.createdAt.lt.getTime()).toBeGreaterThanOrEqual(antes - 60_000);
    expect(contado.createdAt.gte).toEqual(borrado.createdAt.lt);
  });
});

describe("claveDe", () => {
  it("sirve para cualquier valor (ej. email) con el mismo HMAC que claveIP", () => {
    process.env.AUTH_SECRET = "secreto-de-test";
    expect(claveDe("login-email", "ana@x.com")).toMatch(/^login-email:[a-f0-9]{64}$/);
    expect(claveDe("login-email", "ana@x.com")).not.toContain("ana");
    expect(claveIP("s", "1.1.1.1")).toBe(claveDe("s", "1.1.1.1"));
  });
});

describe("contarHits / registrarHit / borrarHits", () => {
  it("cuenta sin consumir, registra un hit y borra todos los de la clave", async () => {
    mockCount.mockResolvedValue(4);
    await expect(contarHits("k", 1000)).resolves.toBe(4);
    expect(mockCreate).not.toHaveBeenCalled();
    await registrarHit("k");
    expect(mockCreate).toHaveBeenCalledWith({ data: { key: "k" } });
    await borrarHits("k");
    expect(mockDeleteMany).toHaveBeenLastCalledWith({ where: { key: "k" } });
  });
});
