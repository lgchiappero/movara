import { describe, it, expect, vi, beforeEach } from "vitest";

const { mockUpdate } = vi.hoisted(() => ({ mockUpdate: vi.fn() }));
vi.mock("@/lib/db", () => ({ db: { lead: { update: mockUpdate } } }));

import { PATCH } from "../route";
import { NextRequest } from "next/server";

function makeRequest(body: unknown): NextRequest {
  return new NextRequest("http://localhost/api/admin/leads/l1/pipeline", {
    method: "PATCH",
    body: typeof body === "string" ? body : JSON.stringify(body),
    headers: { "content-type": "application/json" },
  });
}

const VALID = {
  etapa: "en_contacto",
  origen: "instagram",
  vendedorId: "u1",
  notasVenta: "Llamar el lunes",
  motivoPerdida: null,
  valorEstimado: 15000,
};

describe("PATCH /api/admin/leads/[id]/pipeline", () => {
  beforeEach(() => vi.clearAllMocks());

  it("actualiza el lead y devuelve 200", async () => {
    mockUpdate.mockResolvedValueOnce({ id: "l1", ...VALID });
    const res = await PATCH(makeRequest(VALID), { params: Promise.resolve({ id: "l1" }) });
    expect(res.status).toBe(200);
    expect(mockUpdate).toHaveBeenCalledWith({ where: { id: "l1" }, data: VALID });
  });

  it("400 si el body no es JSON válido", async () => {
    const res = await PATCH(makeRequest("no-es-json"), { params: Promise.resolve({ id: "l1" }) });
    expect(res.status).toBe(400);
    expect(mockUpdate).not.toHaveBeenCalled();
  });

  it("400 si etapa es 'perdido' sin motivoPerdida", async () => {
    const res = await PATCH(makeRequest({ ...VALID, etapa: "perdido", motivoPerdida: null }), {
      params: Promise.resolve({ id: "l1" }),
    });
    expect(res.status).toBe(400);
    expect(mockUpdate).not.toHaveBeenCalled();
  });

  it("500 si la DB falla", async () => {
    mockUpdate.mockRejectedValueOnce(new Error("db down"));
    const res = await PATCH(makeRequest(VALID), { params: Promise.resolve({ id: "l1" }) });
    expect(res.status).toBe(500);
  });
});
