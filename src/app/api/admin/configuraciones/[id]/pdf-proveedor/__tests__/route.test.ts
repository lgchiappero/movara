import { describe, it, expect, vi, beforeEach } from "vitest";

const { mockFindUnique, mockRenderToBuffer } = vi.hoisted(() => ({
  mockFindUnique: vi.fn(),
  mockRenderToBuffer: vi.fn().mockResolvedValue(Buffer.from("pdf-bytes")),
}));

vi.mock("@/lib/db", () => ({ db: { configuracionPedido: { findUnique: mockFindUnique } } }));
vi.mock("@react-pdf/renderer", () => ({ renderToBuffer: mockRenderToBuffer }));
vi.mock("@/lib/pdf/PedidoDocumentProveedor", () => ({ PedidoDocumentProveedor: vi.fn(() => "doc") }));

import { GET } from "../route";
import { NextRequest } from "next/server";

const CONFIG = {
  id: "p1",
  clienteNombre: "Juan García",
  updatedAt: new Date("2026-01-15T00:00:00.000Z"),
  materiales: null,
  numeroPedido: "MOV-2026-001",
  numeroFabrica: "FAB-01",
};

describe("GET /api/admin/configuraciones/[id]/pdf-proveedor", () => {
  beforeEach(() => vi.clearAllMocks());

  it("404 si la configuración no existe", async () => {
    mockFindUnique.mockResolvedValueOnce(null);
    const res = await GET(new NextRequest("http://localhost/x"), { params: Promise.resolve({ id: "no-existe" }) });
    expect(res.status).toBe(404);
    expect(mockRenderToBuffer).not.toHaveBeenCalled();
  });

  it("200 con el PDF y el nombre de archivo con prefijo 'pedido-proveedor-'", async () => {
    mockFindUnique.mockResolvedValueOnce(CONFIG);
    const res = await GET(new NextRequest("http://localhost/x"), { params: Promise.resolve({ id: "p1" }) });
    expect(res.status).toBe(200);
    expect(res.headers.get("Content-Type")).toBe("application/pdf");
    expect(res.headers.get("Content-Disposition")).toBe(
      'attachment; filename="pedido-proveedor-juan-garcía.pdf"'
    );
  });
});
