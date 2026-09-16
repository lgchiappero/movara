import { describe, it, expect } from "vitest";
import {
  isFechaKeyValida,
  fechaKeyToDate,
  dateToFechaKey,
  addDiasFechaKey,
} from "@/lib/agenda/fecha";

describe("isFechaKeyValida", () => {
  it("acepta una fecha bien formada", () => {
    expect(isFechaKeyValida("2026-09-16")).toBe(true);
  });

  it("rechaza formato incorrecto", () => {
    expect(isFechaKeyValida("16-09-2026")).toBe(false);
    expect(isFechaKeyValida("2026/09/16")).toBe(false);
    expect(isFechaKeyValida("")).toBe(false);
  });

  it("rechaza fechas calendario inexistentes", () => {
    expect(isFechaKeyValida("2026-02-30")).toBe(false);
    expect(isFechaKeyValida("2026-13-01")).toBe(false);
  });
});

describe("fechaKeyToDate / dateToFechaKey", () => {
  it("son inversas entre sí", () => {
    expect(dateToFechaKey(fechaKeyToDate("2026-09-16"))).toBe("2026-09-16");
  });

  it("fechaKeyToDate produce medianoche UTC exacta", () => {
    const date = fechaKeyToDate("2026-01-05");
    expect(date.getUTCHours()).toBe(0);
    expect(date.getUTCMinutes()).toBe(0);
    expect(date.getUTCFullYear()).toBe(2026);
    expect(date.getUTCMonth()).toBe(0);
    expect(date.getUTCDate()).toBe(5);
  });
});

describe("addDiasFechaKey", () => {
  it("suma días cruzando el fin de mes", () => {
    expect(addDiasFechaKey("2026-01-30", 3)).toBe("2026-02-02");
  });

  it("resta días con valor negativo", () => {
    expect(addDiasFechaKey("2026-03-01", -1)).toBe("2026-02-28");
  });
});
