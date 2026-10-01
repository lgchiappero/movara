import { describe, it, expect, vi, beforeEach } from "vitest";

const { mockFindUnique, mockUpdate, mockDelete, mockCountAcuerdo, mockCountDocumento, mockGetAdminUser } = vi.hoisted(() => ({
  mockFindUnique: vi.fn(),
  mockUpdate: vi.fn(),
  mockDelete: vi.fn(),
  mockCountAcuerdo: vi.fn(),
  mockCountDocumento: vi.fn(),
  mockGetAdminUser: vi.fn(),
}));
vi.mock("@/lib/db", () => ({
  db: {
    unidad: { findUnique: mockFindUnique, update: mockUpdate, delete: mockDelete },
    acuerdoPago: { count: mockCountAcuerdo },
    documentoUnidad: { count: mockCountDocumento },
  },
}));
vi.mock("@/lib/admin/current-user", () => ({ getAdminUser: mockGetAdminUser }));

import { GET, PATCH, DELETE } from "../route";
import { NextRequest } from "next/server";

function makeRequest(body: unknown): NextRequest {
  return new NextRequest("http://localhost/api/admin/unidades/u1", {
    method: "PATCH",
    body: JSON.stringify(body),
    headers: { "content-type": "application/json" },
  });
}

const VALID = {
  clienteId: "cli1",
  envioId: null,
  modelo: null,
  configuracion: null,
  precioCliente: null,
  estadoFabricacion: "pendiente",
  provinciaDestino: null,
  localidadDestino: null,
  direccionEntrega: null,
  costoTransporteNacional: null,
  costoGrua: null,
  fechaEntregaEstimada: null,
  fechaEntrega: null,
  garantiaActivada: false,
  garantiaInicio: null,
  notas: null,
};

const params = { params: Promise.resolve({ id: "u1" }) };

describe("GET /api/admin/unidades/[id]", () => {
  beforeEach(() => vi.clearAllMocks());
  const req = new NextRequest("http://localhost/api/admin/unidades/u1");

  it("devuelve cliente y precioCliente de la unidad", async () => {
    const unidad = { id: "u1", numeroUnidad: "MOV-1", precioCliente: 42000, cliente: { id: "c1", nombre: "Ana Pérez" } };
    mockFindUnique.mockResolvedValue(unidad);
    const res = await GET(req, params);
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true, unidad });
    expect(mockFindUnique).toHaveBeenCalledWith(expect.objectContaining({ where: { id: "u1" } }));
  });

  it("404 si la unidad no existe", async () => {
    mockFindUnique.mockResolvedValue(null);
    const res = await GET(req, params);
    expect(res.status).toBe(404);
  });

  it("500 si la DB falla", async () => {
    mockFindUnique.mockRejectedValue(new Error("db down"));
    vi.spyOn(console, "error").mockImplementation(() => {});
    const res = await GET(req, params);
    expect(res.status).toBe(500);
  });
});

describe("PATCH /api/admin/unidades/[id]", () => {
  beforeEach(() => vi.clearAllMocks());

  it("actualiza la unidad y devuelve 200", async () => {
    mockUpdate.mockResolvedValueOnce({ id: "u1", ...VALID });
    const res = await PATCH(makeRequest(VALID), { params: Promise.resolve({ id: "u1" }) });
    expect(res.status).toBe(200);
    const call = mockUpdate.mock.calls[0][0];
    expect(call.where).toEqual({ id: "u1" });
    expect(call.data.clienteId).toBe("cli1");
    expect(call.data.garantiaFin).toBeNull();
  });

  it("configuracion=null se guarda como Prisma.JsonNull, no como null plano", async () => {
    mockUpdate.mockResolvedValueOnce({ id: "u1", ...VALID });
    await PATCH(makeRequest(VALID), { params: Promise.resolve({ id: "u1" }) });
    const data = mockUpdate.mock.calls[0][0].data;
    // Prisma.JsonNull es un símbolo especial, no `null` — no debe ser triple-igual a null.
    expect(data.configuracion).not.toBeNull();
    expect(String(data.configuracion)).toContain("JsonNull");
  });

  it("configuracion con datos reales se pasa tal cual (no JsonNull)", async () => {
    mockUpdate.mockResolvedValueOnce({ id: "u1", ...VALID });
    await PATCH(makeRequest({ ...VALID, configuracion: { color: "gris" } }), {
      params: Promise.resolve({ id: "u1" }),
    });
    const data = mockUpdate.mock.calls[0][0].data;
    expect(data.configuracion).toEqual({ color: "gris" });
  });

  it("calcula garantiaFin +12 meses cuando hay garantiaInicio", async () => {
    mockUpdate.mockResolvedValueOnce({ id: "u1", ...VALID });
    await PATCH(makeRequest({ ...VALID, garantiaInicio: "2026-02-01" }), {
      params: Promise.resolve({ id: "u1" }),
    });
    const data = mockUpdate.mock.calls[0][0].data;
    expect(data.garantiaFin.getUTCFullYear()).toBe(2027);
  });

  it("400 si el body no es JSON válido", async () => {
    const req = new NextRequest("http://localhost/api/admin/unidades/u1", {
      method: "PATCH",
      body: "no-es-json",
      headers: { "content-type": "application/json" },
    });
    const res = await PATCH(req, { params: Promise.resolve({ id: "u1" }) });
    expect(res.status).toBe(400);
  });

  it("400 si el body no cumple el schema (estadoFabricacion inválido)", async () => {
    const res = await PATCH(makeRequest({ ...VALID, estadoFabricacion: "no-existe" }), {
      params: Promise.resolve({ id: "u1" }),
    });
    expect(res.status).toBe(400);
    expect(mockUpdate).not.toHaveBeenCalled();
  });

  it("500 si la DB falla", async () => {
    mockUpdate.mockRejectedValueOnce(new Error("db down"));
    const res = await PATCH(makeRequest(VALID), { params: Promise.resolve({ id: "u1" }) });
    expect(res.status).toBe(500);
  });
});

function makeDeleteRequest(): NextRequest {
  return new NextRequest("http://localhost/api/admin/unidades/u1", { method: "DELETE" });
}

describe("DELETE /api/admin/unidades/[id]", () => {
  beforeEach(() => vi.clearAllMocks());

  it("401 sin sesión", async () => {
    mockGetAdminUser.mockResolvedValueOnce(null);
    const res = await DELETE(makeDeleteRequest(), { params: Promise.resolve({ id: "u1" }) });
    expect(res.status).toBe(401);
  });

  it("403 si el rol no es admin", async () => {
    mockGetAdminUser.mockResolvedValueOnce({ id: "u1", nombre: "Vend", email: "v@x.com", rol: "vendedor" });
    const res = await DELETE(makeDeleteRequest(), { params: Promise.resolve({ id: "u1" }) });
    expect(res.status).toBe(403);
  });

  it("400 si tiene pagos y documentos asociados (mensaje combinado)", async () => {
    mockGetAdminUser.mockResolvedValueOnce({ id: "u1", nombre: "Admin", email: "a@x.com", rol: "admin" });
    mockCountAcuerdo.mockResolvedValueOnce(2);
    mockCountDocumento.mockResolvedValueOnce(3);
    const res = await DELETE(makeDeleteRequest(), { params: Promise.resolve({ id: "u1" }) });
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toContain("2 pagos");
    expect(json.error).toContain("3 documentos");
    expect(mockDelete).not.toHaveBeenCalled();
  });

  it("400 si solo tiene documentos (singular)", async () => {
    mockGetAdminUser.mockResolvedValueOnce({ id: "u1", nombre: "Admin", email: "a@x.com", rol: "admin" });
    mockCountAcuerdo.mockResolvedValueOnce(0);
    mockCountDocumento.mockResolvedValueOnce(1);
    const res = await DELETE(makeDeleteRequest(), { params: Promise.resolve({ id: "u1" }) });
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toContain("1 documento");
  });

  it("elimina y devuelve 200 cuando no tiene pagos ni documentos", async () => {
    mockGetAdminUser.mockResolvedValueOnce({ id: "u1", nombre: "Admin", email: "a@x.com", rol: "admin" });
    mockCountAcuerdo.mockResolvedValueOnce(0);
    mockCountDocumento.mockResolvedValueOnce(0);
    mockDelete.mockResolvedValueOnce({ id: "u1" });
    const res = await DELETE(makeDeleteRequest(), { params: Promise.resolve({ id: "u1" }) });
    expect(res.status).toBe(200);
    expect(mockDelete).toHaveBeenCalledWith({ where: { id: "u1" } });
  });

  it("500 si la DB falla al eliminar", async () => {
    mockGetAdminUser.mockResolvedValueOnce({ id: "u1", nombre: "Admin", email: "a@x.com", rol: "admin" });
    mockCountAcuerdo.mockResolvedValueOnce(0);
    mockCountDocumento.mockResolvedValueOnce(0);
    mockDelete.mockRejectedValueOnce(new Error("db down"));
    const res = await DELETE(makeDeleteRequest(), { params: Promise.resolve({ id: "u1" }) });
    expect(res.status).toBe(500);
  });
});
