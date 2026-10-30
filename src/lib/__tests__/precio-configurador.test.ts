import { describe, it, expect, vi } from "vitest";

vi.mock("next/image", () => ({ default: () => null }));

import { calcularPrecio, toDesgloseEstimado, parseDesgloseEstimado } from "@/lib/precio-configurador";
import { calcularPrecio as calcularPrecioDelComponente } from "@/components/configurador/ConfiguradorMovara";

const BASE_38 = 38 * 680;

// Los 4 extras con precio: balcón con sobretecho solo en el balcón, fachada,
// inodoro inteligente y piso SPC.
const CUATRO_EXTRAS = {
  balcon: "frontal",
  techoBalcon: "solo-balcon",
  exterior: "premium-01-gris-lineas",
  inodoro: "inteligente-bidet",
  piso: "spc-8917",
};

describe("calcularPrecio — precio base por m²", () => {
  it("sin precio cargado en Sanity usa USD 680 por m²", () => {
    expect(calcularPrecio({ modelo: "10ft", materiales: {}, precios: null })).toEqual({ base: 18 * 680, adicionales: [], total: 18 * 680, aConsultar: [] });
    expect(calcularPrecio({ modelo: "20ft", materiales: {}, precios: {} }).base).toBe(BASE_38);
    expect(calcularPrecio({ modelo: "40ft", materiales: {}, precios: { precioBaseM2: null } }).base).toBe(77 * 680);
  });

  it("si Sanity tiene precioBaseM2, usa ese valor", () => {
    expect(calcularPrecio({ modelo: "20ft", materiales: {}, precios: { precioBaseM2: 700 } }).base).toBe(38 * 700);
  });

  it("sin modelo elegido el precio es 0", () => {
    expect(calcularPrecio({ modelo: null, materiales: {}, precios: null }).total).toBe(0);
  });

  it("el configurador usa el mismo cálculo", () => {
    expect(calcularPrecioDelComponente).toBe(calcularPrecio);
  });
});

describe("calcularPrecio — extras con precio", () => {
  it("los 4 extras con precio suman base + 3.100 + 950 + 580 + 390 (= base + 5.020) sin nada cargado en Sanity", () => {
    const r = calcularPrecio({ modelo: "20ft", materiales: CUATRO_EXTRAS, precios: null });
    expect(r.adicionales).toEqual([
      { key: "exterior", nombre: "Panel metálico labrado: Gris con líneas", precio: 950 },
      { key: "piso", nombre: "Piso SPC 4 mm: 8917", precio: 390 },
      { key: "inodoro", nombre: "Inodoro inteligente con bidet", precio: 580 },
      { key: "balcon", nombre: "Balcón frontal de 2 m con sobretecho, deck y barandas", precio: 3100 },
    ]);
    expect(r.total).toBe(BASE_38 + 5020);
    expect(r.aConsultar).toEqual([]);
  });

  it("el precio cargado en Sanity pisa el fallback; lo que no está cargado usa el fallback", () => {
    const r = calcularPrecio({
      modelo: "20ft",
      materiales: CUATRO_EXTRAS,
      precios: { precioAdicionalDefault: 10, preciosExtras: [{ nombre: "Panel metálico labrado", precio: 1000 }, { nombre: "Piso SPC 4 mm", precio: null }] },
    });
    expect(r.adicionales.map((a) => a.precio)).toEqual([1000, 390, 580, 3100]);
  });

  it("el balcón lateral también cuesta 3.100 con sobretecho solo en el balcón", () => {
    const r = calcularPrecio({ modelo: "20ft", materiales: { balcon: "lateral", techoBalcon: "solo-balcon" }, precios: null });
    expect(r.adicionales).toEqual([{ key: "balcon", nombre: "Balcón lateral de 2 m con sobretecho, deck y barandas", precio: 3100 }]);
    expect(r.total).toBe(BASE_38 + 3100);
  });

  it("la cocina ampliada no cambia: USD 500", () => {
    const r = calcularPrecio({ modelo: "20ft", materiales: { cocinaAmpliada: "alacena-01" }, precios: null });
    expect(r.adicionales).toEqual([{ key: "cocinaAmpliada", nombre: "Cocina ampliada: Con alacena — opción 1", precio: 500 }]);
  });
});

describe("calcularPrecio — a consultar", () => {
  it("sobretecho completo + bañera + muro de vidrio: total = base y las tres a consultar", () => {
    const r = calcularPrecio({
      modelo: "20ft",
      materiales: { balcon: "frontal", techoBalcon: "completo", banera: "banera-01", muroVidrio: "vidrio-01" },
      precios: { preciosExtras: [{ nombre: "Bañera", precio: 500 }] },
    });
    expect(r.total).toBe(BASE_38);
    expect(r.adicionales).toEqual([]);
    expect(r.aConsultar).toEqual([
      { key: "banera", nombre: "Bañera — opción 1" },
      { key: "muroVidrio", nombre: "Muro cortina de vidrio" },
      { key: "balcon", nombre: "Balcón frontal" },
      { key: "techoBalcon", nombre: "Sobretecho completo: balcón y toda la unidad" },
    ]);
  });

  it("un balcón sin techo (no lo permite el configurador) se cotiza aparte", () => {
    const r = calcularPrecio({ modelo: "20ft", materiales: { balcon: "frontal", techoBalcon: null }, precios: null });
    expect(r.total).toBe(BASE_38);
    expect(r.aConsultar).toEqual([{ key: "balcon", nombre: "Balcón frontal" }]);
  });

  it("un techo sin balcón no cuenta", () => {
    const r = calcularPrecio({ modelo: "20ft", materiales: { techoBalcon: "solo-balcon" }, precios: null });
    expect(r).toEqual({ base: BASE_38, adicionales: [], total: BASE_38, aConsultar: [] });
  });

  it("una galería de un pedido viejo no suma ni se lista", () => {
    const r = calcularPrecio({ modelo: "10ft", materiales: { galeria: "galeria-01" }, precios: null });
    expect(r).toEqual({ base: 18 * 680, adicionales: [], total: 18 * 680, aConsultar: [] });
  });
});

describe("desglose guardado con el pedido", () => {
  it("toDesgloseEstimado guarda nombres, precios, a consultar y total", () => {
    const r = calcularPrecio({ modelo: "20ft", materiales: { inodoro: "inteligente-bidet", banera: "banera-02" }, precios: null });
    expect(toDesgloseEstimado(r)).toEqual({
      base: BASE_38,
      adicionales: [{ nombre: "Inodoro inteligente con bidet", precio: 580 }],
      aConsultar: ["Bañera — opción 2"],
      total: BASE_38 + 580,
    });
  });

  it("parseDesgloseEstimado lee lo guardado y descarta entradas con otra forma", () => {
    expect(
      parseDesgloseEstimado({
        base: 100,
        total: 150,
        adicionales: [{ nombre: "X", precio: 50 }, { nombre: "Y" }, null, { nombre: 3, precio: 1 }],
        aConsultar: ["Bañera", 4],
      })
    ).toEqual({ base: 100, adicionales: [{ nombre: "X", precio: 50 }], aConsultar: ["Bañera"], total: 150 });
  });

  it.each([null, undefined, "texto", 3, {}, { base: 1, total: 1, adicionales: [] }, { base: "1", total: 1, adicionales: [], aConsultar: [] }])(
    "parseDesgloseEstimado(%j) es null (pedido anterior o dato roto)",
    (raw) => {
      expect(parseDesgloseEstimado(raw)).toBeNull();
    }
  );
});
