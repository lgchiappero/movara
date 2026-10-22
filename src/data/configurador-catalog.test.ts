import { describe, it, expect } from "vitest";
import { getStoredUpgradeLabel, UPGRADES_ANTERIORES_KEYS } from "@/data/configurador-catalog";

describe("getStoredUpgradeLabel (pedidos con mejoras del paso que ya no existe)", () => {
  it("los balcones viejos se muestran como configuración anterior", () => {
    expect(getStoredUpgradeLabel("balcon-delantero")).toBe("Balcón delantero (configuración anterior)");
    expect(getStoredUpgradeLabel("balcon-lateral")).toBe("Balcón lateral (configuración anterior)");
  });

  it.each([
    ["panel-100", "Panel lana de roca 100mm (opción discontinuada)"],
    ["triple-vidrio", "Triple vidrio (TDH) (opción discontinuada)"],
    ["kit-solar", "Kit solar básico (opción discontinuada)"],
    ["vmc", "VMC — Ventilación mecánica (opción discontinuada)"],
    ["pu120", "Panel PU 120mm (opción discontinuada)"],
  ])("las mejoras universales y regionales se muestran como discontinuadas: %s", (key, label) => {
    expect(getStoredUpgradeLabel(key)).toBe(label);
  });

  it("los extras cargados por el admin conservan su nombre", () => {
    expect(getStoredUpgradeLabel("banera")).toBe("Bañera");
  });

  it("un key desconocido se muestra tal cual, sin perder el dato", () => {
    expect(getStoredUpgradeLabel("algo-raro")).toBe("algo-raro");
  });

  it("cubre los 5 universales y las 25 regionales del configurador viejo", () => {
    expect(UPGRADES_ANTERIORES_KEYS).toHaveLength(30);
    expect(new Set(UPGRADES_ANTERIORES_KEYS).size).toBe(30);
  });
});
