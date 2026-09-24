import { describe, it, expect } from "vitest";
import { diasHasta, seccionesFaltantes } from "@/lib/dashboard/calc";

describe("diasHasta", () => {
  const ahora = new Date(2026, 8, 24, 15, 30); // 24 sep 2026, 15:30 local

  it("devuelve null si no hay fecha", () => {
    expect(diasHasta(null, ahora)).toBeNull();
  });

  it("devuelve 0 si la fecha es hoy, sin importar la hora", () => {
    expect(diasHasta(new Date(2026, 8, 24, 2, 0), ahora)).toBe(0);
  });

  it("devuelve positivo para una fecha futura", () => {
    expect(diasHasta(new Date(2026, 8, 31), ahora)).toBe(7);
  });

  it("devuelve negativo para una fecha ya pasada", () => {
    expect(diasHasta(new Date(2026, 8, 20), ahora)).toBe(-4);
  });
});

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
