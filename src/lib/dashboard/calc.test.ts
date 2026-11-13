import { describe, it, expect } from "vitest";
import { seccionesFaltantes } from "@/lib/dashboard/calc";

describe("seccionesFaltantes", () => {
  const criticas = ["02_contrato", "03_pagos", "07_entrega"] as const;

  it("todas faltantes si no hay ningún documento", () => {
    expect(seccionesFaltantes([], criticas)).toEqual(["02_contrato", "03_pagos", "07_entrega"]);
  });

  it("excluye las secciones que ya tienen documento", () => {
    expect(seccionesFaltantes(["03_pagos"], criticas)).toEqual(["02_contrato", "07_entrega"]);
  });

  it("vacío si todas las críticas tienen documento", () => {
    expect(seccionesFaltantes(["02_contrato", "03_pagos", "07_entrega"], criticas)).toEqual([]);
  });

  it("ignora secciones no críticas presentes en la lista de documentos", () => {
    expect(seccionesFaltantes(["01_cliente", "09_reclamos"], criticas)).toEqual([
      "02_contrato",
      "03_pagos",
      "07_entrega",
    ]);
  });
});
