import { describe, it, expect } from "vitest";
import {
  estadoFabricacionOptions,
  estadoFabricacionLabels,
  estadoFabricacionIndex,
  estadoFabricacionColors,
  SECCIONES_UNIDAD,
  SECCIONES_ENVIO,
  seccionUnidadKeys,
  seccionEnvioKeys,
} from "@/lib/envios/constantes";

describe("estadoFabricacion", () => {
  it("tiene un label para cada estado", () => {
    for (const estado of estadoFabricacionOptions) {
      expect(estadoFabricacionLabels[estado]).toBeTruthy();
    }
  });

  it("tiene un color para cada estado", () => {
    for (const estado of estadoFabricacionOptions) {
      expect(estadoFabricacionColors[estado]).toBeTruthy();
    }
  });

  it("estadoFabricacionIndex respeta el orden del flujo", () => {
    expect(estadoFabricacionIndex("pendiente")).toBe(0);
    expect(estadoFabricacionIndex("entregado")).toBe(estadoFabricacionOptions.length - 1);
    expect(estadoFabricacionIndex("en_transito")).toBeGreaterThan(estadoFabricacionIndex("embarcado"));
  });
});

describe("secciones de documentos", () => {
  it("SECCIONES_UNIDAD tiene las 6 carpetas propias de la unidad", () => {
    expect(SECCIONES_UNIDAD).toHaveLength(6);
    expect(seccionUnidadKeys).toContain("01_cliente");
    expect(seccionUnidadKeys).toContain("09_reclamos");
  });

  it("SECCIONES_ENVIO tiene las 3 carpetas compartidas del envío", () => {
    expect(SECCIONES_ENVIO).toHaveLength(3);
    expect(seccionEnvioKeys).toEqual(["04_produccion", "05_embarque", "06_despacho"]);
  });

  it("no hay superposición de keys entre unidad y envío", () => {
    const interseccion = seccionUnidadKeys.filter((k) => (seccionEnvioKeys as string[]).includes(k));
    expect(interseccion).toHaveLength(0);
  });
});
