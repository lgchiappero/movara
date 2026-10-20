import { describe, it, expect, vi } from "vitest";

vi.mock("next/image", () => ({ default: () => null }));

import { calcularPrecio } from "../ConfiguradorMovara";

describe("calcularPrecio — precio base por m²", () => {
  it("sin precio cargado en Sanity usa USD 680 por m²", () => {
    expect(calcularPrecio({ modelo: "10ft", materiales: {}, precios: null })).toEqual({ base: 18 * 680, adicionales: [], total: 18 * 680 });
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
