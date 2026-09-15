import { describe, it, expect } from "vitest";
import { calcularGarantiaFechaFin } from "@/lib/pedido/garantia";

describe("calcularGarantiaFechaFin", () => {
  it("suma 12 meses a la fecha de inicio", () => {
    const inicio = new Date("2026-01-15T00:00:00.000Z");
    const fin = calcularGarantiaFechaFin(inicio);
    expect(fin?.toISOString().slice(0, 10)).toBe("2027-01-15");
  });

  it("devuelve null si no hay fecha de inicio", () => {
    expect(calcularGarantiaFechaFin(null)).toBeNull();
  });

  it("maneja el cruce de año correctamente", () => {
    const inicio = new Date("2026-06-30T00:00:00.000Z");
    const fin = calcularGarantiaFechaFin(inicio);
    expect(fin?.getUTCFullYear()).toBe(2027);
    expect(fin?.getUTCMonth()).toBe(5); // junio (0-indexado)
  });

  it("no muta la fecha de entrada", () => {
    const inicio = new Date("2026-03-01T00:00:00.000Z");
    const inicioCopia = new Date(inicio);
    calcularGarantiaFechaFin(inicio);
    expect(inicio.getTime()).toBe(inicioCopia.getTime());
  });
});
