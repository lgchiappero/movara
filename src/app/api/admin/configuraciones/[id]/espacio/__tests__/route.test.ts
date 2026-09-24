import { describe, it, expect, vi, beforeEach } from "vitest";

const { mockUpdate } = vi.hoisted(() => ({ mockUpdate: vi.fn() }));
vi.mock("@/lib/db", () => ({ db: { configuracionPedido: { update: mockUpdate } } }));

import { PATCH } from "../route";
import { NextRequest } from "next/server";

function makeRequest(body: unknown): NextRequest {
  return new NextRequest("http://localhost/api/admin/configuraciones/p1/espacio", {
    method: "PATCH",
    body: JSON.stringify(body),
    headers: { "content-type": "application/json" },
  });
}

const MATERIALES_VACIOS = {
  exterior: null,
  piso: null,
  panelesBano: null,
  puertaBano: null,
  cocina: null,
  mesada: null,
  puertaPrincipal: null,
  ventanas: null,
};

const VALID = {
  modelo: null,
  finalidad: null,
  provincia: null,
  localidad: null,
  habitaciones: null,
  incluyeCocina: true,
  tipoCocina: null,
  incluyeBano: true,
  tipoAgua: null,
  lavarropas: null,
  materiales: MATERIALES_VACIOS,
  upgrades: [],
  notasConfiguracion: null,
};

describe("PATCH /api/admin/configuraciones/[id]/espacio", () => {
  beforeEach(() => vi.clearAllMocks());

  it("actualiza la configuración de espacio y devuelve 200", async () => {
    mockUpdate.mockResolvedValueOnce({ id: "p1", ...VALID });
    const res = await PATCH(makeRequest(VALID), { params: Promise.resolve({ id: "p1" }) });
    expect(res.status).toBe(200);
    expect(mockUpdate).toHaveBeenCalledWith({ where: { id: "p1" }, data: expect.objectContaining({ incluyeCocina: true }) });
  });

  it("400 si el body no es JSON válido", async () => {
    const req = new NextRequest("http://localhost/api/admin/configuraciones/p1/espacio", {
      method: "PATCH",
      body: "no-es-json",
      headers: { "content-type": "application/json" },
    });
    const res = await PATCH(req, { params: Promise.resolve({ id: "p1" }) });
    expect(res.status).toBe(400);
  });

  it("400 si falta una key de materiales", async () => {
    const materialesIncompletos: Partial<typeof MATERIALES_VACIOS> = { ...MATERIALES_VACIOS };
    delete materialesIncompletos.exterior;
    const res = await PATCH(makeRequest({ ...VALID, materiales: materialesIncompletos }), {
      params: Promise.resolve({ id: "p1" }),
    });
    expect(res.status).toBe(400);
    expect(mockUpdate).not.toHaveBeenCalled();
  });

  it("400 si habitaciones no es 1, 2, 3 o null", async () => {
    const res = await PATCH(makeRequest({ ...VALID, habitaciones: 5 }), {
      params: Promise.resolve({ id: "p1" }),
    });
    expect(res.status).toBe(400);
  });

  it("500 si la DB falla", async () => {
    mockUpdate.mockRejectedValueOnce(new Error("db down"));
    const res = await PATCH(makeRequest(VALID), { params: Promise.resolve({ id: "p1" }) });
    expect(res.status).toBe(500);
  });
});
