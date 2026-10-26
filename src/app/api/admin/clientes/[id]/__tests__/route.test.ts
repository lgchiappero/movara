import { describe, it, expect, vi, beforeEach } from "vitest";

const { mockUpdate, mockDelete, mockCountUnidad, mockGetAdminUser, mockLeadUpdateMany } = vi.hoisted(() => ({
  mockUpdate: vi.fn(),
  mockDelete: vi.fn(),
  mockLeadUpdateMany: vi.fn(),
  mockCountUnidad: vi.fn(),
  mockGetAdminUser: vi.fn(),
}));
vi.mock("@/lib/db", () => ({
  db: {
    cliente: { update: mockUpdate, delete: mockDelete },
    lead: { updateMany: mockLeadUpdateMany },
    unidad: { count: mockCountUnidad },
    $transaction: (ops: Promise<unknown>[]) => Promise.all(ops),
  },
}));
vi.mock("@/lib/admin/current-user", () => ({ getAdminUser: mockGetAdminUser }));

import { PATCH, DELETE } from "../route";
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
    expect(mockUpdate).toHaveBeenCalledWith({
      where: { id: "c1" },
      data: { ...VALID, emailNorm: null, telefonoNorm: null },
    });
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

function makeDeleteRequest(): NextRequest {
  return new NextRequest("http://localhost/api/admin/clientes/c1", { method: "DELETE" });
}

describe("DELETE /api/admin/clientes/[id]", () => {
  beforeEach(() => vi.clearAllMocks());

  it("401 sin sesión", async () => {
    mockGetAdminUser.mockResolvedValueOnce(null);
    const res = await DELETE(makeDeleteRequest(), { params: Promise.resolve({ id: "c1" }) });
    expect(res.status).toBe(401);
    expect(mockDelete).not.toHaveBeenCalled();
  });

  it("403 si el rol no es admin", async () => {
    mockGetAdminUser.mockResolvedValueOnce({ id: "u1", nombre: "Vend", email: "v@x.com", rol: "vendedor" });
    const res = await DELETE(makeDeleteRequest(), { params: Promise.resolve({ id: "c1" }) });
    expect(res.status).toBe(403);
    expect(mockDelete).not.toHaveBeenCalled();
  });

  it("400 si tiene unidades asociadas", async () => {
    mockGetAdminUser.mockResolvedValueOnce({ id: "u1", nombre: "Admin", email: "a@x.com", rol: "admin" });
    mockCountUnidad.mockResolvedValueOnce(2);
    const res = await DELETE(makeDeleteRequest(), { params: Promise.resolve({ id: "c1" }) });
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toContain("2 unidades asociadas");
    expect(mockDelete).not.toHaveBeenCalled();
  });

  it("elimina y devuelve 200 cuando no tiene unidades", async () => {
    mockGetAdminUser.mockResolvedValueOnce({ id: "u1", nombre: "Admin", email: "a@x.com", rol: "admin" });
    mockCountUnidad.mockResolvedValueOnce(0);
    mockDelete.mockResolvedValueOnce({ id: "c1" });
    const res = await DELETE(makeDeleteRequest(), { params: Promise.resolve({ id: "c1" }) });
    expect(res.status).toBe(200);
    expect(mockDelete).toHaveBeenCalledWith({ where: { id: "c1" } });
    // lead.clienteId no tiene FK: se desvincula en la misma transacción.
    expect(mockLeadUpdateMany).toHaveBeenCalledWith({ where: { clienteId: "c1" }, data: { clienteId: null } });
  });

  it("500 si la DB falla al eliminar", async () => {
    mockGetAdminUser.mockResolvedValueOnce({ id: "u1", nombre: "Admin", email: "a@x.com", rol: "admin" });
    mockCountUnidad.mockResolvedValueOnce(0);
    mockDelete.mockRejectedValueOnce(new Error("db down"));
    const res = await DELETE(makeDeleteRequest(), { params: Promise.resolve({ id: "c1" }) });
    expect(res.status).toBe(500);
  });
});
