import { describe, it, expect, vi, beforeEach } from "vitest";

const { mockGetAdminUser, mockFindUnique, mockUpdate, mockRecalcular, mockTransaction } = vi.hoisted(() => ({
  mockGetAdminUser: vi.fn(),
  mockFindUnique: vi.fn(),
  mockUpdate: vi.fn(),
  mockRecalcular: vi.fn(),
  mockTransaction: vi.fn(),
}));

vi.mock("@/lib/db", () => ({ db: { $transaction: mockTransaction } }));
vi.mock("@/lib/admin/current-user", () => ({ getAdminUser: mockGetAdminUser }));
vi.mock("@/lib/clientes/servicio", () => ({ recalcularEstadoCliente: mockRecalcular }));

import { POST, DELETE } from "../route";
import { NextRequest } from "next/server";

const params = { params: Promise.resolve({ id: "p1" }) };

function req(method: "POST" | "DELETE", body?: unknown) {
  return new NextRequest("http://localhost/api/admin/configuraciones/p1/cancelar", {
    method,
    body: body === undefined ? undefined : typeof body === "string" ? body : JSON.stringify(body),
    headers: { "content-type": "application/json" },
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  mockGetAdminUser.mockResolvedValue({ id: "u1", nombre: "Vend", email: "v@x.com", rol: "vendedor" });
  mockUpdate.mockResolvedValue({ clienteId: "c1" });
  mockTransaction.mockImplementation((fn) => fn({ configuracionPedido: { findUnique: mockFindUnique, update: mockUpdate } }));
});

describe("POST — cancelar pedido", () => {
  it("401 sin sesión", async () => {
    mockGetAdminUser.mockResolvedValueOnce(null);
    expect((await POST(req("POST", {}), params)).status).toBe(401);
  });

  it("400 si el motivo es demasiado largo", async () => {
    expect((await POST(req("POST", { motivo: "x".repeat(501) }), params)).status).toBe(400);
  });

  it("cancela con motivo, guarda el estado anterior y recalcula el cliente", async () => {
    mockFindUnique.mockResolvedValueOnce({ estadoPedido: "presupuestado" });
    const res = await POST(req("POST", { motivo: "  Compró otra cosa " }), params);
    expect(res.status).toBe(200);
    const { data } = mockUpdate.mock.calls[0][0];
    expect(data).toMatchObject({
      estadoPedido: "cancelado",
      estadoAntesDeCancelar: "presupuestado",
      motivoCancelacion: "Compró otra cosa",
      canceladoPor: "v@x.com",
    });
    expect(data.fechaCancelacion).toBeInstanceOf(Date);
    expect(mockRecalcular).toHaveBeenCalledWith(expect.anything(), "c1");
  });

  it("sin body y sin cliente vinculado: motivo null y no recalcula", async () => {
    mockFindUnique.mockResolvedValueOnce({ estadoPedido: "consulta" });
    mockUpdate.mockResolvedValueOnce({ clienteId: null });
    expect((await POST(req("POST", "no-json"), params)).status).toBe(200);
    expect(mockUpdate.mock.calls[0][0].data.motivoCancelacion).toBeNull();
    expect(mockRecalcular).not.toHaveBeenCalled();
  });

  it("404 si no existe y 409 si ya estaba cancelado", async () => {
    mockFindUnique.mockResolvedValueOnce(null);
    expect((await POST(req("POST", {}), params)).status).toBe(404);
    mockFindUnique.mockResolvedValueOnce({ estadoPedido: "cancelado" });
    expect((await POST(req("POST", {}), params)).status).toBe(409);
    expect(mockUpdate).not.toHaveBeenCalled();
  });

  it("500 si falla la base", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    mockTransaction.mockRejectedValueOnce(new Error("db"));
    expect((await POST(req("POST", {}), params)).status).toBe(500);
  });
});

describe("DELETE — reactivar pedido", () => {
  it("401 sin sesión", async () => {
    mockGetAdminUser.mockResolvedValueOnce(null);
    expect((await DELETE(req("DELETE"), params)).status).toBe(401);
  });

  it("vuelve al estado que tenía, borra la cancelación y recalcula", async () => {
    mockFindUnique.mockResolvedValueOnce({ estadoPedido: "cancelado", estadoAntesDeCancelar: "presupuestado" });
    const res = await DELETE(req("DELETE"), params);
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true, estadoPedido: "presupuestado" });
    expect(mockUpdate.mock.calls[0][0].data).toEqual({
      estadoPedido: "presupuestado",
      estadoAntesDeCancelar: null,
      motivoCancelacion: null,
      fechaCancelacion: null,
      canceladoPor: null,
    });
    expect(mockRecalcular).toHaveBeenCalledWith(expect.anything(), "c1");
  });

  it("sin estado anterior válido vuelve a 'consulta'; sin cliente no recalcula", async () => {
    mockFindUnique.mockResolvedValueOnce({ estadoPedido: "cancelado", estadoAntesDeCancelar: null });
    mockUpdate.mockResolvedValueOnce({ clienteId: null });
    expect(await (await DELETE(req("DELETE"), params)).json()).toEqual({ ok: true, estadoPedido: "consulta" });
    expect(mockRecalcular).not.toHaveBeenCalled();
  });

  it("404 si no existe y 409 si no estaba cancelado", async () => {
    mockFindUnique.mockResolvedValueOnce(null);
    expect((await DELETE(req("DELETE"), params)).status).toBe(404);
    mockFindUnique.mockResolvedValueOnce({ estadoPedido: "consulta", estadoAntesDeCancelar: null });
    expect((await DELETE(req("DELETE"), params)).status).toBe(409);
  });

  it("500 si falla la base", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    mockTransaction.mockRejectedValueOnce(new Error("db"));
    expect((await DELETE(req("DELETE"), params)).status).toBe(500);
  });
});
