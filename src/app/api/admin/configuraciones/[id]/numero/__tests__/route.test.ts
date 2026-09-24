import { describe, it, expect, vi, beforeEach } from "vitest";

const { mockFindUnique, mockEnsureNumeroPedido } = vi.hoisted(() => ({
  mockFindUnique: vi.fn(),
  mockEnsureNumeroPedido: vi.fn(),
}));

vi.mock("@/lib/db", () => ({ db: { configuracionPedido: { findUnique: mockFindUnique } } }));
vi.mock("@/lib/pedido/numero-pedido", () => ({ ensureNumeroPedido: mockEnsureNumeroPedido }));

import { POST } from "../route";
import { NextRequest } from "next/server";

function makeRequest(): NextRequest {
  return new NextRequest("http://localhost/api/admin/configuraciones/p1/numero", { method: "POST" });
}

describe("POST /api/admin/configuraciones/[id]/numero", () => {
  beforeEach(() => vi.clearAllMocks());

  it("404 si la configuración no existe", async () => {
    mockFindUnique.mockResolvedValueOnce(null);
    const res = await POST(makeRequest(), { params: Promise.resolve({ id: "no-existe" }) });
    expect(res.status).toBe(404);
    expect(mockEnsureNumeroPedido).not.toHaveBeenCalled();
  });

  it("400 si el pedido todavía no está confirmado", async () => {
    mockFindUnique.mockResolvedValueOnce({ id: "p1", estadoPedido: "presupuestado" });
    const res = await POST(makeRequest(), { params: Promise.resolve({ id: "p1" }) });
    expect(res.status).toBe(400);
    expect(mockEnsureNumeroPedido).not.toHaveBeenCalled();
  });

  it("200 y genera el número cuando el pedido está confirmado", async () => {
    mockFindUnique.mockResolvedValueOnce({ id: "p1", estadoPedido: "confirmado" });
    mockEnsureNumeroPedido.mockResolvedValueOnce("MOV-2026-001");
    const res = await POST(makeRequest(), { params: Promise.resolve({ id: "p1" }) });
    expect(res.status).toBe(200);
    expect((await res.json()).numeroPedido).toBe("MOV-2026-001");
    expect(mockEnsureNumeroPedido).toHaveBeenCalledWith("p1");
  });
});
