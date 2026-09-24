import { describe, it, expect, vi, beforeEach } from "vitest";

const { mockTransaction, mockFindMany, mockCreate } = vi.hoisted(() => ({
  mockTransaction: vi.fn(),
  mockFindMany: vi.fn().mockResolvedValue([]),
  mockCreate: vi.fn(),
}));

vi.mock("@/lib/db", () => ({
  db: {
    $transaction: mockTransaction,
  },
}));

import { POST } from "../route";
import { NextRequest } from "next/server";

function makeRequest(body: unknown): NextRequest {
  return new NextRequest("http://localhost/api/admin/unidades", {
    method: "POST",
    body: JSON.stringify(body),
    headers: { "content-type": "application/json" },
  });
}

describe("POST /api/admin/unidades", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFindMany.mockResolvedValue([]);
    mockTransaction.mockImplementation(async (cb) =>
      cb({ unidad: { findMany: mockFindMany, create: mockCreate } })
    );
  });

  it("crea la unidad con número generado y devuelve 201", async () => {
    mockCreate.mockResolvedValueOnce({ id: "u1" });
    const res = await POST(makeRequest({ clienteId: "cli1" }));
    expect(res.status).toBe(201);
    expect((await res.json()).id).toBe("u1");
    expect(mockCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({ clienteId: "cli1", envioId: null, modelo: null }),
    });
  });

  it("400 si el body no es JSON válido", async () => {
    const req = new NextRequest("http://localhost/api/admin/unidades", {
      method: "POST",
      body: "no-es-json",
      headers: { "content-type": "application/json" },
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it("400 si falta clienteId", async () => {
    const res = await POST(makeRequest({}));
    expect(res.status).toBe(400);
    expect(mockTransaction).not.toHaveBeenCalled();
  });

  it("500 si la transacción falla", async () => {
    mockTransaction.mockRejectedValueOnce(new Error("db down"));
    const res = await POST(makeRequest({ clienteId: "cli1" }));
    expect(res.status).toBe(500);
  });
});
