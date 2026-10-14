import { describe, it, expect, vi } from "vitest";

// ModeloCard importa urlFor, que necesita el proyecto de Sanity (en CI no hay .env.local).
vi.hoisted(() => {
  process.env.NEXT_PUBLIC_SANITY_PROJECT_ID ||= "proyecto";
  process.env.NEXT_PUBLIC_SANITY_DATASET ||= "production";
});

import { parse, evaluate } from "groq-js";
import { MODELOS_CARD_QUERY } from "../queries";
import { tamanosDeCard, type ModeloCardData } from "@/components/modelos/ModeloCard";

// Corre la query real contra documentos de prueba, como lo haría Sanity.
async function correr(docs: object[]): Promise<ModeloCardData[]> {
  const resultado = await evaluate(parse(MODELOS_CARD_QUERY), { dataset: docs });
  return (await resultado.get()) as ModeloCardData[];
}

const base = { _type: "modelo", _createdAt: "2026-01-01T00:00:00Z", name: "MOVARA Flex", slug: { current: "movara-flex" } };

describe("MODELOS_CARD_QUERY — tamaños", () => {
  it("lista con varios valores: trae los tamaños disponibles", async () => {
    const [m] = await correr([{ ...base, _id: "a", tamanosDisponibles: [18, 38, 77], size: 38 }]);
    expect(m.tamanosDisponibles).toEqual([18, 38, 77]);
    expect(m.superficie).toBe(38);
    expect(tamanosDeCard(m)).toBe("18 · 38 · 77 m²");
  });

  it("lista vacía: la card usa la superficie total", async () => {
    const [m] = await correr([{ ...base, _id: "a", tamanosDisponibles: [], size: 76 }]);
    expect(m.tamanosDisponibles).toEqual([]);
    expect(tamanosDeCard(m)).toBe("76 m²");
  });

  it("sin el campo (documentos anteriores): la card usa la superficie total", async () => {
    const [m] = await correr([{ ...base, _id: "a", size: 76 }]);
    expect(m.tamanosDisponibles).toBeNull();
    expect(tamanosDeCard(m)).toBe("76 m²");
  });

  it("sin tamaños ni superficie: sin línea de tamaños", async () => {
    const [m] = await correr([{ ...base, _id: "a" }]);
    expect(m.superficie).toBeNull();
    expect(tamanosDeCard(m)).toBeNull();
  });
});
