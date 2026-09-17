import { describe, it, expect } from "vitest";
import { HORARIOS_AGENDA, HORARIOS_MANANA, HORARIOS_TARDE, isHorarioValido, esDiaHabil, esDomingo } from "@/lib/agenda/horarios";

describe("HORARIOS_AGENDA", () => {
  it("tiene los 8 horarios esperados: 09-12 y 14-17", () => {
    expect(HORARIOS_MANANA).toEqual(["09:00", "10:00", "11:00", "12:00"]);
    expect(HORARIOS_TARDE).toEqual(["14:00", "15:00", "16:00", "17:00"]);
    expect(HORARIOS_AGENDA).toHaveLength(8);
  });

  it("isHorarioValido acepta los horarios del catálogo y rechaza otros", () => {
    expect(isHorarioValido("09:00")).toBe(true);
    expect(isHorarioValido("17:00")).toBe(true);
    expect(isHorarioValido("13:00")).toBe(false);
    expect(isHorarioValido("08:00")).toBe(false);
  });
});

describe("esDiaHabil / esDomingo", () => {
  it("esDiaHabil es true de lunes a sábado", () => {
    // 2026-09-14 es lunes, 2026-09-19 es sábado (verificado por calendario UTC)
    for (let d = 14; d <= 19; d++) {
      expect(esDiaHabil(new Date(Date.UTC(2026, 8, d)))).toBe(true);
    }
  });

  it("esDiaHabil es false el domingo", () => {
    // 2026-09-20 es domingo
    expect(esDiaHabil(new Date(Date.UTC(2026, 8, 20)))).toBe(false);
  });

  it("esDomingo identifica correctamente el domingo", () => {
    expect(esDomingo(new Date(Date.UTC(2026, 8, 20)))).toBe(true);
    expect(esDomingo(new Date(Date.UTC(2026, 8, 19)))).toBe(false);
  });
});
