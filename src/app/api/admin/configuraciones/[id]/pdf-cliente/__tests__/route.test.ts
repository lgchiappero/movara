import { describe, it, expect, vi, beforeEach } from "vitest";

const { mockFindUnique, mockRenderToBuffer } = vi.hoisted(() => ({
  mockFindUnique: vi.fn(),
  mockRenderToBuffer: vi.fn().mockResolvedValue(Buffer.from("pdf-bytes")),
}));

vi.mock("@/lib/db", () => ({ db: { configuracionPedido: { findUnique: mockFindUnique } } }));
vi.mock("@react-pdf/renderer", () => ({ renderToBuffer: mockRenderToBuffer }));
vi.mock("@/lib/pdf/PedidoDocumentCliente", () => ({ PedidoDocumentCliente: vi.fn(() => "doc") }));

import { GET } from "../route";
import { PedidoDocumentCliente } from "@/lib/pdf/PedidoDocumentCliente";
import { NextRequest } from "next/server";

const CONFIG = {
  id: "p1",
  clienteNombre: "Juan García",
  updatedAt: new Date("2026-01-15T00:00:00.000Z"),
  materiales: null,
  numeroPedido: "MOV-2026-001",
  precioFinal: 10000,
  anticipo: 3000,
  saldoPendiente: 7000,
};

describe("GET /api/admin/configuraciones/[id]/pdf-cliente", () => {
  beforeEach(() => vi.clearAllMocks());

  it("404 si la configuración no existe", async () => {
    mockFindUnique.mockResolvedValueOnce(null);
    const res = await GET(new NextRequest("http://localhost/x"), { params: Promise.resolve({ id: "no-existe" }) });
    expect(res.status).toBe(404);
    expect(mockRenderToBuffer).not.toHaveBeenCalled();
  });

  it("200 con el PDF y el nombre de archivo con prefijo 'pedido-cliente-'", async () => {
    mockFindUnique.mockResolvedValueOnce(CONFIG);
    const res = await GET(new NextRequest("http://localhost/x"), { params: Promise.resolve({ id: "p1" }) });
    expect(res.status).toBe(200);
    expect(res.headers.get("Content-Type")).toBe("application/pdf");
    expect(res.headers.get("Content-Disposition")).toBe(
      'attachment; filename="pedido-cliente-juan-garcía.pdf"'
    );
  });

  it("pasa al PDF el desglose guardado con el pedido, sin recalcularlo", async () => {
    const desglose = { base: 25840, adicionales: [{ nombre: "Inodoro inteligente con bidet", precio: 580 }], aConsultar: ["Bañera — opción 1"], total: 26420 };
    mockFindUnique.mockResolvedValueOnce({ ...CONFIG, desgloseEstimado: desglose });
    await GET(new NextRequest("http://localhost/x"), { params: Promise.resolve({ id: "p1" }) });
    expect(vi.mocked(PedidoDocumentCliente).mock.calls[0][0].desglose).toEqual(desglose);
  });

  it("un pedido anterior al desglose va sin desglose", async () => {
    mockFindUnique.mockResolvedValueOnce({ ...CONFIG, desgloseEstimado: null });
    await GET(new NextRequest("http://localhost/x"), { params: Promise.resolve({ id: "p1" }) });
    expect(vi.mocked(PedidoDocumentCliente).mock.calls[0][0].desglose).toBeNull();
  });
});
