import { describe, it, expect, vi, beforeEach } from "vitest";

const { mockUpdate, mockDelete, mockCountUnidad, mockGetAdminUser } = vi.hoisted(() => ({
  mockUpdate: vi.fn(),
  mockDelete: vi.fn(),
  mockCountUnidad: vi.fn(),
  mockGetAdminUser: vi.fn(),
}));
vi.mock("@/lib/db", () => ({
  db: { envio: { update: mockUpdate, delete: mockDelete }, unidad: { count: mockCountUnidad } },
}));
vi.mock("@/lib/admin/current-user", () => ({ getAdminUser: mockGetAdminUser }));

import { PATCH, DELETE } from "../route";
import { NextRequest } from "next/server";

function makeRequest(body: unknown): NextRequest {
  return new NextRequest("http://localhost/api/admin/envios/e1", {
    method: "PATCH",
    body: JSON.stringify(body),
    headers: { "content-type": "application/json" },
  });
}

const VALID = {
  numeroPI: "PI-001",
  numeroBL: null,
  numeroContenedor: null,
  fechaEmbarque: null,
  fechaArriboEstimado: null,
  fechaArribo: null,
  costoPI: null,
  costoFlete: null,
  costoSeguro: null,
  costoAduana: null,
  costoOtrosInternacional: null,
  notas: null,
};

describe("PATCH /api/admin/envios/[id]", () => {
  beforeEach(() => vi.clearAllMocks());

  it("actualiza el envío y devuelve 200", async () => {
    mockUpdate.mockResolvedValueOnce({ id: "e1", ...VALID });
    const res = await PATCH(makeRequest(VALID), { params: Promise.resolve({ id: "e1" }) });
    expect(res.status).toBe(200);
    expect(mockUpdate).toHaveBeenCalledWith({
      where: { id: "e1" },
      data: expect.objectContaining({ numeroPI: "PI-001" }),
    });
  });

  it("400 si el body no es JSON válido", async () => {
    const req = new NextRequest("http://localhost/api/admin/envios/e1", {
      method: "PATCH",
      body: "no-es-json",
      headers: { "content-type": "application/json" },
    });
    const res = await PATCH(req, { params: Promise.resolve({ id: "e1" }) });
    expect(res.status).toBe(400);
  });

  it("400 si el body no cumple el schema (fecha inválida)", async () => {
    const res = await PATCH(makeRequest({ ...VALID, costoPI: "no-es-numero" }), {
      params: Promise.resolve({ id: "e1" }),
    });
    expect(res.status).toBe(400);
    expect(mockUpdate).not.toHaveBeenCalled();
  });

  it("500 si la DB falla", async () => {
    mockUpdate.mockRejectedValueOnce(new Error("db down"));
    const res = await PATCH(makeRequest(VALID), { params: Promise.resolve({ id: "e1" }) });
    expect(res.status).toBe(500);
  });
});

function makeDeleteRequest(): NextRequest {
  return new NextRequest("http://localhost/api/admin/envios/e1", { method: "DELETE" });
}

describe("DELETE /api/admin/envios/[id]", () => {
  beforeEach(() => vi.clearAllMocks());

  it("401 sin sesión", async () => {
    mockGetAdminUser.mockResolvedValueOnce(null);
    const res = await DELETE(makeDeleteRequest(), { params: Promise.resolve({ id: "e1" }) });
    expect(res.status).toBe(401);
  });

  it("403 si el rol no es admin", async () => {
    mockGetAdminUser.mockResolvedValueOnce({ id: "u1", nombre: "Vend", email: "v@x.com", rol: "vendedor" });
    const res = await DELETE(makeDeleteRequest(), { params: Promise.resolve({ id: "e1" }) });
    expect(res.status).toBe(403);
  });

  it("400 si tiene unidades asociadas", async () => {
    mockGetAdminUser.mockResolvedValueOnce({ id: "u1", nombre: "Admin", email: "a@x.com", rol: "admin" });
    mockCountUnidad.mockResolvedValueOnce(1);
    const res = await DELETE(makeDeleteRequest(), { params: Promise.resolve({ id: "e1" }) });
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toContain("1 unidad asociada");
    expect(mockDelete).not.toHaveBeenCalled();
  });

  it("elimina y devuelve 200 cuando no tiene unidades", async () => {
    mockGetAdminUser.mockResolvedValueOnce({ id: "u1", nombre: "Admin", email: "a@x.com", rol: "admin" });
    mockCountUnidad.mockResolvedValueOnce(0);
    mockDelete.mockResolvedValueOnce({ id: "e1" });
    const res = await DELETE(makeDeleteRequest(), { params: Promise.resolve({ id: "e1" }) });
    expect(res.status).toBe(200);
    expect(mockDelete).toHaveBeenCalledWith({ where: { id: "e1" } });
  });

  it("500 si la DB falla al eliminar", async () => {
    mockGetAdminUser.mockResolvedValueOnce({ id: "u1", nombre: "Admin", email: "a@x.com", rol: "admin" });
    mockCountUnidad.mockResolvedValueOnce(0);
    mockDelete.mockRejectedValueOnce(new Error("db down"));
    const res = await DELETE(makeDeleteRequest(), { params: Promise.resolve({ id: "e1" }) });
    expect(res.status).toBe(500);
  });
});
