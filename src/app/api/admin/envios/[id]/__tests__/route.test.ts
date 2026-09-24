import { describe, it, expect, vi, beforeEach } from "vitest";

const { mockUpdate } = vi.hoisted(() => ({ mockUpdate: vi.fn() }));
vi.mock("@/lib/db", () => ({ db: { envio: { update: mockUpdate } } }));

import { PATCH } from "../route";
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
