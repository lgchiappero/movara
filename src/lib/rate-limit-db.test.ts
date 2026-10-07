import { describe, it, expect, vi, beforeEach } from "vitest";

const { mockDeleteMany, mockCount, mockCreate } = vi.hoisted(() => ({
  mockDeleteMany: vi.fn().mockResolvedValue({ count: 0 }),
  mockCount: vi.fn(),
  mockCreate: vi.fn().mockResolvedValue({}),
}));

vi.mock("@/lib/db", () => ({
  db: { rateLimitHit: { deleteMany: mockDeleteMany, count: mockCount, create: mockCreate } },
}));

import { claveIP, consumirRateLimit } from "./rate-limit-db";

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
