import { describe, it, expect, vi, beforeEach } from "vitest";

const { mockFindUnique, mockTransaction, mockBuscarOCrear, mockRecalcular, mockLeadUpdate, mockConfigUpdateMany } =
  vi.hoisted(() => ({
    mockFindUnique: vi.fn(),
    mockTransaction: vi.fn(),
    mockBuscarOCrear: vi.fn(),
    mockRecalcular: vi.fn(),
    mockLeadUpdate: vi.fn(),
    mockConfigUpdateMany: vi.fn(),
  }));

vi.mock("@/lib/db", () => ({
  db: {
    lead: { findUnique: mockFindUnique },
    $transaction: mockTransaction,
  },
}));
vi.mock("@/lib/clientes/servicio", () => ({
  buscarOCrearCliente: mockBuscarOCrear,
  recalcularEstadoCliente: mockRecalcular,
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
  telefono: "+54 9 11 1234-5678",
  email: "juan@x.com",
  provincia: "Santa Fe",
  etapa: "ganado",
  clienteId: null,
};

const params = { params: Promise.resolve({ id: "l1" }) };

describe("POST /api/admin/leads/[id]/convertir", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockTransaction.mockImplementation(async (cb) =>
      cb({ lead: { update: mockLeadUpdate }, configuracionPedido: { updateMany: mockConfigUpdateMany } })
    );
  });

  it("404 si el lead no existe", async () => {
    mockFindUnique.mockResolvedValueOnce(null);
    const res = await POST(makeRequest(), { params: Promise.resolve({ id: "no-existe" }) });
    expect(res.status).toBe(404);
  });

  it("400 si el lead no está en etapa 'ganado'", async () => {
    mockFindUnique.mockResolvedValueOnce({ ...LEAD_GANADO, etapa: "en_contacto" });
    const res = await POST(makeRequest(), params);
    expect(res.status).toBe(400);
    expect(mockTransaction).not.toHaveBeenCalled();
  });

  it("si el lead ya tiene cliente, solo responde con ese cliente: no duplica", async () => {
    mockFindUnique.mockResolvedValueOnce({ ...LEAD_GANADO, clienteId: "c9" });
    const res = await POST(makeRequest(), params);
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true, clienteId: "c9", yaVinculado: true });
    expect(mockTransaction).not.toHaveBeenCalled();
  });

  it("201 — crea el cliente, guarda lead.clienteId, vincula los pedidos del email y recalcula el estado", async () => {
    mockFindUnique.mockResolvedValueOnce(LEAD_GANADO);
    mockBuscarOCrear.mockResolvedValueOnce({ id: "c1", nuevo: true });
    const res = await POST(makeRequest(), params);
    expect(res.status).toBe(201);
    expect(await res.json()).toEqual({ ok: true, clienteId: "c1", yaVinculado: false });
    expect(mockBuscarOCrear).toHaveBeenCalledWith(expect.anything(), {
      nombre: "Juan",
      apellido: "García",
      dni: null,
      email: "juan@x.com",
      telefono: "+54 9 11 1234-5678",
      provincia: "Santa Fe",
    });
    expect(mockLeadUpdate).toHaveBeenCalledWith({
      where: { id: "l1" },
      data: { clienteId: "c1", emailNorm: "juan@x.com", telefonoNorm: "1112345678" },
    });
    expect(mockConfigUpdateMany).toHaveBeenCalledWith({
      where: { clienteEmail: "juan@x.com", leadId: null },
      data: { leadId: "l1" },
    });
    expect(mockConfigUpdateMany).toHaveBeenCalledWith({
      where: { clienteEmail: "juan@x.com", clienteId: null },
      data: { clienteId: "c1" },
    });
    expect(mockRecalcular).toHaveBeenCalledWith(expect.anything(), "c1");
  });

  it("200 — si ya había un cliente con el mismo email o teléfono, lo vincula", async () => {
    mockFindUnique.mockResolvedValueOnce({ ...LEAD_GANADO, email: null });
    mockBuscarOCrear.mockResolvedValueOnce({ id: "c2", nuevo: false });
    const res = await POST(makeRequest(), params);
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true, clienteId: "c2", yaVinculado: true });
    // Sin email no se vinculan pedidos por email.
    expect(mockConfigUpdateMany).not.toHaveBeenCalled();
  });

  it("500 si falla la transacción", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    mockFindUnique.mockResolvedValueOnce(LEAD_GANADO);
    mockBuscarOCrear.mockRejectedValueOnce(new Error("db"));
    const res = await POST(makeRequest(), params);
    expect(res.status).toBe(500);
  });
});
