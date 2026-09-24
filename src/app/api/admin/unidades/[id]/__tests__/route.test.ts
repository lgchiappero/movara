import { describe, it, expect, vi, beforeEach } from "vitest";

const { mockUpdate } = vi.hoisted(() => ({ mockUpdate: vi.fn() }));
vi.mock("@/lib/db", () => ({ db: { unidad: { update: mockUpdate } } }));

import { PATCH } from "../route";
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
