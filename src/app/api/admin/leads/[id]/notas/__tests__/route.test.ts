import { describe, it, expect, vi, beforeEach } from "vitest";

const { mockUpdate } = vi.hoisted(() => ({ mockUpdate: vi.fn() }));
vi.mock("@/lib/db", () => ({ db: { lead: { update: mockUpdate } } }));

import { PATCH } from "../route";
import { NextRequest } from "next/server";

function makeRequest(body: unknown): NextRequest {
  return new NextRequest("http://localhost/api/admin/leads/l1/notas", {
    method: "PATCH",
    body: typeof body === "string" ? body : JSON.stringify(body),
    headers: { "content-type": "application/json" },
  });
}

describe("PATCH /api/admin/leads/[id]/notas", () => {
  beforeEach(() => vi.clearAllMocks());

  it("guarda la nota y devuelve 200", async () => {
    mockUpdate.mockResolvedValueOnce({ id: "l1", notasVenta: "Llamar el lunes" });
    const res = await PATCH(makeRequest({ notasVenta: "Llamar el lunes" }), {
      params: Promise.resolve({ id: "l1" }),
    });
    expect(res.status).toBe(200);
    expect(mockUpdate).toHaveBeenCalledWith({ where: { id: "l1" }, data: { notasVenta: "Llamar el lunes" } });
  });

  it("string vacío se guarda como null", async () => {
    mockUpdate.mockResolvedValueOnce({ id: "l1", notasVenta: null });
    await PATCH(makeRequest({ notasVenta: "" }), { params: Promise.resolve({ id: "l1" }) });
    expect(mockUpdate).toHaveBeenCalledWith({ where: { id: "l1" }, data: { notasVenta: null } });
  });

  it("400 si el body no es JSON válido", async () => {
    const res = await PATCH(makeRequest("no-es-json"), { params: Promise.resolve({ id: "l1" }) });
    expect(res.status).toBe(400);
    expect(mockUpdate).not.toHaveBeenCalled();
  });

  it("400 si falta notasVenta del body", async () => {
    const res = await PATCH(makeRequest({}), { params: Promise.resolve({ id: "l1" }) });
    expect(res.status).toBe(400);
  });

  it("500 si la DB falla", async () => {
    mockUpdate.mockRejectedValueOnce(new Error("db down"));
    const res = await PATCH(makeRequest({ notasVenta: "x" }), { params: Promise.resolve({ id: "l1" }) });
    expect(res.status).toBe(500);
  });
});
