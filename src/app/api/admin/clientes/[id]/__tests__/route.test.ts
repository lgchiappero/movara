import { describe, it, expect, vi, beforeEach } from "vitest";

const { mockUpdate } = vi.hoisted(() => ({ mockUpdate: vi.fn() }));
vi.mock("@/lib/db", () => ({ db: { cliente: { update: mockUpdate } } }));

import { PATCH } from "../route";
import { NextRequest } from "next/server";

function makeRequest(body: unknown): NextRequest {
  return new NextRequest("http://localhost/api/admin/clientes/c1", {
    method: "PATCH",
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

describe("PATCH /api/admin/clientes/[id]", () => {
  beforeEach(() => vi.clearAllMocks());

  it("actualiza el cliente y devuelve 200", async () => {
    mockUpdate.mockResolvedValueOnce({ id: "c1", ...VALID });
    const res = await PATCH(makeRequest(VALID), { params: Promise.resolve({ id: "c1" }) });
    expect(res.status).toBe(200);
    expect(mockUpdate).toHaveBeenCalledWith({ where: { id: "c1" }, data: VALID });
  });

  it("400 si el body no es JSON válido", async () => {
    const req = new NextRequest("http://localhost/api/admin/clientes/c1", {
      method: "PATCH",
      body: "no-es-json",
      headers: { "content-type": "application/json" },
    });
    const res = await PATCH(req, { params: Promise.resolve({ id: "c1" }) });
    expect(res.status).toBe(400);
  });

  it("400 si el nombre es inválido", async () => {
    const res = await PATCH(makeRequest({ ...VALID, nombre: "A" }), {
      params: Promise.resolve({ id: "c1" }),
    });
    expect(res.status).toBe(400);
    expect(mockUpdate).not.toHaveBeenCalled();
  });

  it("500 si la DB falla", async () => {
    mockUpdate.mockRejectedValueOnce(new Error("db down"));
    const res = await PATCH(makeRequest(VALID), { params: Promise.resolve({ id: "c1" }) });
    expect(res.status).toBe(500);
  });
});
