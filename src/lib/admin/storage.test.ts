import { describe, it, expect } from "vitest";
import { buildStoragePath } from "@/lib/admin/storage";

describe("buildStoragePath", () => {
  it("incluye el pedidoId y el nombre de archivo saneado", () => {
    const path = buildStoragePath("pedido123", "comprobante final.pdf");
    expect(path).toMatch(/^pedidos\/pedido123\/[0-9a-f-]{36}-comprobante_final\.pdf$/);
  });

  it("dos llamadas con el mismo archivo generan paths distintos", () => {
    const a = buildStoragePath("pedido123", "doc.pdf");
    const b = buildStoragePath("pedido123", "doc.pdf");
    expect(a).not.toBe(b);
  });

  it("sanea caracteres fuera de [a-zA-Z0-9._-]", () => {
    const path = buildStoragePath("p1", "áéíóú ñ #$%.pdf");
    expect(path).not.toMatch(/[áéíóúñ#$%\s]/);
    expect(path.endsWith(".pdf")).toBe(true);
  });
});
