import { describe, it, expect } from "vitest";
import {
  enVentanaRecordatorio,
  fechasPosiblesVentana,
  inicioCita,
  recordatorioNoEnviado,
  MAX_INTENTOS_RECORDATORIO,
} from "./recordatorios";

const H = 60 * 60 * 1000;
const fecha = new Date("2026-10-14T00:00:00.000Z");

describe("inicioCita", () => {
  it("el horario es hora de Argentina (UTC-3)", () => {
    expect(inicioCita(fecha, "10:00").toISOString()).toBe("2026-10-14T13:00:00.000Z");
    expect(inicioCita(fecha, "17:30").toISOString()).toBe("2026-10-14T20:30:00.000Z");
    expect(inicioCita(fecha, "22").toISOString()).toBe("2026-10-15T01:00:00.000Z");
  });
});

describe("enVentanaRecordatorio", () => {
  const inicio = new Date("2026-10-14T13:00:00.000Z");
  it("más de 12 y hasta 36 horas antes", () => {
    expect(enVentanaRecordatorio(inicio, new Date(inicio.getTime() - 12 * H))).toBe(false);
    expect(enVentanaRecordatorio(inicio, new Date(inicio.getTime() - 12 * H - 1))).toBe(true);
    expect(enVentanaRecordatorio(inicio, new Date(inicio.getTime() - 36 * H))).toBe(true);
    expect(enVentanaRecordatorio(inicio, new Date(inicio.getTime() - 36 * H - 1))).toBe(false);
  });

  it("con las corridas de 9:00 y 21:00 (±59 min de Vercel Hobby) cada horario tiene exactamente 2 intentos", () => {
    for (const horario of ["10:00", "11:00", "12:00", "15:00", "16:00", "17:00"]) {
      const inicioH = inicioCita(fecha, horario);
      for (const min of [0, 59]) {
        const corridas = [
          `2026-10-12T12:${String(min).padStart(2, "0")}:00Z`, // 9 hs, dos días antes
          `2026-10-13T00:${String(min).padStart(2, "0")}:00Z`, // 21 hs, dos días antes
          `2026-10-13T12:${String(min).padStart(2, "0")}:00Z`, // 9 hs del día anterior
          `2026-10-14T00:${String(min).padStart(2, "0")}:00Z`, // 21 hs del día anterior
          `2026-10-14T12:${String(min).padStart(2, "0")}:00Z`, // 9 hs del mismo día
        ].filter((c) => enVentanaRecordatorio(inicioH, new Date(c)));
        expect(corridas, `${horario} +${min}min`).toHaveLength(MAX_INTENTOS_RECORDATORIO);
      }
    }
  });
});

describe("fechasPosiblesVentana", () => {
  it("hoy, mañana y pasado mañana (date-only UTC)", () => {
    expect(fechasPosiblesVentana(new Date("2026-10-31T23:30:00Z")).map((d) => d.toISOString().slice(0, 10))).toEqual([
      "2026-10-31",
      "2026-11-01",
      "2026-11-02",
    ]);
  });
});

describe("recordatorioNoEnviado", () => {
  const base = { fecha, horario: "10:00", estado: "confirmada", recordatorioEnviado: false, recordatorioIntentos: 1 };
  const antes = (horas: number) => new Date(new Date("2026-10-14T13:00:00.000Z").getTime() - horas * H);

  it("falló una vez y todavía queda la corrida siguiente: no se marca", () => {
    expect(recordatorioNoEnviado(base, antes(24))).toBe(false);
  });

  it("falló y ya faltan 12 horas o menos: no enviado", () => {
    expect(recordatorioNoEnviado(base, antes(12))).toBe(true);
    expect(recordatorioNoEnviado(base, antes(-5))).toBe(true);
  });

  it("se agotaron los 2 intentos: no enviado aunque falte mucho", () => {
    expect(recordatorioNoEnviado({ ...base, recordatorioIntentos: 2 }, antes(20))).toBe(true);
  });

  it("enviado, sin intentos, cancelada o completada: nunca se marca", () => {
    expect(recordatorioNoEnviado({ ...base, recordatorioEnviado: true }, antes(1))).toBe(false);
    expect(recordatorioNoEnviado({ ...base, recordatorioIntentos: 0 }, antes(1))).toBe(false);
    expect(recordatorioNoEnviado({ ...base, estado: "cancelada", recordatorioIntentos: 2 }, antes(1))).toBe(false);
    expect(recordatorioNoEnviado({ ...base, estado: "completada", recordatorioIntentos: 2 }, antes(1))).toBe(false);
  });
});
