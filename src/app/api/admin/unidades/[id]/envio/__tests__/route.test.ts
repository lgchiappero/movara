import { describe, it, expect, vi, beforeEach } from "vitest";

const { mockUpdate } = vi.hoisted(() => ({
  mockUpdate: vi.fn(),
}));

vi.mock("@/lib/db", () => ({
  db: { unidad: { update: mockUpdate } },
}));

import { PATCH } from "../route";
import { NextRequest } from "next/server";

function makeRequest(body: unknown): NextRequest {
  return new NextRequest("http://localhost/api/admin/unidades/u1/envio", {
    method: "PATCH",
    body: JSON.stringify(body),
    headers: { "content-type": "application/json" },
  });
}

describe("PATCH /api/admin/unidades/[id]/envio", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("asocia la unidad a un envío", async () => {
    mockUpdate.mockResolvedValueOnce({ id: "u1", envioId: "e1" });

    const res = await PATCH(makeRequest({ envioId: "e1" }), {
      params: Promise.resolve({ id: "u1" }),
    });

    expect(res.status).toBe(200);
    expect(mockUpdate).toHaveBeenCalledWith({ where: { id: "u1" }, data: { envioId: "e1" } });
  });

  it("desasocia la unidad (envioId null)", async () => {
    mockUpdate.mockResolvedValueOnce({ id: "u1", envioId: null });

    const res = await PATCH(makeRequest({ envioId: null }), {
      params: Promise.resolve({ id: "u1" }),
    });

    expect(res.status).toBe(200);
    expect(mockUpdate).toHaveBeenCalledWith({ where: { id: "u1" }, data: { envioId: null } });
  });

  it("trata un string vacío como null (mismo criterio que stringOrNull)", async () => {
    mockUpdate.mockResolvedValueOnce({ id: "u1", envioId: null });

    await PATCH(makeRequest({ envioId: "" }), { params: Promise.resolve({ id: "u1" }) });

    expect(mockUpdate).toHaveBeenCalledWith({ where: { id: "u1" }, data: { envioId: null } });
  });

  it("400 si el body no es JSON válido", async () => {
    const req = new NextRequest("http://localhost/api/admin/unidades/u1/envio", {
      method: "PATCH",
      body: "no-es-json",
      headers: { "content-type": "application/json" },
    });
    const res = await PATCH(req, { params: Promise.resolve({ id: "u1" }) });
    expect(res.status).toBe(400);
  });

  it("400 si falta envioId del body", async () => {
    const res = await PATCH(makeRequest({}), { params: Promise.resolve({ id: "u1" }) });
    expect(res.status).toBe(400);
    expect(mockUpdate).not.toHaveBeenCalled();
  });

  it("500 si la DB falla", async () => {
    mockUpdate.mockRejectedValueOnce(new Error("db down"));
    const res = await PATCH(makeRequest({ envioId: "e1" }), { params: Promise.resolve({ id: "u1" }) });
    expect(res.status).toBe(500);
  });
});
