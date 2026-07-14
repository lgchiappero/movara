import { describe, it, expect } from "vitest";
import { pedidoSchema } from "@/lib/validators/pedido";

const valid = {
  clienteNombre: "Juan García",
  clienteWhatsapp: "+54 9 11 1234-5678",
  clienteEmail: "juan@example.com",
  modelo: "20ft",
  zonaClimatica: "templada",
  banoInodoro: "estandar",
  banoEspejo: "comun",
  banoDucha: "estandar_esquinero",
  cocinaTipo: "vitroceramica",
  cocinaExtractor: true,
  cocinaAlacena: false,
  cocinaVentana: false,
  aberturaRejas: false,
  aberturaMosquitero: true,
  aberturaCortinas: false,
  lavarropas: "con_preinstalacion",
  energiaSolar: "kit_incluido",
  calefon: "electrico",
  galeria: "balcon_techo",
  mejoraParedes100: true,
  mejoraTripleVidrio: false,
  mejoraTechoSandwich: false,
};

describe("pedidoSchema", () => {
  it("acepta un conjunto de datos válidos", () => {
    expect(pedidoSchema.safeParse(valid).success).toBe(true);
  });

  it("acepta clienteEmail vacío (opcional)", () => {
    expect(pedidoSchema.safeParse({ ...valid, clienteEmail: "" }).success).toBe(true);
  });

  it("rechaza clienteNombre inválido", () => {
    expect(pedidoSchema.safeParse({ ...valid, clienteNombre: "AB" }).success).toBe(false);
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

  it("rechaza zonaClimatica fuera de las opciones válidas", () => {
    expect(pedidoSchema.safeParse({ ...valid, zonaClimatica: "tropical" }).success).toBe(false);
  });

  it("rechaza banoInodoro fuera de las opciones válidas", () => {
    expect(pedidoSchema.safeParse({ ...valid, banoInodoro: "oro" }).success).toBe(false);
  });

  it("aplica default false a los checkboxes térmicos si se omiten", () => {
    const { mejoraParedes100, mejoraTripleVidrio, mejoraTechoSandwich, ...rest } = valid;
    const result = pedidoSchema.safeParse(rest);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.mejoraParedes100).toBe(false);
      expect(result.data.mejoraTripleVidrio).toBe(false);
      expect(result.data.mejoraTechoSandwich).toBe(false);
    }
  });

  it("rechaza objeto vacío", () => {
    expect(pedidoSchema.safeParse({}).success).toBe(false);
  });

  it("acepta leadId cuid opcional", () => {
    expect(
      pedidoSchema.safeParse({ ...valid, leadId: "cktest12300000abcdefghijk" }).success
    ).toBe(true);
  });

  it("rechaza leadId con formato inválido", () => {
    expect(pedidoSchema.safeParse({ ...valid, leadId: "not-a-cuid!" }).success).toBe(false);
  });
});
