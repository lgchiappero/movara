import { describe, it, expect } from "vitest";
import { configuracionEspacioSchema } from "@/lib/validators/admin-pedido-espacio";

const materialesVacios = {
  exterior: null,
  piso: null,
  panelesBano: null,
  puertaBano: null,
  cocina: null,
  mesada: null,
  puertaPrincipal: null,
  ventanas: null,
};

const valid = {
  modelo: null,
  finalidad: null,
  provincia: null,
  localidad: null,
  habitaciones: null,
  incluyeCocina: true,
  tipoCocina: null,
  incluyeBano: true,
  tipoAgua: null,
  lavarropas: null,
  materiales: materialesVacios,
  upgrades: [],
  notasConfiguracion: null,
};

describe("configuracionEspacioSchema", () => {
  it("acepta todos los campos en null/vacío (pedido recién creado)", () => {
    expect(configuracionEspacioSchema.safeParse(valid).success).toBe(true);
  });

  it("acepta un conjunto completo de datos válidos", () => {
    const result = configuracionEspacioSchema.safeParse({
      ...valid,
      modelo: "20ft",
      finalidad: "vivienda",
      provincia: "Buenos Aires",
      localidad: "La Plata",
      habitaciones: 2,
      tipoCocina: "electrico",
      tipoAgua: "calefon-electrico",
      lavarropas: "bano",
      materiales: { ...materialesVacios, exterior: "Blanco liso", piso: "Nogal oscuro" },
      upgrades: ["banera", "piso-spc"],
      notasConfiguracion: "El cliente quiere entrega antes de diciembre",
    });
    expect(result.success).toBe(true);
  });

  it("rechaza modelo fuera de las opciones válidas", () => {
    expect(configuracionEspacioSchema.safeParse({ ...valid, modelo: "60ft" }).success).toBe(
      false
    );
  });

  it("rechaza habitaciones fuera de 1/2/3", () => {
    expect(configuracionEspacioSchema.safeParse({ ...valid, habitaciones: 4 }).success).toBe(
      false
    );
    expect(configuracionEspacioSchema.safeParse({ ...valid, habitaciones: 0 }).success).toBe(
      false
    );
  });

  it("rechaza materiales incompleto (faltan keys requeridas)", () => {
    expect(
      configuracionEspacioSchema.safeParse({
        ...valid,
        materiales: { exterior: "Blanco liso" },
      }).success
    ).toBe(false);
  });

  it("rechaza un upgrade fuera del catálogo ADMIN_EXTRAS", () => {
    expect(
      configuracionEspacioSchema.safeParse({ ...valid, upgrades: ["algo-inventado"] }).success
    ).toBe(false);
  });

  it("convierte string vacío a null en campos de texto", () => {
    const result = configuracionEspacioSchema.safeParse({
      ...valid,
      provincia: "",
      notasConfiguracion: "",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.provincia).toBeNull();
      expect(result.data.notasConfiguracion).toBeNull();
    }
  });

  it("rechaza objeto vacío (faltan campos requeridos)", () => {
    expect(configuracionEspacioSchema.safeParse({}).success).toBe(false);
  });
});
