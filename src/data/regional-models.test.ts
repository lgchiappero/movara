import { describe, it, expect } from "vitest";
import { getModeloKey, PEHUEN_LOCALIDADES, PEHUEN_PROVINCIAS, PROVINCIA_A_MODELO } from "@/data/regional-models";

describe("getModeloKey", () => {
  it("devuelve 'pehuen' cuando provincia y localidad coinciden con la zona cordillerana", () => {
    expect(PEHUEN_PROVINCIAS).toContain("Río Negro");
    expect(getModeloKey("Río Negro", "San Carlos de Bariloche")).toBe("pehuen");
  });

  it("la coincidencia de localidad es insensible a mayúsculas y espacios", () => {
    expect(getModeloKey("Neuquén", "  ESQUEL  ")).toBe("pehuen");
  });

  it("provincia pehuén con localidad que no matchea cae al mapa por provincia", () => {
    const otraLocalidad = getModeloKey("Chubut", "Comodoro Rivadavia");
    expect(otraLocalidad).toBe(PROVINCIA_A_MODELO["Chubut"] ?? "pampa");
    expect(otraLocalidad).not.toBe("pehuen");
  });

  it("sin localidad, no evalúa la lista de Pehuén aunque la provincia matchee", () => {
    expect(getModeloKey("Neuquén")).toBe(PROVINCIA_A_MODELO["Neuquén"] ?? "pampa");
  });

  it("provincia fuera del mapa cae al modelo 'pampa'", () => {
    expect(getModeloKey("Provincia Inexistente")).toBe("pampa");
  });

  it("PEHUEN_LOCALIDADES no está vacío", () => {
    expect(PEHUEN_LOCALIDADES.length).toBeGreaterThan(0);
  });
});
