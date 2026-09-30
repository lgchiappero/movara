import { describe, it, expect } from "vitest";
import {
  calcularRangoPeriodo,
  mesAnioUnico,
  inicioSemana,
  finSemana,
  contarPeriodosSinCerrar,
} from "@/lib/cobranza/periodo";

const HOY = new Date(2026, 5, 15); // 15 de junio de 2026

describe("calcularRangoPeriodo", () => {
  it("mes_actual: todo junio", () => {
    const r = calcularRangoPeriodo("mes_actual", HOY);
    expect(r.desde).toEqual(new Date(2026, 5, 1));
    expect(r.hasta).toEqual(new Date(2026, 6, 1));
  });

  it("mes_anterior: todo mayo", () => {
    const r = calcularRangoPeriodo("mes_anterior", HOY);
    expect(r.desde).toEqual(new Date(2026, 4, 1));
    expect(r.hasta).toEqual(new Date(2026, 5, 1));
  });

  it("mes_anterior en enero retrocede al diciembre del año anterior", () => {
    const r = calcularRangoPeriodo("mes_anterior", new Date(2026, 0, 15));
    expect(r.desde).toEqual(new Date(2025, 11, 1));
    expect(r.hasta).toEqual(new Date(2026, 0, 1));
  });

  it("trimestre: abril-junio para una fecha en junio", () => {
    const r = calcularRangoPeriodo("trimestre", HOY);
    expect(r.desde).toEqual(new Date(2026, 3, 1));
    expect(r.hasta).toEqual(new Date(2026, 6, 1));
  });

  it("trimestre: enero-marzo para una fecha en febrero", () => {
    const r = calcularRangoPeriodo("trimestre", new Date(2026, 1, 10));
    expect(r.desde).toEqual(new Date(2026, 0, 1));
    expect(r.hasta).toEqual(new Date(2026, 3, 1));
  });

  it("anio: todo el año calendario", () => {
    const r = calcularRangoPeriodo("anio", HOY);
    expect(r.desde).toEqual(new Date(2026, 0, 1));
    expect(r.hasta).toEqual(new Date(2027, 0, 1));
  });

  it("personalizado: usa desde/hasta con el límite exclusivo al día siguiente", () => {
    const r = calcularRangoPeriodo("personalizado", HOY, "2026-01-10", "2026-01-20");
    expect(r.desde).toEqual(new Date("2026-01-10"));
    expect(r.hasta).toEqual(new Date("2026-01-21"));
  });

  it("personalizado sin desde/hasta cae al mes actual", () => {
    const r = calcularRangoPeriodo("personalizado", HOY);
    expect(r.desde).toEqual(new Date(2026, 5, 1));
    expect(r.hasta).toEqual(new Date(2026, 6, 1));
  });

  it("personalizado con fechas inválidas cae al mes actual", () => {
    const r = calcularRangoPeriodo("personalizado", HOY, "no-es-fecha", "tampoco");
    expect(r.desde).toEqual(new Date(2026, 5, 1));
  });
});

describe("mesAnioUnico", () => {
  it("un mes calendario completo devuelve {mes, anio}", () => {
    expect(mesAnioUnico({ desde: new Date(2026, 5, 1), hasta: new Date(2026, 6, 1) })).toEqual({
      mes: 6,
      anio: 2026,
    });
  });

  it("diciembre cruza a enero del año siguiente correctamente", () => {
    expect(mesAnioUnico({ desde: new Date(2026, 11, 1), hasta: new Date(2027, 0, 1) })).toEqual({
      mes: 12,
      anio: 2026,
    });
  });

  it("un trimestre (3 meses) no es un único mes", () => {
    expect(mesAnioUnico({ desde: new Date(2026, 3, 1), hasta: new Date(2026, 6, 1) })).toBeNull();
  });

  it("un rango que no arranca el día 1 no es un único mes", () => {
    expect(mesAnioUnico({ desde: new Date(2026, 5, 10), hasta: new Date(2026, 6, 1) })).toBeNull();
  });
});

describe("contarPeriodosSinCerrar", () => {
  it("0 sin movimientos todavía", () => {
    expect(contarPeriodosSinCerrar(null, HOY, [])).toBe(0);
  });

  it("cuenta desde el mes del primer movimiento hasta el mes anterior al actual (excluye el actual)", () => {
    // HOY = 15 jun 2026. Primer movimiento en abril → abril y mayo cuentan, junio no.
    expect(contarPeriodosSinCerrar(new Date(2026, 3, 5), HOY, [])).toBe(2);
  });

  it("descuenta los meses que ya tienen un cierre registrado", () => {
    expect(contarPeriodosSinCerrar(new Date(2026, 3, 5), HOY, [{ mes: 4, anio: 2026 }])).toBe(1);
  });

  it("0 cuando todos los meses en rango ya están cerrados", () => {
    expect(
      contarPeriodosSinCerrar(new Date(2026, 3, 5), HOY, [
        { mes: 4, anio: 2026 },
        { mes: 5, anio: 2026 },
      ])
    ).toBe(0);
  });

  it("0 cuando el primer movimiento fue este mismo mes (el actual no cuenta)", () => {
    expect(contarPeriodosSinCerrar(new Date(2026, 5, 2), HOY, [])).toBe(0);
  });

  it("cruza el límite de año correctamente", () => {
    // primer movimiento en noviembre 2025, hoy en junio 2026 → nov, dic, ene..may = 7 meses
    expect(contarPeriodosSinCerrar(new Date(2025, 10, 1), HOY, [])).toBe(7);
  });
});

describe("inicioSemana / finSemana", () => {
  it("inicioSemana trunca la hora a medianoche", () => {
    const r = inicioSemana(new Date(2026, 5, 15, 18, 30));
    expect(r).toEqual(new Date(2026, 5, 15, 0, 0, 0, 0));
  });

  it("finSemana es 7 días después de inicioSemana", () => {
    const inicio = inicioSemana(HOY);
    const fin = finSemana(HOY);
    expect(fin.getTime() - inicio.getTime()).toBe(7 * 24 * 60 * 60 * 1000);
  });
});
