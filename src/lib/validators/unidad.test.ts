import { describe, it, expect } from "vitest";
import { nuevaUnidadSchema, unidadEditSchema } from "@/lib/validators/unidad";

describe("nuevaUnidadSchema", () => {
  it("acepta el mínimo requerido: solo clienteId", () => {
    expect(nuevaUnidadSchema.safeParse({ clienteId: "cliente_1" }).success).toBe(true);
  });

  it("rechaza sin clienteId", () => {
    expect(nuevaUnidadSchema.safeParse({}).success).toBe(false);
  });

  it("acepta modelo dentro de las opciones válidas", () => {
    expect(nuevaUnidadSchema.safeParse({ clienteId: "c1", modelo: "Flex 38" }).success).toBe(true);
  });

  it("rechaza modelo fuera de las opciones válidas", () => {
    expect(nuevaUnidadSchema.safeParse({ clienteId: "c1", modelo: "Flex 999" }).success).toBe(false);
  });

  it("acepta precioCliente numérico no negativo", () => {
    expect(nuevaUnidadSchema.safeParse({ clienteId: "c1", precioCliente: 45000 }).success).toBe(true);
  });

  it("rechaza precioCliente negativo", () => {
    expect(nuevaUnidadSchema.safeParse({ clienteId: "c1", precioCliente: -1 }).success).toBe(false);
  });
});

const validEdit = {
  clienteId: "cliente_1",
  envioId: null,
  modelo: "Flex 38",
  configuracion: null,
  precioCliente: 45000,
  estadoFabricacion: "en_produccion",
  provinciaDestino: "Córdoba",
  localidadDestino: "Villa Carlos Paz",
  direccionEntrega: null,
  costoTransporteNacional: null,
  costoGrua: null,
  fechaEntregaEstimada: null,
  fechaEntrega: null,
  garantiaActivada: false,
  garantiaInicio: null,
  notas: null,
};

describe("unidadEditSchema", () => {
  it("acepta un conjunto completo de datos válidos", () => {
    expect(unidadEditSchema.safeParse(validEdit).success).toBe(true);
  });

  it("rechaza estadoFabricacion fuera del catálogo", () => {
    expect(
      unidadEditSchema.safeParse({ ...validEdit, estadoFabricacion: "no_existe" }).success
    ).toBe(false);
  });

  it("acepta configuracion como objeto arbitrario", () => {
    const result = unidadEditSchema.safeParse({
      ...validEdit,
      configuracion: { habitaciones: 2, tipoAgua: "calefon-electrico" },
    });
    expect(result.success).toBe(true);
  });

  it("rechaza sin clienteId", () => {
    expect(unidadEditSchema.safeParse({ ...validEdit, clienteId: "" }).success).toBe(false);
  });
});
