import { describe, it, expect, vi, beforeEach } from "vitest";

const { mockCreate } = vi.hoisted(() => ({ mockCreate: vi.fn() }));
vi.mock("@/lib/db", () => ({ db: { lead: { create: mockCreate } } }));

import { POST } from "../route";
import { NextRequest } from "next/server";

function makeRequest(body: unknown): NextRequest {
  return new NextRequest("http://localhost/api/admin/leads", {
    method: "POST",
    body: JSON.stringify(body),
    headers: { "content-type": "application/json" },
  });
}

const VALID = {
  nombre: "Juan García",
  email: null,
  telefono: null,
  origen: "web",
  modeloInteres: "Flex 18",
  notasVenta: null,
  vendedorId: null,
  valorEstimado: null,
};

describe("POST /api/admin/leads", () => {
  beforeEach(() => vi.clearAllMocks());

  it("crea el lead en etapa 'nuevo' y devuelve 201 con el id", async () => {
    mockCreate.mockResolvedValueOnce({ id: "lead1" });
    const res = await POST(makeRequest(VALID));
    expect(res.status).toBe(201);
    const json = await res.json();
    expect(json).toEqual({ ok: true, id: "lead1" });
    expect(mockCreate).toHaveBeenCalledWith({
      data: {
        nombre: "Juan García",
        email: null,
        telefono: "",
        origen: "web",
        modeloInteres: "Flex 18",
        notasVenta: null,
        vendedorId: null,
        valorEstimado: null,
        etapa: "nuevo",
      },
      select: { id: true },
    });
  });

  it("400 si el body no es JSON válido", async () => {
    const req = new NextRequest("http://localhost/api/admin/leads", {
      method: "POST",
      body: "no-es-json",
      headers: { "content-type": "application/json" },
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
    expect(mockCreate).not.toHaveBeenCalled();
  });

  it("400 si falta el nombre", async () => {
    const res = await POST(makeRequest({ ...VALID, nombre: "" }));
    expect(res.status).toBe(400);
    expect(mockCreate).not.toHaveBeenCalled();
  });

  it("400 si el origen no está en el catálogo", async () => {
    const res = await POST(makeRequest({ ...VALID, origen: "no-existe" }));
    expect(res.status).toBe(400);
    expect(mockCreate).not.toHaveBeenCalled();
  });

  it("400 si el modelo de interés no está en el catálogo", async () => {
    const res = await POST(makeRequest({ ...VALID, modeloInteres: "Flex 99" }));
    expect(res.status).toBe(400);
    expect(mockCreate).not.toHaveBeenCalled();
  });

  it("acepta la creación mínima sin teléfono ni email (se guarda telefono '')", async () => {
    mockCreate.mockResolvedValueOnce({ id: "lead2" });
    const res = await POST(makeRequest({ ...VALID, email: null, telefono: null }));
    expect(res.status).toBe(201);
    expect(mockCreate).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ telefono: "" }) })
    );
  });

  it("500 si la DB falla", async () => {
    mockCreate.mockRejectedValueOnce(new Error("db down"));
    const res = await POST(makeRequest(VALID));
    expect(res.status).toBe(500);
  });
});
