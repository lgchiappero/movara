import { describe, it, expect } from "vitest";
import { citaSchema, consultaSchema } from "@/lib/validators/cita";
import { hoyFechaKey, addDiasFechaKey } from "@/lib/agenda/fecha";

const manana = addDiasFechaKey(hoyFechaKey(), 1);

const valid = {
  fecha: manana,
  horario: "10:00",
  tipoCliente: "particular",
  nombre: "Juan García",
  email: "juan@example.com",
  telefono: "+54 9 11 1234-5678",
  consulta: "Estoy buscando un módulo de 38m2 para uso de vivienda familiar",
};

describe("citaSchema", () => {
  it("acepta un conjunto de datos válidos", () => {
    expect(citaSchema.safeParse(valid).success).toBe(true);
  });

  it("rechaza horario fuera de las opciones válidas", () => {
    expect(citaSchema.safeParse({ ...valid, horario: "13:00" }).success).toBe(false);
  });

  it("rechaza fecha pasada", () => {
    const ayer = addDiasFechaKey(hoyFechaKey(), -1);
    expect(citaSchema.safeParse({ ...valid, fecha: ayer }).success).toBe(false);
  });

  it("acepta fecha de hoy", () => {
    expect(citaSchema.safeParse({ ...valid, fecha: hoyFechaKey() }).success).toBe(true);
  });

  it("rechaza fecha con formato inválido", () => {
    expect(citaSchema.safeParse({ ...valid, fecha: "16/09/2026" }).success).toBe(false);
  });

  it("rechaza consulta menor a 20 caracteres", () => {
    expect(citaSchema.safeParse({ ...valid, consulta: "muy corta" }).success).toBe(false);
  });

  it("rechaza empresa sin razón social", () => {
    expect(citaSchema.safeParse({ ...valid, tipoCliente: "empresa" }).success).toBe(false);
  });

  it("acepta empresa con razón social", () => {
    expect(
      citaSchema.safeParse({
        ...valid,
        tipoCliente: "empresa",
        razonSocial: "Constructora Sur S.A.",
      }).success
    ).toBe(true);
  });

  it("rechaza email malformado", () => {
    expect(citaSchema.safeParse({ ...valid, email: "noemail" }).success).toBe(false);
  });

  it("rechaza teléfono inválido", () => {
    expect(citaSchema.safeParse({ ...valid, telefono: "123" }).success).toBe(false);
  });
});

describe("consultaSchema", () => {
  it("exporta el mismo schema que usa citaSchema.consulta — se consume directo en el form público", () => {
    expect(consultaSchema.safeParse("Estoy buscando un módulo de 38m2 para vivienda").success).toBe(
      true
    );
    expect(consultaSchema.safeParse("muy corta").success).toBe(false);
  });
});
