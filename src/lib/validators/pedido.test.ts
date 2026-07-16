import { describe, it, expect } from "vitest";
import { pedidoSchema } from "@/lib/validators/pedido";

const valid = {
  configId: "ckabc12300000abcdefghijk",
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
  lavarropaIncluye: true,
  lavarropaUbicacion: "bano",
  energiaSolar: "kit_incluido",
  calefon: "electrico",
  galeria: "balcon_techo",
  mejoraParedes100: true,
  mejoraTripleVidrio: false,
  mejoraTechoSandwich: false,
  paredInteriorColor: "blanco",
  paredInteriorRevestimiento: "pintura_lisa",
  paredExteriorColor: "gris",
  paredExteriorRevestimiento: "chapa_prepintada",
  banoRevestimiento: "ceramico_blanco",
  banoColorSanitarios: "blanco",
  cocinaRevestimiento: "ceramico_blanco",
  cocinaColorMuebles: "blanco",
  puertaPrincipalTipo: "placa_simple",
  puertaPrincipalMaterial: "acero_pintado",
  puertaPrincipalColor: "blanco",
  puertaInteriorTipo: "placa",
  puertaInteriorColor: "blanco",
  ventanaTipo: "tipo_a",
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

  it("rechaza sin configId", () => {
    const { configId, ...rest } = valid;
    expect(pedidoSchema.safeParse(rest).success).toBe(false);
  });

  it("acepta leadId cuid opcional", () => {
    expect(
      pedidoSchema.safeParse({ ...valid, leadId: "cktest12300000abcdefghijk" }).success
    ).toBe(true);
  });

  it("rechaza leadId con formato inválido", () => {
    expect(pedidoSchema.safeParse({ ...valid, leadId: "not-a-cuid!" }).success).toBe(false);
  });

  // ─── Lavarropas ───────────────────────────────────────────

  it("acepta lavarropaIncluye false sin ubicación", () => {
    const { lavarropaUbicacion, ...rest } = valid;
    const result = pedidoSchema.safeParse({ ...rest, lavarropaIncluye: false });
    expect(result.success).toBe(true);
  });

  it("rechaza lavarropaIncluye true sin lavarropaUbicacion", () => {
    const { lavarropaUbicacion, ...rest } = valid;
    const result = pedidoSchema.safeParse({ ...rest, lavarropaIncluye: true });
    expect(result.success).toBe(false);
  });

  it("rechaza lavarropaUbicacion fuera de las opciones válidas", () => {
    expect(
      pedidoSchema.safeParse({ ...valid, lavarropaUbicacion: "patio" }).success
    ).toBe(false);
  });

  it("acepta las tres ubicaciones válidas de lavarropas", () => {
    for (const ubicacion of ["bano", "cocina", "espacio_externo"]) {
      expect(
        pedidoSchema.safeParse({ ...valid, lavarropaUbicacion: ubicacion }).success
      ).toBe(true);
    }
  });

  // ─── Acabados y diseño ─────────────────────────────────────

  it("rechaza paredInteriorColor fuera de las opciones válidas", () => {
    expect(
      pedidoSchema.safeParse({ ...valid, paredInteriorColor: "rosa" }).success
    ).toBe(false);
  });

  it("rechaza paredExteriorRevestimiento fuera de las opciones válidas", () => {
    expect(
      pedidoSchema.safeParse({ ...valid, paredExteriorRevestimiento: "ladrillo" }).success
    ).toBe(false);
  });

  it("rechaza banoColorSanitarios fuera de las opciones válidas", () => {
    expect(
      pedidoSchema.safeParse({ ...valid, banoColorSanitarios: "dorado" }).success
    ).toBe(false);
  });

  it("rechaza cocinaColorMuebles fuera de las opciones válidas", () => {
    expect(
      pedidoSchema.safeParse({ ...valid, cocinaColorMuebles: "rojo" }).success
    ).toBe(false);
  });

  // ─── Puertas y aberturas ────────────────────────────────────

  it("rechaza puertaPrincipalTipo fuera de las opciones válidas", () => {
    expect(
      pedidoSchema.safeParse({ ...valid, puertaPrincipalTipo: "blindada" }).success
    ).toBe(false);
  });

  it("rechaza puertaPrincipalMaterial fuera de las opciones válidas", () => {
    expect(
      pedidoSchema.safeParse({ ...valid, puertaPrincipalMaterial: "madera" }).success
    ).toBe(false);
  });

  it("rechaza puertaInteriorTipo fuera de las opciones válidas", () => {
    expect(
      pedidoSchema.safeParse({ ...valid, puertaInteriorTipo: "vaiven" }).success
    ).toBe(false);
  });

  it("rechaza ventanaTipo fuera de las opciones válidas", () => {
    expect(pedidoSchema.safeParse({ ...valid, ventanaTipo: "tipo_d" }).success).toBe(false);
  });

  it("acepta los tres tipos de ventana válidos", () => {
    for (const tipo of ["tipo_a", "tipo_b", "tipo_c"]) {
      expect(pedidoSchema.safeParse({ ...valid, ventanaTipo: tipo }).success).toBe(true);
    }
  });
});
