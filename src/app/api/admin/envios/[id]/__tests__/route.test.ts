import { describe, it, expect, vi, beforeEach } from "vitest";

const { mockFindUnique, mockUpdate, mockDelete, mockCountUnidad, mockGetAdminUser, mockCountCosto } = vi.hoisted(() => ({
  mockCountCosto: vi.fn().mockResolvedValue(0),
  mockFindUnique: vi.fn(),
  mockUpdate: vi.fn(),
  mockDelete: vi.fn(),
  mockCountUnidad: vi.fn(),
  mockGetAdminUser: vi.fn(),
}));
vi.mock("@/lib/db", () => ({
  db: {
    envio: { findUnique: mockFindUnique, update: mockUpdate, delete: mockDelete },
    unidad: { count: mockCountUnidad },
    costoLogistica: { count: mockCountCosto },
  },
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

const ANTES = { numeroPI: null, numeroBL: null, numeroContenedor: null };

describe("PATCH /api/admin/envios/[id]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFindUnique.mockResolvedValue(ANTES);
    vi.spyOn(console, "info").mockImplementation(() => {});
    vi.spyOn(console, "warn").mockImplementation(() => {});
    vi.spyOn(console, "error").mockImplementation(() => {});
  });

  it("guarda PI, BL y contenedor tal como llegan", async () => {
    const body = { ...VALID, numeroPI: "PI-123", numeroBL: "BL-456", numeroContenedor: "CONT-789" };
    mockUpdate.mockResolvedValueOnce({ id: "e1", ...body });
    const res = await PATCH(makeRequest(body), { params: Promise.resolve({ id: "e1" }) });
    expect(res.status).toBe(200);
    expect(mockUpdate).toHaveBeenCalledWith({
      where: { id: "e1" },
      data: expect.objectContaining({ numeroPI: "PI-123", numeroBL: "BL-456", numeroContenedor: "CONT-789" }),
    });
  });

  it("loguea el body recibido y los valores antes/después del update", async () => {
    const body = { ...VALID, numeroPI: "PI-123", numeroBL: "BL-456", numeroContenedor: "CONT-789" };
    mockFindUnique.mockResolvedValueOnce({ numeroPI: "PI-viejo", numeroBL: null, numeroContenedor: null });
    mockUpdate.mockResolvedValueOnce({ id: "e1", ...body });
    await PATCH(makeRequest(body), { params: Promise.resolve({ id: "e1" }) });

    expect(console.info).toHaveBeenCalledWith("[admin/envios/:id PATCH] body recibido", { id: "e1", body });
    expect(console.info).toHaveBeenCalledWith("[admin/envios/:id PATCH] guardado", {
      id: "e1",
      antes: { numeroPI: "PI-viejo", numeroBL: null, numeroContenedor: null },
      enviado: { numeroPI: "PI-123", numeroBL: "BL-456", numeroContenedor: "CONT-789" },
      despues: { numeroPI: "PI-123", numeroBL: "BL-456", numeroContenedor: "CONT-789" },
    });
  });

  it("loguea los errores de validación cuando el body es inválido", async () => {
    await PATCH(makeRequest({ ...VALID, numeroBL: 123 }), { params: Promise.resolve({ id: "e1" }) });
    expect(console.warn).toHaveBeenCalledWith(
      "[admin/envios/:id PATCH] body inválido",
      expect.objectContaining({ id: "e1", issues: expect.any(Array) })
    );
  });

  it("404 si el envío no existe", async () => {
    mockFindUnique.mockResolvedValueOnce(null);
    const res = await PATCH(makeRequest(VALID), { params: Promise.resolve({ id: "e1" }) });
    expect(res.status).toBe(404);
    expect(mockUpdate).not.toHaveBeenCalled();
  });

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

  it("400 si tiene costos de logística cargados (no se borran en cascada)", async () => {
    mockGetAdminUser.mockResolvedValueOnce({ id: "u1", nombre: "Admin", email: "a@x.com", rol: "admin" });
    mockCountUnidad.mockResolvedValueOnce(0);
    mockCountCosto.mockResolvedValueOnce(2);
    const res = await DELETE(makeDeleteRequest(), { params: Promise.resolve({ id: "e1" }) });
    expect(res.status).toBe(400);
    expect((await res.json()).error).toBe("No se puede eliminar: tiene 2 costos de logística cargados");
    expect(mockDelete).not.toHaveBeenCalled();
  });

  it("singular para 1 costo de logística", async () => {
    mockGetAdminUser.mockResolvedValueOnce({ id: "u1", nombre: "Admin", email: "a@x.com", rol: "admin" });
    mockCountUnidad.mockResolvedValueOnce(0);
    mockCountCosto.mockResolvedValueOnce(1);
    const res = await DELETE(makeDeleteRequest(), { params: Promise.resolve({ id: "e1" }) });
    expect((await res.json()).error).toBe("No se puede eliminar: tiene 1 costo de logística cargado");
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
