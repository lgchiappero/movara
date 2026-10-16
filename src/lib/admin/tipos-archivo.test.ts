import { describe, it, expect } from "vitest";
import { claseDeArchivo, errorDeArchivo, formatearMB, TIPOS_MOVARA, TIPOS_PEDIDOS } from "./tipos-archivo";
import { ALLOWED_MIME_TYPES, ALLOWED_MIME_TYPES_MOVARA } from "./file-validation";

const MB = 1024 * 1024;

describe("tipos-archivo", () => {
  it("usa las mismas listas que valida el servidor", () => {
    expect(TIPOS_PEDIDOS.mimes).toBe(ALLOWED_MIME_TYPES);
    expect(TIPOS_MOVARA.mimes).toBe(ALLOWED_MIME_TYPES_MOVARA);
    expect(TIPOS_PEDIDOS.maxBytes).toBe(20 * MB);
  });

  it("formatearMB: siempre en MB, coma decimal", () => {
    expect(formatearMB(24 * MB)).toBe("24 MB");
    expect(formatearMB(20 * MB)).toBe("20 MB");
    expect(formatearMB(2.4 * MB)).toBe("2,4 MB");
    expect(formatearMB(0.05 * MB)).toBe("0,05 MB");
    expect(formatearMB(10)).toBe("0,01 MB");
  });

  it("errorDeArchivo: tipo, vacío y tamaño", () => {
    expect(errorDeArchivo({ name: "a.pdf", size: MB, type: "application/pdf" }, TIPOS_MOVARA)).toBeNull();
    expect(errorDeArchivo({ name: "a.pdf", size: 24 * MB, type: "application/pdf" }, TIPOS_MOVARA)).toBe("El archivo pesa 24 MB. El máximo es 20 MB.");
    expect(errorDeArchivo({ name: "a.pdf", size: 0, type: "application/pdf" }, TIPOS_MOVARA)).toBe('"a.pdf" está vacío.');
    expect(errorDeArchivo({ name: "c.docx", size: 10, type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document" }, TIPOS_PEDIDOS)).toBe(
      '"c.docx" no es un tipo de archivo permitido. Subí PDF, JPG, PNG o Excel.'
    );
    // Sin tipo MIME (algunos sistemas no lo informan): se reconoce por la extensión.
    expect(errorDeArchivo({ name: "PLANILLA.XLSX", size: 10, type: "" }, TIPOS_PEDIDOS)).toBeNull();
    expect(errorDeArchivo({ name: "sin-extension", size: 10, type: "" }, TIPOS_PEDIDOS)).toMatch(/no es un tipo/);
  });

  it("claseDeArchivo: pdf, imagen u otro (por tipo o extensión)", () => {
    expect(claseDeArchivo({ name: "a", type: "application/pdf" })).toBe("pdf");
    expect(claseDeArchivo({ name: "a.PDF", type: "" })).toBe("pdf");
    expect(claseDeArchivo({ name: "a", type: "image/png" })).toBe("imagen");
    expect(claseDeArchivo({ name: "a.jpeg", type: "" })).toBe("imagen");
    expect(claseDeArchivo({ name: "a.xlsx", type: "" })).toBe("otro");
  });
});
