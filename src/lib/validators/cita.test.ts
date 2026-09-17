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

  it("acepta consulta corta — ya no tiene mínimo de caracteres", () => {
    expect(citaSchema.safeParse({ ...valid, consulta: "corta" }).success).toBe(true);
  });

  it("acepta sin consulta — es opcional", () => {
    const { consulta, ...sinConsulta } = valid;
    void consulta;
    expect(citaSchema.safeParse(sinConsulta).success).toBe(true);
  });

  it("acepta consulta vacía", () => {
    expect(citaSchema.safeParse({ ...valid, consulta: "" }).success).toBe(true);
  });

  it("rechaza consulta mayor a 1000 caracteres", () => {
    expect(citaSchema.safeParse({ ...valid, consulta: "a".repeat(1001) }).success).toBe(false);
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
  it("es opcional y sin mínimo — se consume directo en el form público", () => {
    expect(consultaSchema.safeParse("Estoy buscando un módulo de 38m2 para vivienda").success).toBe(
      true
    );
    expect(consultaSchema.safeParse("corta").success).toBe(true);
    expect(consultaSchema.safeParse(undefined).success).toBe(true);
  });

  it("rechaza más de 1000 caracteres", () => {
    expect(consultaSchema.safeParse("a".repeat(1001)).success).toBe(false);
  });
});
