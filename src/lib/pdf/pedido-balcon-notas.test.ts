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

describe("PDF del cliente — balcón y opciones a cotizar", () => {
  it("el balcón, el techo y el muro cortina figuran como A cotizar", () => {
    const items = buildPedidoNarrativeEs({
      ...base,
      materiales: { balcon: "lateral", techoBalcon: "completo", muroVidrio: "vidrio-01" },
    });
    expect(grupoEs(items, "Balcón").bullets).toEqual([
      "Balcón: Balcón lateral — A cotizar",
      "Techo del balcón: Sobretecho completo: balcón y toda la unidad — A cotizar",
    ]);
    expect(grupoEs(items, "Extras exteriores").bullets).toContain("Muro cortina de vidrio: Muro cortina de vidrio — A cotizar");
  });

  it("sin balcón no dice A cotizar", () => {
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
  it("el balcón figura como To quote (A cotizar)", () => {
    const items = buildSupplierSpecItems({ ...base, materiales: { balcon: "frontal", techoBalcon: "solo-balcon" } });
    expect(grupoEn(items, "Balcón").rows).toEqual([
      { label: "Balcony", value: "Balcón frontal — To quote (A cotizar)" },
      { label: "Balcony roof", value: "Sobretecho solo en el balcón — To quote (A cotizar)" },
    ]);
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
