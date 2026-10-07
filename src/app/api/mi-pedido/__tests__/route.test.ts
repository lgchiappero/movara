import { describe, it, expect, vi, beforeEach } from "vitest";

const { mockFindUnique } = vi.hoisted(() => ({ mockFindUnique: vi.fn() }));
vi.mock("@/lib/db", () => ({ db: { configuracionPedido: { findUnique: mockFindUnique } } }));

import { POST } from "../route";
import { NextRequest } from "next/server";

const TOKEN = "a".repeat(64);

function req(body: unknown) {
  return new NextRequest("http://localhost/api/mi-pedido", {
    method: "POST",
    body: typeof body === "string" ? body : JSON.stringify(body),
    headers: { "content-type": "application/json" },
  });
}

beforeEach(() => vi.clearAllMocks());

describe("POST /api/mi-pedido", () => {
  it("rechaza el código de pedido correlativo (ya no da acceso)", async () => {
    const res = await POST(req({ codigo: "MOV-CONSULTA-2026-001" }));
    expect(res.status).toBe(404);
    expect(mockFindUnique).not.toHaveBeenCalled();
  });

  it("rechaza tokens mal formados y body inválido sin consultar la base", async () => {
    for (const body of [{ token: "MOV-2026-001" }, { token: "a".repeat(63) }, { token: "g".repeat(64) }, "no-json"]) {
      const res = await POST(req(body));
      expect(res.status).toBe(404);
    }
    expect(mockFindUnique).not.toHaveBeenCalled();
  });

  it("token inexistente da el mismo 404 genérico", async () => {
    mockFindUnique.mockResolvedValue(null);
    const malFormado = await (await POST(req({ token: "x" }))).json();
    const inexistente = await POST(req({ token: TOKEN }));
    expect(inexistente.status).toBe(404);
    expect(await inexistente.json()).toEqual(malFormado);
  });

  it("con token válido busca por token y devuelve el pedido", async () => {
    mockFindUnique.mockResolvedValue({
      numeroConsulta: "MOV-CONSULTA-2026-001",
      numeroPedido: null,
      clienteNombre: "Ana",
      modelo: "20ft",
      notasCliente: null,
      estadoPedido: "consulta",
      fechaConfirmacion: null,
      fechaProduccion: null,
      fechaDespacho: null,
      fechaArriboEstimado: null,
      fechaEntrega: null,
    });
    const res = await POST(req({ token: TOKEN }));
    expect(res.status).toBe(200);
    expect(mockFindUnique.mock.calls[0][0].where).toEqual({ tokenSeguimiento: TOKEN });
    const json = await res.json();
    expect(json.clienteNombre).toBe("Ana");
    expect(json).not.toHaveProperty("tokenSeguimiento");
  });

  it("modelo nulo se devuelve como null", async () => {
    mockFindUnique.mockResolvedValue({ clienteNombre: "Ana", modelo: null, estadoPedido: "consulta" });
    const json = await (await POST(req({ token: TOKEN }))).json();
    expect(json.modelo).toBeNull();
  });
});
