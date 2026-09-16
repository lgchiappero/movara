import { describe, it, expect } from "vitest";
import {
  disponibilidadDiaSchema,
  habilitarMesSchema,
  citaAdminActionSchema,
} from "@/lib/validators/admin-agenda";

describe("disponibilidadDiaSchema", () => {
  it("acepta un día habilitado con horarios válidos", () => {
    expect(
      disponibilidadDiaSchema.safeParse({
        fecha: "2026-10-05",
        habilitada: true,
        horarios: ["10:00", "15:00"],
      }).success
    ).toBe(true);
  });

  it("acepta un día deshabilitado sin horarios", () => {
    expect(
      disponibilidadDiaSchema.safeParse({ fecha: "2026-10-05", habilitada: false, horarios: [] })
        .success
    ).toBe(true);
  });

  it("rechaza fecha con formato inválido", () => {
    expect(
      disponibilidadDiaSchema.safeParse({ fecha: "05/10/2026", habilitada: true, horarios: [] })
        .success
    ).toBe(false);
  });

  it("rechaza un horario fuera de las opciones válidas", () => {
    expect(
      disponibilidadDiaSchema.safeParse({
        fecha: "2026-10-05",
        habilitada: true,
        horarios: ["09:00"],
      }).success
    ).toBe(false);
  });
});

describe("habilitarMesSchema", () => {
  it("acepta año y mes válidos", () => {
    expect(habilitarMesSchema.safeParse({ anio: 2026, mes: 10 }).success).toBe(true);
  });

  it("rechaza mes fuera de rango", () => {
    expect(habilitarMesSchema.safeParse({ anio: 2026, mes: 13 }).success).toBe(false);
    expect(habilitarMesSchema.safeParse({ anio: 2026, mes: 0 }).success).toBe(false);
  });
});

describe("citaAdminActionSchema", () => {
  it("acepta cancelar con motivo", () => {
    expect(
      citaAdminActionSchema.safeParse({ accion: "cancelar", motivo: "Cliente reprogramó" }).success
    ).toBe(true);
  });

  it("acepta cancelar sin motivo (opcional)", () => {
    expect(citaAdminActionSchema.safeParse({ accion: "cancelar" }).success).toBe(true);
  });

  it("acepta completar", () => {
    expect(citaAdminActionSchema.safeParse({ accion: "completar" }).success).toBe(true);
  });

  it("rechaza una acción desconocida", () => {
    expect(citaAdminActionSchema.safeParse({ accion: "borrar" }).success).toBe(false);
  });
});
