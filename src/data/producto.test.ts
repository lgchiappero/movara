import { describe, it, expect } from "vitest";
import { PRODUCTO_SECCIONES, PRODUCTO_EXTRAS } from "@/data/producto";

describe("PRODUCTO_SECCIONES", () => {
  it("tiene al menos una sección", () => {
    expect(PRODUCTO_SECCIONES.length).toBeGreaterThan(0);
  });

  it("cada sección tiene número, título y descripción no vacíos", () => {
    for (const s of PRODUCTO_SECCIONES) {
      expect(s.numero.length).toBeGreaterThan(0);
      expect(s.titulo.length).toBeGreaterThan(0);
      expect(s.descripcion.length).toBeGreaterThan(0);
      expect(Array.isArray(s.beneficios)).toBe(true);
      expect(Array.isArray(s.grupos)).toBe(true);
    }
  });

  it("al menos una sección trae beneficios listados", () => {
    expect(PRODUCTO_SECCIONES.some((s) => s.beneficios.length > 0)).toBe(true);
  });

  it("los números de sección son únicos", () => {
    const numeros = PRODUCTO_SECCIONES.map((s) => s.numero);
    expect(new Set(numeros).size).toBe(numeros.length);
  });
});

describe("PRODUCTO_EXTRAS", () => {
  it("tiene al menos un extra con texto y precio", () => {
    expect(PRODUCTO_EXTRAS.length).toBeGreaterThan(0);
    for (const e of PRODUCTO_EXTRAS) {
      expect(e.texto.length).toBeGreaterThan(0);
      expect(e.precio.length).toBeGreaterThan(0);
    }
  });
});
