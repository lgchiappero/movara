import { describe, it, expect } from "vitest";
import { envioSchema } from "@/lib/validators/envio";

const valid = {
  numeroPI: "PI-2026-001",
  numeroBL: "BL-2026-001",
  numeroContenedor: "MSCU1234567",
  fechaEmbarque: "2026-09-01",
  fechaArriboEstimado: "2026-10-01",
  fechaArribo: null,
  costoPI: 25000,
  costoFlete: 4000,
  costoSeguro: 300,
  costoAduana: 1200,
  costoOtrosInternacional: null,
  notas: null,
};

describe("envioSchema", () => {
  it("acepta un conjunto de datos válidos", () => {
    expect(envioSchema.safeParse(valid).success).toBe(true);
  });

  it("acepta todos los campos en null (envío recién creado)", () => {
    const result = envioSchema.safeParse({
      numeroPI: null,
      numeroBL: null,
      numeroContenedor: null,
      fechaEmbarque: null,
      fechaArriboEstimado: null,
      fechaArribo: null,
      costoPI: null,
      costoFlete: null,
      costoSeguro: null,
      costoAduana: null,
      costoOtrosInternacional: null,
      notas: null,
    });
    expect(result.success).toBe(true);
  });

  it("convierte fecha string a Date", () => {
    const result = envioSchema.safeParse(valid);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.fechaEmbarque).toBeInstanceOf(Date);
    }
  });

  it("rechaza objeto vacío (faltan campos requeridos)", () => {
    expect(envioSchema.safeParse({}).success).toBe(false);
  });
});
