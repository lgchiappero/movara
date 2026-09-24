import { describe, it, expect, vi, beforeEach } from "vitest";

const { mockTransaction, mockCreate, mockGenerateNumeroConsulta } = vi.hoisted(() => ({
  mockTransaction: vi.fn(),
  mockCreate: vi.fn(),
  mockGenerateNumeroConsulta: vi.fn().mockResolvedValue("MOV-CONSULTA-2026-001"),
}));

vi.mock("@/lib/db", () => ({
  db: { $transaction: mockTransaction },
}));
vi.mock("@/lib/pedido/numero-consulta", () => ({ generateNumeroConsulta: mockGenerateNumeroConsulta }));

import { POST } from "../route";
import { NextRequest } from "next/server";

function makeRequest(body: unknown): NextRequest {
  return new NextRequest("http://localhost/api/admin/configuraciones", {
    method: "POST",
    body: JSON.stringify(body),
    headers: { "content-type": "application/json" },
  });
}

const VALID = {
  clienteNombre: "Juan García",
  tipoCliente: "particular",
  clienteWhatsapp: "+5491112345678",
};

describe("POST /api/admin/configuraciones", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockTransaction.mockImplementation(async (cb) => cb({ configuracionPedido: { create: mockCreate } }));
  });

  it("crea el pedido con número de consulta generado y devuelve 201", async () => {
    mockCreate.mockResolvedValueOnce({ id: "p1", numeroConsulta: "MOV-CONSULTA-2026-001" });
    const res = await POST(makeRequest(VALID));
    expect(res.status).toBe(201);
    const json = await res.json();
    expect(json.numeroConsulta).toBe("MOV-CONSULTA-2026-001");
    expect(mockCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({ clienteNombre: "Juan García", numeroConsulta: "MOV-CONSULTA-2026-001" }),
    });
  });

  it("400 si el body no es JSON válido", async () => {
    const req = new NextRequest("http://localhost/api/admin/configuraciones", {
      method: "POST",
      body: "no-es-json",
      headers: { "content-type": "application/json" },
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it("400 si falta clienteNombre", async () => {
    const res = await POST(makeRequest({ ...VALID, clienteNombre: undefined }));
    expect(res.status).toBe(400);
    expect(mockTransaction).not.toHaveBeenCalled();
  });

  it("500 si la transacción falla", async () => {
    mockTransaction.mockRejectedValueOnce(new Error("db down"));
    const res = await POST(makeRequest(VALID));
    expect(res.status).toBe(500);
  });
});
