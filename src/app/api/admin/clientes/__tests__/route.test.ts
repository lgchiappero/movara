import { describe, it, expect, vi, beforeEach } from "vitest";

const { mockCreate } = vi.hoisted(() => ({ mockCreate: vi.fn() }));
vi.mock("@/lib/db", () => ({ db: { cliente: { create: mockCreate } } }));

import { POST } from "../route";
import { NextRequest } from "next/server";

function makeRequest(body: unknown): NextRequest {
  return new NextRequest("http://localhost/api/admin/clientes", {
    method: "POST",
    body: JSON.stringify(body),
    headers: { "content-type": "application/json" },
  });
}

const VALID = {
  nombre: "Juan García",
  dni: null,
  cuit: null,
  domicilio: null,
  email: null,
  telefono: null,
  notas: null,
};

describe("POST /api/admin/clientes", () => {
  beforeEach(() => vi.clearAllMocks());

  it("crea el cliente y devuelve 201 con su id", async () => {
    mockCreate.mockResolvedValueOnce({ id: "cli1" });
    const res = await POST(makeRequest(VALID));
    expect(res.status).toBe(201);
    expect((await res.json()).id).toBe("cli1");
    expect(mockCreate).toHaveBeenCalledWith({ data: VALID });
  });

  it("400 si falta el nombre", async () => {
    const res = await POST(makeRequest({ ...VALID, nombre: "" }));
    expect(res.status).toBe(400);
    expect(mockCreate).not.toHaveBeenCalled();
  });

  it("400 si el body no es JSON válido", async () => {
    const req = new NextRequest("http://localhost/api/admin/clientes", {
      method: "POST",
      body: "no-es-json",
      headers: { "content-type": "application/json" },
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it("500 si la DB falla", async () => {
    mockCreate.mockRejectedValueOnce(new Error("db down"));
    const res = await POST(makeRequest(VALID));
    expect(res.status).toBe(500);
  });
});
