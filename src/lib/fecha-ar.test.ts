import { describe, it, expect, afterAll } from "vitest";
import {
  ZONA_AR,
  partesAR,
  claveAR,
  hoyAR,
  instanteAR,
  inicioDiaAR,
  finDiaAR,
  inicioMesAR,
  inicioSemanaAR,
  inicioAnioAR,
  anioAR,
  mesAnioAR,
  claveInicioMes,
  sumarDias,
  sumarMeses,
  diasEntre,
  soloFecha,
  claveSoloFecha,
  hoySoloFechaAR,
  inicioMesSoloFechaAR,
  esVencida,
  diasHastaSoloFecha,
  esClaveFechaValida,
  formatearFechaAR,
  formatearFechaHoraAR,
  formatearSoloFecha,
} from "./fecha-ar";

// El resultado no puede depender de la zona de la máquina: Vercel (UTC),
// el navegador del usuario y la Mac. Cada caso corre con varias TZ.
const TZ_ORIGINAL = process.env.TZ;
const ZONAS_MAQUINA = ["UTC", "America/Argentina/Cordoba", "America/New_York", "Asia/Tokyo"];
afterAll(() => {
  process.env.TZ = TZ_ORIGINAL;
});

// 1/12/2026 01:30 UTC = 30/11/2026 22:30 en Argentina (UTC−3).
const NOCHE_FIN_DE_MES = new Date("2026-12-01T01:30:00Z");
// 11/11/2026 14:05 en Argentina.
const MIERCOLES_TARDE = new Date("2026-11-11T17:05:00Z");

describe.each(ZONAS_MAQUINA)("con la máquina en %s", (tz) => {
  process.env.TZ = tz;

  it("partesAR: calendario y reloj argentinos, no los de la máquina", () => {
    process.env.TZ = tz;
    expect(partesAR(NOCHE_FIN_DE_MES)).toEqual({ anio: 2026, mes: 11, dia: 30, hora: 22, minuto: 30, segundo: 0, diaSemana: 1 });
  });

  it("claveAR / hoyAR: a las 22:30 del 30/11 en Argentina todavía es 30/11 (en UTC ya es 1/12)", () => {
    process.env.TZ = tz;
    expect(claveAR(NOCHE_FIN_DE_MES)).toBe("2026-11-30");
    expect(hoyAR(NOCHE_FIN_DE_MES)).toBe("2026-11-30");
  });

  it("inicioDiaAR / finDiaAR: 00:00 y 23:59:59.999 argentinas (03:00 UTC)", () => {
    process.env.TZ = tz;
    expect(inicioDiaAR(NOCHE_FIN_DE_MES).toISOString()).toBe("2026-11-30T03:00:00.000Z");
    expect(finDiaAR(NOCHE_FIN_DE_MES).toISOString()).toBe("2026-12-01T02:59:59.999Z");
  });

  it("inicioMesAR: el mes argentino, con desplazamiento", () => {
    process.env.TZ = tz;
    expect(inicioMesAR(NOCHE_FIN_DE_MES).toISOString()).toBe("2026-11-01T03:00:00.000Z");
    expect(inicioMesAR(NOCHE_FIN_DE_MES, 1).toISOString()).toBe("2026-12-01T03:00:00.000Z");
    expect(inicioMesAR(new Date("2026-01-15T12:00:00Z"), -1).toISOString()).toBe("2025-12-01T03:00:00.000Z");
  });

  it("inicioSemanaAR: el lunes 00:00 argentino (domingo también cae en la semana que termina)", () => {
    process.env.TZ = tz;
    expect(inicioSemanaAR(MIERCOLES_TARDE).toISOString()).toBe("2026-11-09T03:00:00.000Z");
    // Domingo 15/11 23:00 AR = lunes 16/11 02:00 UTC: sigue siendo la semana del 9.
    expect(inicioSemanaAR(new Date("2026-11-16T02:00:00Z")).toISOString()).toBe("2026-11-09T03:00:00.000Z");
    expect(inicioSemanaAR(new Date("2026-11-09T03:00:00Z")).toISOString()).toBe("2026-11-09T03:00:00.000Z");
  });

  it("inicioAnioAR / anioAR: el 31/12 a las 22:00 en Argentina todavía es el año viejo", () => {
    process.env.TZ = tz;
    const nocheVieja = new Date("2027-01-01T01:00:00Z");
    expect(anioAR(nocheVieja)).toBe(2026);
    expect(inicioAnioAR(nocheVieja).toISOString()).toBe("2026-01-01T03:00:00.000Z");
    expect(inicioAnioAR(nocheVieja, 1).toISOString()).toBe("2027-01-01T03:00:00.000Z");
    expect(mesAnioAR(nocheVieja)).toEqual({ mes: 12, anio: 2026 });
  });

  it("instanteAR: hora argentina → instante", () => {
    process.env.TZ = tz;
    expect(instanteAR("2026-11-11", 14, 5).toISOString()).toBe("2026-11-11T17:05:00.000Z");
  });

  it("solo fecha: medianoche UTC, sin correrse de día", () => {
    process.env.TZ = tz;
    expect(soloFecha("2026-11-30").toISOString()).toBe("2026-11-30T00:00:00.000Z");
    expect(claveSoloFecha(new Date("2026-11-30T00:00:00Z"))).toBe("2026-11-30");
    expect(claveSoloFecha("2026-11-30T00:00:00.000Z")).toBe("2026-11-30");
    expect(claveSoloFecha("2026-11-30")).toBe("2026-11-30");
    expect(hoySoloFechaAR(NOCHE_FIN_DE_MES).toISOString()).toBe("2026-11-30T00:00:00.000Z");
    expect(inicioMesSoloFechaAR(NOCHE_FIN_DE_MES).toISOString()).toBe("2026-11-01T00:00:00.000Z");
    expect(inicioMesSoloFechaAR(NOCHE_FIN_DE_MES, 1).toISOString()).toBe("2026-12-01T00:00:00.000Z");
  });

  it("esVencida: vencida desde el día siguiente al vencimiento, en hora argentina", () => {
    process.env.TZ = tz;
    // A las 22:30 del 30/11 en Argentina, una cuota que vence el 30/11 no está vencida (en UTC ya sería el 1/12).
    expect(esVencida(soloFecha("2026-11-30"), NOCHE_FIN_DE_MES)).toBe(false);
    expect(esVencida("2026-11-29", NOCHE_FIN_DE_MES)).toBe(true);
    expect(esVencida("2026-12-01T00:00:00.000Z", NOCHE_FIN_DE_MES)).toBe(false);
    expect(esVencida(null, NOCHE_FIN_DE_MES)).toBe(false);
    expect(esVencida(undefined)).toBe(false);
    expect(esVencida("no-es-fecha")).toBe(false);
  });

  it("formatearFechaAR / formatearFechaHoraAR: en hora argentina, 24 h", () => {
    process.env.TZ = tz;
    expect(formatearFechaAR(NOCHE_FIN_DE_MES)).toBe("30/11/2026");
    expect(formatearFechaAR(NOCHE_FIN_DE_MES.toISOString(), "largo")).toBe("30 de noviembre de 2026");
    expect(formatearFechaAR(NOCHE_FIN_DE_MES, "largoConDia")).toBe("lunes, 30 de noviembre de 2026");
    expect(formatearFechaAR(NOCHE_FIN_DE_MES.getTime(), { month: "long" })).toBe("noviembre");
    expect(formatearFechaHoraAR(NOCHE_FIN_DE_MES)).toBe("30/11/2026, 22:30");
  });

  it("formatearSoloFecha: la fecha cargada, tal cual", () => {
    process.env.TZ = tz;
    expect(formatearSoloFecha(soloFecha("2026-09-30"))).toBe("30/9/2026");
    expect(formatearSoloFecha("2026-09-30T00:00:00.000Z", "largo")).toBe("30 de septiembre de 2026");
    expect(formatearSoloFecha("2026-09-30", "largoConDia")).toBe("miércoles, 30 de septiembre de 2026");
  });
});

describe("aritmética de claves", () => {
  it("sumarDias cruza meses y años", () => {
    expect(sumarDias("2026-12-31", 1)).toBe("2027-01-01");
    expect(sumarDias("2026-03-01", -1)).toBe("2026-02-28");
  });

  it("sumarMeses ajusta al último día del mes de destino", () => {
    expect(sumarMeses("2026-01-31", 1)).toBe("2026-02-28");
    expect(sumarMeses("2028-01-31", 1)).toBe("2028-02-29");
    expect(sumarMeses("2026-11-11", 12)).toBe("2027-11-11");
    expect(sumarMeses("2026-03-15", -3)).toBe("2025-12-15");
  });

  it("diasEntre y diasHastaSoloFecha", () => {
    expect(diasEntre("2026-11-11", "2026-11-20")).toBe(9);
    expect(diasEntre("2026-11-20", "2026-11-11")).toBe(-9);
    expect(diasHastaSoloFecha(soloFecha("2026-12-01"), NOCHE_FIN_DE_MES)).toBe(1);
    expect(diasHastaSoloFecha("2026-11-29", NOCHE_FIN_DE_MES)).toBe(-1);
  });

  it("claveInicioMes", () => {
    expect(claveInicioMes(NOCHE_FIN_DE_MES)).toBe("2026-11-01");
    expect(claveInicioMes(NOCHE_FIN_DE_MES, -11)).toBe("2025-12-01");
  });

  it("esClaveFechaValida y claves inválidas", () => {
    expect(esClaveFechaValida("2026-02-28")).toBe(true);
    expect(esClaveFechaValida("2026-02-30")).toBe(false);
    expect(esClaveFechaValida("30/02/2026")).toBe(false);
    expect(() => soloFecha("30/11/2026")).toThrow("Fecha inválida");
  });

  it("valores por defecto: ahora", () => {
    expect(hoyAR()).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(claveAR()).toBe(hoyAR());
    expect(partesAR().anio).toBe(anioAR());
    expect(inicioDiaAR().getTime()).toBeLessThanOrEqual(Date.now());
    expect(finDiaAR().getTime()).toBeGreaterThan(Date.now());
    expect(inicioMesAR().getTime()).toBeLessThanOrEqual(Date.now());
    expect(inicioSemanaAR().getTime()).toBeLessThanOrEqual(Date.now());
    expect(inicioAnioAR().getTime()).toBeLessThanOrEqual(Date.now());
    expect(mesAnioAR().anio).toBe(anioAR());
    expect(claveInicioMes()).toMatch(/-01$/);
    expect(hoySoloFechaAR().toISOString()).toMatch(/T00:00:00\.000Z$/);
    expect(inicioMesSoloFechaAR().toISOString()).toMatch(/-01T00:00:00\.000Z$/);
    expect(ZONA_AR).toBe("America/Argentina/Cordoba");
  });
});
