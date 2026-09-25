import { describe, it, expect } from "vitest";
import {
  ETAPA_OPTIONS,
  ETAPA_LABELS,
  ETAPA_COLORS,
  ETAPAS_FINALES,
  ORIGEN_OPTIONS,
  ORIGEN_LABELS,
  ORIGEN_COLORS,
} from "@/lib/leads/constantes";

describe("etapas del pipeline", () => {
  it("tiene 5 etapas", () => {
    expect(ETAPA_OPTIONS).toHaveLength(5);
  });

  it("tiene label y color para cada etapa", () => {
    for (const etapa of ETAPA_OPTIONS) {
      expect(ETAPA_LABELS[etapa]).toBeTruthy();
      expect(ETAPA_COLORS[etapa]).toBeTruthy();
    }
  });

  it("ganado y perdido son las únicas etapas finales", () => {
    expect(ETAPAS_FINALES).toEqual(["ganado", "perdido"]);
  });
});

describe("orígenes de lead", () => {
  it("tiene 5 orígenes", () => {
    expect(ORIGEN_OPTIONS).toHaveLength(5);
  });

  it("tiene label y color para cada origen", () => {
    for (const origen of ORIGEN_OPTIONS) {
      expect(ORIGEN_LABELS[origen]).toBeTruthy();
      expect(ORIGEN_COLORS[origen]).toBeTruthy();
    }
  });
});
