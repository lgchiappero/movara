import { describe, it, expect, vi, beforeEach } from "vitest";

const { mockFindUnique, mockTransaction, mockClienteCreate, mockLeadUpdate, mockConfigUpdateMany } = vi.hoisted(() => ({
  mockFindUnique: vi.fn(),
  mockTransaction: vi.fn(),
  mockClienteCreate: vi.fn(),
  mockLeadUpdate: vi.fn(),
  mockConfigUpdateMany: vi.fn(),
}));

vi.mock("@/lib/db", () => ({
  db: {
    lead: { findUnique: mockFindUnique },
    $transaction: mockTransaction,
  },
}));

import { POST } from "../route";
import { NextRequest } from "next/server";

function makeRequest(): NextRequest {
  return new NextRequest("http://localhost/api/admin/leads/l1/convertir", { method: "POST" });
}

const LEAD_GANADO = {
  id: "l1",
  nombre: "Juan",
  apellido: "García",
  dni: null,
  telefono: "123",
  email: "juan@x.com",
  etapa: "ganado",
  clienteId: null,
};

describe("POST /api/admin/leads/[id]/convertir", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockTransaction.mockImplementation(async (cb) =>
      cb({
        cliente: { create: mockClienteCreate },
        lead: { update: mockLeadUpdate },
        configuracionPedido: { updateMany: mockConfigUpdateMany },
      })
    );
  });

  it("404 si el lead no existe", async () => {
    mockFindUnique.mockResolvedValueOnce(null);
    const res = await POST(makeRequest(), { params: Promise.resolve({ id: "no-existe" }) });
    expect(res.status).toBe(404);
    expect(mockTransaction).not.toHaveBeenCalled();
  });

  it("400 si el lead no está en etapa 'ganado'", async () => {
    mockFindUnique.mockResolvedValueOnce({ ...LEAD_GANADO, etapa: "en_contacto" });
    const res = await POST(makeRequest(), { params: Promise.resolve({ id: "l1" }) });
    expect(res.status).toBe(400);
    expect(mockTransaction).not.toHaveBeenCalled();
  });

  it("409 si el lead ya fue convertido antes (clienteId ya seteado)", async () => {
    mockFindUnique.mockResolvedValueOnce({ ...LEAD_GANADO, clienteId: "cli-existente" });
    const res = await POST(makeRequest(), { params: Promise.resolve({ id: "l1" }) });
    expect(res.status).toBe(409);
    expect(mockTransaction).not.toHaveBeenCalled();
  });

  it("201 — crea el cliente, guarda lead.clienteId y vincula pedidos existentes por email", async () => {
    mockFindUnique.mockResolvedValueOnce(LEAD_GANADO);
    mockClienteCreate.mockResolvedValueOnce({ id: "cli1" });

    const res = await POST(makeRequest(), { params: Promise.resolve({ id: "l1" }) });

    expect(res.status).toBe(201);
    expect((await res.json()).clienteId).toBe("cli1");
    expect(mockClienteCreate).toHaveBeenCalledWith({
      data: { nombre: "Juan García", dni: null, telefono: "123", email: "juan@x.com" },
    });
    expect(mockLeadUpdate).toHaveBeenCalledWith({ where: { id: "l1" }, data: { clienteId: "cli1" } });
    expect(mockConfigUpdateMany).toHaveBeenCalledWith({
      where: { clienteEmail: "juan@x.com", leadId: null },
      data: { leadId: "l1" },
    });
  });

  it("sin email en el lead, no intenta vincular pedidos existentes", async () => {
    mockFindUnique.mockResolvedValueOnce({ ...LEAD_GANADO, email: null });
    mockClienteCreate.mockResolvedValueOnce({ id: "cli1" });

    await POST(makeRequest(), { params: Promise.resolve({ id: "l1" }) });

    expect(mockConfigUpdateMany).not.toHaveBeenCalled();
  });

  it("sin apellido, el nombre del cliente usa solo el nombre", async () => {
    mockFindUnique.mockResolvedValueOnce({ ...LEAD_GANADO, apellido: null });
    mockClienteCreate.mockResolvedValueOnce({ id: "cli1" });

    await POST(makeRequest(), { params: Promise.resolve({ id: "l1" }) });

    expect(mockClienteCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({ nombre: "Juan" }),
    });
  });

  it("500 si la transacción falla", async () => {
    mockFindUnique.mockResolvedValueOnce(LEAD_GANADO);
    mockTransaction.mockRejectedValueOnce(new Error("db down"));
    const res = await POST(makeRequest(), { params: Promise.resolve({ id: "l1" }) });
    expect(res.status).toBe(500);
  });
});
