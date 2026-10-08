import { describe, it, expect } from "vitest";
import { crearReciboSchema, anularReciboSchema, tokenReciboSchema, confirmarReciboSchema } from "./recibo";

describe("crearReciboSchema", () => {
  it("convierte la fecha a medianoche UTC y normaliza observaciones", () => {
    const r = crearReciboSchema.parse({ unidadId: " u1 ", fechaEntrega: "2026-10-08", lugarEntrega: "  Sunchales  ", observaciones: "  " });
    expect(r).toEqual({ unidadId: "u1", fechaEntrega: new Date("2026-10-08T00:00:00.000Z"), lugarEntrega: "Sunchales", observaciones: null });
    expect(crearReciboSchema.parse({ unidadId: "u1", fechaEntrega: "2026-10-08", lugarEntrega: "Sunchales", observaciones: " Raspón " }).observaciones).toBe("Raspón");
    expect(crearReciboSchema.parse({ unidadId: "u1", fechaEntrega: "2026-10-08", lugarEntrega: "Sunchales" }).observaciones).toBeNull();
  });

  it("rechaza unidad vacía, fecha inválida, lugar corto y textos largos", () => {
    const base = { unidadId: "u1", fechaEntrega: "2026-10-08", lugarEntrega: "Sunchales" };
    expect(crearReciboSchema.safeParse({ ...base, unidadId: "" }).success).toBe(false);
    expect(crearReciboSchema.safeParse({ ...base, fechaEntrega: "08/10/2026" }).success).toBe(false);
    expect(crearReciboSchema.safeParse({ ...base, fechaEntrega: "2026-13-45" }).success).toBe(false);
    expect(crearReciboSchema.safeParse({ ...base, lugarEntrega: "ab" }).success).toBe(false);
    expect(crearReciboSchema.safeParse({ ...base, lugarEntrega: "x".repeat(301) }).success).toBe(false);
    expect(crearReciboSchema.safeParse({ ...base, observaciones: "x".repeat(2001) }).success).toBe(false);
  });
});

describe("otros schemas", () => {
  it("anular exige la acción explícita", () => {
    expect(anularReciboSchema.safeParse({ accion: "anular" }).success).toBe(true);
    expect(anularReciboSchema.safeParse({}).success).toBe(false);
  });
  it("token: 64 hex", () => {
    expect(tokenReciboSchema.safeParse("a".repeat(64)).success).toBe(true);
    expect(tokenReciboSchema.safeParse("A".repeat(64)).success).toBe(false);
    expect(tokenReciboSchema.safeParse("a".repeat(63)).success).toBe(false);
  });
  it("confirmar exige { confirmo: true }", () => {
    expect(confirmarReciboSchema.safeParse({ confirmo: true }).success).toBe(true);
    expect(confirmarReciboSchema.safeParse({ confirmo: "true" }).success).toBe(false);
    expect(confirmarReciboSchema.safeParse(null).success).toBe(false);
  });
});
