import { describe, it, expect } from "vitest";
import { buildStoragePath } from "@/lib/admin/storage";

describe("buildStoragePath", () => {
  it("incluye el scope, el id y el nombre de archivo saneado", () => {
    const path = buildStoragePath("pedidos", "pedido123", "comprobante final.pdf");
    expect(path).toMatch(/^pedidos\/pedido123\/[0-9a-f-]{36}-comprobante_final\.pdf$/);
  });

  it("dos llamadas con el mismo archivo generan paths distintos", () => {
    const a = buildStoragePath("pedidos", "pedido123", "doc.pdf");
    const b = buildStoragePath("pedidos", "pedido123", "doc.pdf");
    expect(a).not.toBe(b);
  });

  it("sanea caracteres fuera de [a-zA-Z0-9._-]", () => {
    const path = buildStoragePath("pedidos", "p1", "áéíóú ñ #$%.pdf");
    expect(path).not.toMatch(/[áéíóúñ#$%\s]/);
    expect(path.endsWith(".pdf")).toBe(true);
  });

  it("distintos scopes producen prefijos distintos", () => {
    const path = buildStoragePath("unidades", "u1", "doc.pdf");
    expect(path).toMatch(/^unidades\/u1\//);
  });
});
