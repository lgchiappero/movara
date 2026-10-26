import { describe, it, expect, vi, beforeEach } from "vitest";

const { mockTransaction, mockCreate, mockGenerateNumeroConsulta, mockRegistrar } = vi.hoisted(() => ({
  mockRegistrar: vi.fn().mockResolvedValue({ clienteId: "c1", leadId: "l1" }),
  mockTransaction: vi.fn(),
  mockCreate: vi.fn(),
  mockGenerateNumeroConsulta: vi.fn().mockResolvedValue("MOV-CONSULTA-2026-001"),
}));

vi.mock("@/lib/db", () => ({
  db: { $transaction: mockTransaction },
}));
vi.mock("@/lib/pedido/numero-consulta", () => ({ generateNumeroConsulta: mockGenerateNumeroConsulta }));
vi.mock("@/lib/clientes/servicio", () => ({
  conSavepoint: (_tx: unknown, _nombre: string, fn: () => Promise<unknown>) => fn(),
  registrarContacto: mockRegistrar,
}));

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

  it("crea o reutiliza cliente y lead para el pedido manual", async () => {
    mockCreate.mockResolvedValueOnce({ id: "p1", numeroConsulta: "MOV-CONSULTA-2026-001" });
    await POST(makeRequest({ ...VALID, clienteEmail: "juan@x.com", provincia: "Santa Fe" }));
    expect(mockRegistrar).toHaveBeenCalledWith(
      expect.anything(),
      {
        nombre: "Juan García",
        email: "juan@x.com",
        telefono: "+5491112345678",
        tipoCliente: "particular",
        razonSocial: null,
        provincia: "Santa Fe",
      },
      { tipo: "pedido", pedidoId: "p1", numeroConsulta: "MOV-CONSULTA-2026-001" }
    );
  });

  it("si falla el alta del cliente, el pedido se crea igual (201) y queda en el log", async () => {
    const log = vi.spyOn(console, "error").mockImplementation(() => {});
    mockCreate.mockResolvedValueOnce({ id: "p1", numeroConsulta: "MOV-CONSULTA-2026-001" });
    mockRegistrar.mockRejectedValueOnce(new Error("db"));
    const res = await POST(makeRequest(VALID));
    expect(res.status).toBe(201);
    expect(log.mock.calls[0][0]).toContain("No se pudo vincular cliente y lead");
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
