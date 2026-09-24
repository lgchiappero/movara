import { describe, it, expect, vi, beforeEach } from "vitest";

const { mockCreate } = vi.hoisted(() => ({ mockCreate: vi.fn() }));
vi.mock("@/lib/db", () => ({ db: { envio: { create: mockCreate } } }));

import { POST } from "../route";

describe("POST /api/admin/envios", () => {
  beforeEach(() => vi.clearAllMocks());

  it("crea un envío vacío y devuelve 201 con su id", async () => {
    mockCreate.mockResolvedValueOnce({ id: "env1" });
    const res = await POST();
    expect(res.status).toBe(201);
    expect((await res.json()).id).toBe("env1");
    expect(mockCreate).toHaveBeenCalledWith({ data: {} });
  });

  it("500 si la DB falla", async () => {
    mockCreate.mockRejectedValueOnce(new Error("db down"));
    const res = await POST();
    expect(res.status).toBe(500);
  });
});
