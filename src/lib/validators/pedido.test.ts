import { describe, it, expect } from "vitest";
import { pedidoSchema } from "@/lib/validators/pedido";

const valid = {
  clienteNombre: "Juan García",
  clienteWhatsapp: "+54 9 11 1234-5678",
  clienteEmail: "juan@example.com",
  tipoCliente: "particular",
  modelo: "20ft",
  finalidad: "vivienda",
  provincia: "Buenos Aires",
  localidad: "La Plata",
  habitaciones: 2,
  incluyeCocina: true,
  tipoCocina: "electrico",
  incluyeBano: true,
  tipoAgua: "calefon-electrico",
  lavarropas: "bano",
  materiales: { exterior: "blanco", piso: "nogal-oscuro" },
  upgrades: ["panel-100"],
  precioEstimado: 15000,
};

describe("pedidoSchema", () => {
  it("acepta un conjunto de datos válidos", () => {
    const result = pedidoSchema.safeParse(valid);
    expect(result.success).toBe(true);
  });

  it("acepta sin precioEstimado (opcional)", () => {
    expect(pedidoSchema.safeParse({ ...valid, precioEstimado: undefined }).success).toBe(true);
  });

  it("rechaza clienteNombre demasiado corto", () => {
    expect(pedidoSchema.safeParse({ ...valid, clienteNombre: "AB" }).success).toBe(false);
  });

  it("acepta clienteNombre con números y puntos", () => {
    expect(
      pedidoSchema.safeParse({ ...valid, clienteNombre: "Constructora Sur S.A." }).success
    ).toBe(true);
  });

  it("rechaza clienteWhatsapp inválido", () => {
    expect(pedidoSchema.safeParse({ ...valid, clienteWhatsapp: "123" }).success).toBe(false);
  });

  it("rechaza clienteEmail malformado", () => {
    expect(pedidoSchema.safeParse({ ...valid, clienteEmail: "noemail" }).success).toBe(false);
  });

  it("rechaza modelo fuera de las opciones válidas", () => {
    expect(pedidoSchema.safeParse({ ...valid, modelo: "60ft" }).success).toBe(false);
  });

  it("rechaza finalidad fuera de las opciones válidas", () => {
    expect(pedidoSchema.safeParse({ ...valid, finalidad: "otra" }).success).toBe(false);
  });

  it("rechaza tipoCocina fuera de las opciones válidas", () => {
    expect(pedidoSchema.safeParse({ ...valid, tipoCocina: "microondas" }).success).toBe(false);
  });

  it("rechaza tipoAgua fuera de las opciones válidas", () => {
    expect(pedidoSchema.safeParse({ ...valid, tipoAgua: "solar" }).success).toBe(false);
  });

  it("rechaza lavarropas fuera de las opciones válidas", () => {
    expect(pedidoSchema.safeParse({ ...valid, lavarropas: "patio" }).success).toBe(false);
  });

  it("rechaza habitaciones fuera de rango", () => {
    expect(pedidoSchema.safeParse({ ...valid, habitaciones: 0 }).success).toBe(false);
    expect(pedidoSchema.safeParse({ ...valid, habitaciones: 4 }).success).toBe(false);
  });

  it("rechaza objeto vacío", () => {
    expect(pedidoSchema.safeParse({}).success).toBe(false);
  });

  it("acepta empresa con razonSocial y nombreContacto", () => {
    const result = pedidoSchema.safeParse({
      ...valid,
      clienteNombre: "Constructora Sur S.A.",
      tipoCliente: "empresa",
      razonSocial: "Constructora Sur S.A.",
      nombreContacto: "María López",
    });
    expect(result.success).toBe(true);
  });

  it("aplica default vacío a upgrades si se omite", () => {
    const result = pedidoSchema.safeParse({ ...valid, upgrades: undefined });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.upgrades).toEqual([]);
    }
  });

  it("acepta materiales con valores null (opción no elegida)", () => {
    const result = pedidoSchema.safeParse({
      ...valid,
      materiales: { exterior: "blanco", banera: null },
    });
    expect(result.success).toBe(true);
  });

  it("notasConfiguracion: opcional, se recorta, vacío es null y tope de 1000 caracteres", () => {
    const parse = (notasConfiguracion?: string | null) => pedidoSchema.safeParse({ ...valid, notasConfiguracion });
    expect(parse().data?.notasConfiguracion).toBeNull();
    expect(parse(null).data?.notasConfiguracion).toBeNull();
    expect(parse("   ").data?.notasConfiguracion).toBeNull();
    expect(parse("  rampa  ").data?.notasConfiguracion).toBe("rampa");
    expect(parse("a".repeat(1000)).success).toBe(true);
    expect(parse("a".repeat(1001)).success).toBe(false);
  });
});
