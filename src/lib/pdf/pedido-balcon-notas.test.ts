import { describe, it, expect } from "vitest";
import { buildPedidoNarrativeEs } from "@/lib/pdf/pedido-narrative-es";
import { buildSupplierSpecItems } from "@/lib/pdf/pedido-spec";
import type { PedidoRecord } from "@/lib/pdf/pedido-record";

const base: PedidoRecord = {
  clienteNombre: "Cliente de prueba",
  clienteWhatsapp: null,
  modelo: "20ft",
  finalidad: "vivienda",
  provincia: "Santa Fe",
  localidad: "Sunchales",
  habitaciones: 2,
  incluyeCocina: true,
  tipoCocina: "electrico",
  incluyeBano: true,
  tipoAgua: "calefon-electrico",
  lavarropas: "sin",
  materiales: null,
  upgrades: [],
  notasConfiguracion: null,
};

function grupoEs(items: ReturnType<typeof buildPedidoNarrativeEs>, title: string) {
  const g = items.find((i) => i.type === "group" && i.title === title);
  if (!g || g.type !== "group") throw new Error(`grupo no encontrado: ${title}`);
  return g;
}

function grupoEn(items: ReturnType<typeof buildSupplierSpecItems>, title: string) {
  const g = items.find((i) => i.type === "group" && i.title === title);
  if (!g || g.type !== "group") throw new Error(`group not found: ${title}`);
  return g;
}

describe("PDF del cliente — balcón y opciones a consultar", () => {
  it("con sobretecho completo, el balcón, el techo, la bañera y el muro cortina figuran como A consultar", () => {
    const items = buildPedidoNarrativeEs({
      ...base,
      materiales: { balcon: "lateral", techoBalcon: "completo", muroVidrio: "vidrio-01", banera: "banera-01" },
    });
    expect(grupoEs(items, "Balcón").bullets).toEqual([
      "Balcón: Balcón lateral — A consultar",
      "Techo del balcón: Sobretecho completo: balcón y toda la unidad — A consultar",
    ]);
    expect(grupoEs(items, "Extras exteriores").bullets).toContain("Muro cortina de vidrio: Muro cortina de vidrio — A consultar");
    expect(grupoEs(items, "Baño").bullets).toContain("Bañera: Bañera — opción 1 — A consultar");
  });

  it("con sobretecho solo en el balcón tiene precio: no dice A consultar; el inodoro inteligente figura en el baño", () => {
    const items = buildPedidoNarrativeEs({
      ...base,
      materiales: { balcon: "frontal", techoBalcon: "solo-balcon", inodoro: "inteligente-bidet" },
    });
    expect(grupoEs(items, "Balcón").bullets).toEqual(["Balcón: Balcón frontal", "Techo del balcón: Sobretecho solo en el balcón"]);
    expect(grupoEs(items, "Baño").bullets).toContain("Inodoro: Inodoro inteligente con bidet");
  });

  it("sin balcón no dice A consultar", () => {
    const items = buildPedidoNarrativeEs({ ...base, materiales: {} });
    expect(grupoEs(items, "Balcón").bullets).toEqual(["Balcón: no incluye", "Techo del balcón: no incluye"]);
  });

  it("un pedido viejo con galería y balcones de mejoras se sigue viendo", () => {
    const items = buildPedidoNarrativeEs({
      ...base,
      materiales: { galeria: "galeria-01" },
      upgrades: ["balcon-delantero", "kit-solar", "vmc"],
    });
    expect(grupoEs(items, "Configuración anterior").bullets).toEqual([
      "Galería: Galería con sobretecho (configuración anterior)",
    ]);
    expect(grupoEs(items, "Mejoras a cotizar").bullets).toEqual([
      "Balcón delantero (configuración anterior)",
      "Kit solar básico (opción discontinuada)",
      "VMC — Ventilación mecánica (opción discontinuada)",
    ]);
  });

  it("las notas del cliente salen literales (react-pdf no interpreta HTML)", () => {
    const notas = "Acceso con rampa <script>alert(1)</script>\nOrientación norte";
    const items = buildPedidoNarrativeEs({ ...base, notasConfiguracion: notas });
    expect(items).toContainEqual({ type: "line", label: "Notas del cliente", value: notas });
  });
});

describe("PDFs sin zona climática", () => {
  it("el PDF del cliente no tiene la línea Zona y el del proveedor no tiene REGION", () => {
    const es = buildPedidoNarrativeEs(base);
    const en = buildSupplierSpecItems(base);
    expect(es.some((i) => i.type === "line" && i.label === "Zona")).toBe(false);
    expect(en.some((i) => i.type === "line" && i.label === "REGION")).toBe(false);
    expect(es).toContainEqual({ type: "line", label: "Ubicación", value: "Sunchales, Santa Fe" });
    expect(en).toContainEqual({ type: "line", label: "LOCATION", value: "Sunchales, Santa Fe" });
  });
});

describe("PDF del proveedor — balcón, notas y pedidos viejos", () => {
  it("con sobretecho completo el balcón figura como To quote (A consultar)", () => {
    const items = buildSupplierSpecItems({ ...base, materiales: { balcon: "frontal", techoBalcon: "completo" } });
    expect(grupoEn(items, "Balcón").rows).toEqual([
      { label: "Balcony", value: "Balcón frontal — To quote (A consultar)" },
      { label: "Balcony roof", value: "Sobretecho completo: balcón y toda la unidad — To quote (A consultar)" },
    ]);
  });

  it("con sobretecho solo en el balcón no es To quote, y el inodoro inteligente figura sin precio", () => {
    const items = buildSupplierSpecItems({ ...base, materiales: { balcon: "frontal", techoBalcon: "solo-balcon", inodoro: "inteligente-bidet" } });
    expect(grupoEn(items, "Balcón").rows).toEqual([
      { label: "Balcony", value: "Balcón frontal" },
      { label: "Balcony roof", value: "Sobretecho solo en el balcón" },
    ]);
    expect(grupoEn(items, "Baño").rows).toContainEqual({ label: "Toilet", value: "Smart toilet with bidet" });
  });

  it("sin balcón: Not included", () => {
    const items = buildSupplierSpecItems(base);
    expect(grupoEn(items, "Balcón").rows.map((r) => r.value)).toEqual(["Not included", "Not included"]);
  });

  it("incluye las notas del cliente tal como las escribió, y nada si no hay", () => {
    const notas = "Necesito <b>rampa</b> de acceso";
    expect(buildSupplierSpecItems({ ...base, notasConfiguracion: notas })).toContainEqual({
      type: "line",
      label: "CLIENT NOTES (ES)",
      value: notas,
    });
    expect(buildSupplierSpecItems(base).some((i) => i.type === "line" && i.label === "CLIENT NOTES (ES)")).toBe(false);
  });

  it("un pedido viejo con galería y mejoras discontinuadas se sigue viendo", () => {
    const items = buildSupplierSpecItems({ ...base, materiales: { galeria: "galeria-01" }, upgrades: ["panel-100", "algo-raro"] });
    expect(grupoEn(items, "Previous configuration").rows).toEqual([
      { label: "Galería", value: "Galería con sobretecho (configuración anterior)" },
    ]);
    expect(grupoEn(items, "UPGRADES TO QUOTE").rows).toEqual([
      { label: "Upgrade", value: "Panel lana de roca 100mm (opción discontinuada)" },
      { label: "Upgrade", value: "algo-raro" },
    ]);
  });
});

describe("PDFs — agua caliente", () => {
  it("calefón eléctrico en el PDF del cliente y en el del proveedor", () => {
    expect(grupoEs(buildPedidoNarrativeEs(base), "Configuración del espacio").bullets).toContain("Baño: Con baño — calefón eléctrico");
    expect(grupoEn(buildSupplierSpecItems(base), "LAYOUT").rows).toContainEqual({ label: "Bathroom", value: "Electric water heater" });
  });

  it("un pedido viejo con termotanque a gas se sigue viendo como opción discontinuada", () => {
    const viejo = { ...base, tipoAgua: "termotanque-gas" };
    expect(grupoEs(buildPedidoNarrativeEs(viejo), "Configuración del espacio").bullets).toContain(
      "Baño: Con baño — termotanque a gas (opción discontinuada)"
    );
    expect(grupoEn(buildSupplierSpecItems(viejo), "LAYOUT").rows).toContainEqual({
      label: "Bathroom",
      value: "Gas water heater (discontinued option)",
    });
  });
});

describe("PDFs — amoblamiento del baño", () => {
  it("el elegido figura en el baño: en castellano en el del cliente, en inglés en el del proveedor", () => {
    const data = { ...base, materiales: { panelesBano: "blanco-liso", amoblamientoBano: "amoblamiento-03" } };
    expect(grupoEs(buildPedidoNarrativeEs(data), "Baño").bullets).toContain("Amoblamiento del baño: Amoblamiento — opción 3");
    expect(grupoEn(buildSupplierSpecItems(data), "Baño").rows).toContainEqual({ label: "Bathroom furniture", value: "Bathroom furniture — option 3" });
  });

  it("un pedido viejo sin el dato muestra —", () => {
    const data = { ...base, materiales: { panelesBano: "blanco-liso" } };
    expect(grupoEs(buildPedidoNarrativeEs(data), "Baño").bullets).toContain("Amoblamiento del baño: —");
    expect(grupoEn(buildSupplierSpecItems(data), "Baño").rows).toContainEqual({ label: "Bathroom furniture", value: "—" });
    // Los otros selectores siguen como antes.
    expect(grupoEn(buildSupplierSpecItems(data), "Baño").rows).toContainEqual({ label: "Bathtub", value: "Not included" });
  });
});
