import { describe, it, expect, vi, beforeEach } from "vitest";

const { mockGetAdminUser, mockFindUnique, mockUpdate, mockFindUniqueOrThrow, mockRecalcular, mockTransaction } = vi.hoisted(() => ({
  mockGetAdminUser: vi.fn(),
  mockFindUnique: vi.fn(),
  mockUpdate: vi.fn(),
  mockFindUniqueOrThrow: vi.fn(),
  mockRecalcular: vi.fn(),
  mockTransaction: vi.fn(),
}));

vi.mock("@/lib/db", () => ({ db: { $transaction: mockTransaction } }));
vi.mock("@/lib/admin/current-user", () => ({ getAdminUser: mockGetAdminUser }));
vi.mock("@/lib/clientes/servicio", () => ({ recalcularEstadoCliente: mockRecalcular }));

import { PATCH } from "../route";
import { NextRequest } from "next/server";

const ADMIN = { id: "u1", nombre: "Admin", email: "a@x.com", rol: "admin" };
const params = { params: Promise.resolve({ id: "c1" }) };

function req(body: unknown) {
  return new NextRequest("http://localhost/api/admin/clientes/c1/estado", {
    method: "PATCH",
    body: typeof body === "string" ? body : JSON.stringify(body),
    headers: { "content-type": "application/json" },
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  mockGetAdminUser.mockResolvedValue(ADMIN);
  mockFindUnique.mockResolvedValue({ estadoAutomatico: "pedido_iniciado" });
  mockFindUniqueOrThrow.mockResolvedValue({ estado: "comprador", estadoManual: true });
  mockTransaction.mockImplementation((fn) =>
    fn({ cliente: { findUnique: mockFindUnique, update: mockUpdate, findUniqueOrThrow: mockFindUniqueOrThrow } })
  );
});

describe("PATCH /api/admin/clientes/[id]/estado", () => {
  it("401 sin sesión", async () => {
    mockGetAdminUser.mockResolvedValueOnce(null);
    expect((await PATCH(req({ estado: "comprador" }), params)).status).toBe(401);
  });

  it("400 con un estado inválido o un body roto", async () => {
    expect((await PATCH(req({ estado: "vip" }), params)).status).toBe(400);
    expect((await PATCH(req("x"), params)).status).toBe(400);
    expect(mockTransaction).not.toHaveBeenCalled();
  });

  it("cambio manual: guarda el estado marcado como manual con fecha y usuario", async () => {
    const res = await PATCH(req({ estado: "comprador" }), params);
    expect(res.status).toBe(200);
    expect((await res.json()).cliente).toEqual({ estado: "comprador", estadoManual: true });
    const { data } = mockUpdate.mock.calls[0][0];
    expect(data).toMatchObject({ estado: "comprador", estadoManual: true, estadoManualPor: "a@x.com" });
    expect(data.estadoManualEn).toBeInstanceOf(Date);
    expect(mockRecalcular).not.toHaveBeenCalled();
  });

  it("volver a automático: apaga el manual, repone el último automático y recalcula", async () => {
    const res = await PATCH(req({ automatico: true }), params);
    expect(res.status).toBe(200);
    expect(mockUpdate).toHaveBeenCalledWith({
      where: { id: "c1" },
      data: { estadoManual: false, estadoManualEn: null, estadoManualPor: null, estado: "pedido_iniciado" },
    });
    expect(mockRecalcular).toHaveBeenCalledWith(expect.anything(), "c1");
  });

  it("404 si el cliente no existe", async () => {
    mockFindUnique.mockResolvedValueOnce(null);
    expect((await PATCH(req({ estado: "comprador" }), params)).status).toBe(404);
    expect(mockUpdate).not.toHaveBeenCalled();
  });

  it("500 si falla la base", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    mockTransaction.mockRejectedValueOnce(new Error("db"));
    expect((await PATCH(req({ estado: "comprador" }), params)).status).toBe(500);
  });
});
