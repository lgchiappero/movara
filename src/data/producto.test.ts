import { describe, it, expect } from "vitest";
import { PRODUCTO_SECCIONES, PRODUCTO_EXTRAS, getProductoExtras } from "@/data/producto";

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

describe("extras de la ficha técnica", () => {
  it("sin precios en Sanity muestra los precios del fallback y el resto a consultar", () => {
    expect(getProductoExtras(null)).toEqual([
      { texto: "Balcón de 2 m con sobretecho, deck y barandas", precio: "+USD 3.100" },
      { texto: "Sobretecho completo (balcón y toda la unidad)", precio: "A consultar" },
      { texto: "Techo a dos aguas", precio: "A consultar" },
      { texto: "Pared de vidrio (muro cortina)", precio: "A consultar" },
      { texto: "Bañera en lugar de ducha", precio: "A consultar" },
      { texto: "Inodoro inteligente con bidet", precio: "+USD 580" },
      { texto: "Piso SPC 4 mm en lugar de PVC", precio: "+USD 390" },
      { texto: "Fachada de panel metálico labrado", precio: "+USD 950" },
      { texto: "Pre-instalación lavarropas", precio: "A consultar" },
    ]);
  });

  it("lee los precios de la misma fuente que el configurador (Sanity)", () => {
    const extras = getProductoExtras({ preciosExtras: [{ nombre: "Inodoro inteligente con bidet", precio: 600 }] });
    expect(extras.find((e) => e.texto.startsWith("Inodoro"))?.precio).toBe("+USD 600");
    expect(extras.find((e) => e.texto.startsWith("Piso SPC"))?.precio).toBe("+USD 390");
  });

  it("no ofrece el kit solar", () => {
    expect(PRODUCTO_EXTRAS.some((e) => /solar/i.test(e.texto))).toBe(false);
  });
});
