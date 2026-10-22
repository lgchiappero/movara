import { describe, it, expect, vi } from "vitest";

vi.mock("next/image", () => ({ default: () => null }));

import { calcularPrecio } from "../ConfiguradorMovara";

describe("calcularPrecio — precio base por m²", () => {
  it("sin precio cargado en Sanity usa USD 680 por m²", () => {
    expect(calcularPrecio({ modelo: "10ft", materiales: {}, precios: null })).toEqual({ base: 18 * 680, adicionales: [], total: 18 * 680, aConsultar: [] });
    expect(calcularPrecio({ modelo: "20ft", materiales: {}, precios: {} }).base).toBe(38 * 680);
    expect(calcularPrecio({ modelo: "40ft", materiales: {}, precios: { precioBaseM2: null } }).base).toBe(77 * 680);
  });

  it("si Sanity tiene precioBaseM2, usa ese valor", () => {
    expect(calcularPrecio({ modelo: "20ft", materiales: {}, precios: { precioBaseM2: 700 } }).base).toBe(38 * 700);
  });

  it("sin modelo elegido el precio es 0", () => {
    expect(calcularPrecio({ modelo: null, materiales: {}, precios: null }).total).toBe(0);
  });
});

describe("calcularPrecio — opciones a consultar (balcón, techo, muro cortina)", () => {
  it.each([
    ["frontal", "solo-balcon", "Balcón frontal", "Sobretecho solo en el balcón"],
    ["frontal", "completo", "Balcón frontal", "Sobretecho completo: balcón y toda la unidad"],
    ["lateral", "solo-balcon", "Balcón lateral", "Sobretecho solo en el balcón"],
    ["lateral", "completo", "Balcón lateral", "Sobretecho completo: balcón y toda la unidad"],
  ])("balcón %s + techo %s: no suma al precio y se lista para cotizar", (balcon, techoBalcon, nombreBalcon, nombreTecho) => {
    const sin = calcularPrecio({ modelo: "20ft", materiales: {}, precios: null });
    const con = calcularPrecio({ modelo: "20ft", materiales: { balcon, techoBalcon }, precios: null });
    expect(con.total).toBe(sin.total);
    expect(con.adicionales).toEqual([]);
    expect(con.aConsultar).toEqual([
      { key: "balcon", nombre: nombreBalcon },
      { key: "techoBalcon", nombre: nombreTecho },
    ]);
  });

  it("el muro cortina tampoco suma, aunque Sanity tenga un precio viejo cargado con ese nombre", () => {
    const r = calcularPrecio({
      modelo: "10ft",
      materiales: { muroVidrio: "vidrio-01" },
      precios: { precioAdicionalDefault: 500, preciosExtras: [{ nombre: "Muro cortina", precio: 900 }] },
    });
    expect(r.total).toBe(18 * 680);
    expect(r.aConsultar).toEqual([{ key: "muroVidrio", nombre: "Muro cortina de vidrio" }]);
  });

  it("una galería de un pedido viejo no suma ni se lista", () => {
    const r = calcularPrecio({ modelo: "10ft", materiales: { galeria: "galeria-01" }, precios: null });
    expect(r).toEqual({ base: 18 * 680, adicionales: [], total: 18 * 680, aConsultar: [] });
  });
});
