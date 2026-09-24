import { describe, it, expect } from "vitest";
import { FAQ_CATEGORIES, FAQ_CATEGORY_COLORS } from "@/data/faq";

describe("FAQ_CATEGORIES", () => {
  it("tiene al menos una categoría", () => {
    expect(FAQ_CATEGORIES.length).toBeGreaterThan(0);
  });

  it("cada categoría tiene título y al menos una pregunta", () => {
    for (const cat of FAQ_CATEGORIES) {
      expect(cat.titulo.length).toBeGreaterThan(0);
      expect(cat.preguntas.length).toBeGreaterThan(0);
    }
  });

  it("cada pregunta tiene pregunta y respuesta no vacías", () => {
    for (const cat of FAQ_CATEGORIES) {
      for (const p of cat.preguntas) {
        expect(p.pregunta.length).toBeGreaterThan(0);
        expect(p.respuesta.length).toBeGreaterThan(0);
      }
    }
  });

  it("cuando una pregunta trae tabla, la tabla tiene columnas y filas consistentes", () => {
    const conTabla = FAQ_CATEGORIES.flatMap((c) => c.preguntas).filter((p) => p.tabla);
    expect(conTabla.length).toBeGreaterThan(0);
    for (const p of conTabla) {
      const tabla = p.tabla!;
      expect(tabla.columnas.length).toBeGreaterThan(0);
      for (const fila of tabla.filas) {
        expect(fila.length).toBe(tabla.columnas.length);
      }
    }
  });
});

describe("FAQ_CATEGORY_COLORS", () => {
  it("tiene al menos una entrada por categoría", () => {
    expect(FAQ_CATEGORY_COLORS.length).toBeGreaterThanOrEqual(FAQ_CATEGORIES.length);
  });
});
