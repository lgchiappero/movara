import { describe, it, expect } from "vitest";
import { findUpgrade, UNIVERSAL_UPGRADES, UPGRADES_BY_REGION } from "@/data/configurador-catalog";

describe("findUpgrade", () => {
  it("encuentra un upgrade universal aunque la región no tenga upgrades propios", () => {
    const universal = UNIVERSAL_UPGRADES[0];
    expect(UPGRADES_BY_REGION["region-que-no-existe"]).toBeUndefined();
    expect(findUpgrade("region-que-no-existe", universal.key)).toEqual(universal);
  });

  it("encuentra un upgrade específico de una región real", () => {
    const [regionKey, upgrades] = Object.entries(UPGRADES_BY_REGION)[0];
    const regional = upgrades[0];
    expect(findUpgrade(regionKey, regional.key)).toEqual(regional);
  });

  it("devuelve undefined si el key no existe en ningún lado", () => {
    expect(findUpgrade("region-que-no-existe", "key-que-no-existe")).toBeUndefined();
  });
});
