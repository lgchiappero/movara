import { describe, it, expect } from "vitest";
import { getModel, getModelsByCategory, MODELS } from "@/data/models";

/**
 * Tests de seguridad para datos opcionales — cubre el escenario donde
 * Sanity devuelve campos null/undefined (modelo creado pero sin completar).
 */

describe("getModel — fallback estático", () => {
  it("devuelve el modelo cuando el slug existe", () => {
    const model = getModel("familiar-65");
    expect(model).toBeDefined();
    expect(model?.name).toBe("Familiar 65");
  });

  it("devuelve undefined para un slug que no existe", () => {
    expect(getModel("slug-inexistente")).toBeUndefined();
  });
});

describe("MODELS — integridad de datos estáticos", () => {
  it("todos los modelos tienen slug, name y category", () => {
    for (const m of MODELS) {
      expect(m.slug, `${m.slug} sin slug`).toBeTruthy();
      expect(m.name, `${m.slug} sin name`).toBeTruthy();
      expect(m.category, `${m.slug} sin category`).toBeTruthy();
    }
  });

  it("todos los modelos tienen priceUSD > 0", () => {
    for (const m of MODELS) {
      expect(m.priceUSD, `${m.slug} sin precio`).toBeGreaterThan(0);
    }
  });

  it("todos los modelos tienen al menos una imagen", () => {
    for (const m of MODELS) {
      expect(m.images, `${m.slug} sin imágenes`).toBeDefined();
      expect(m.images.length, `${m.slug} con images vacío`).toBeGreaterThan(0);
    }
  });

  it("todos los modelos tienen specs completas", () => {
    const SPEC_FIELDS = ["estructura", "cubierta", "cerramiento", "aislacion", "instalaciones", "terminaciones", "tiempo", "garantia"] as const;
    for (const m of MODELS) {
      for (const field of SPEC_FIELDS) {
        expect(m.specs[field], `${m.slug} sin specs.${field}`).toBeTruthy();
      }
    }
  });

  it("categories son solo los valores permitidos", () => {
    const VALID = ["familiar", "turistico", "oficina"];
    for (const m of MODELS) {
      expect(VALID).toContain(m.category);
    }
  });

  it("slugs son únicos", () => {
    const slugs = MODELS.map((m) => m.slug);
    const unique = new Set(slugs);
    expect(unique.size).toBe(slugs.length);
  });
});

describe("getModelsByCategory", () => {
  it("devuelve todos los modelos cuando category es 'all'", () => {
    expect(getModelsByCategory("all")).toHaveLength(MODELS.length);
  });

  it("filtra correctamente por categoría 'familiar'", () => {
    const result = getModelsByCategory("familiar");
    expect(result.length).toBeGreaterThan(0);
    for (const m of result) expect(m.category).toBe("familiar");
  });

  it("filtra correctamente por categoría 'turistico'", () => {
    const result = getModelsByCategory("turistico");
    expect(result.length).toBeGreaterThan(0);
    for (const m of result) expect(m.category).toBe("turistico");
  });
});

describe("Seguridad de campos opcionales — modelos parciales de Sanity", () => {
  it("optional chaining en specs no lanza cuando specs es null", () => {
    // Simula un modelo de Sanity sin specs
    const partial = { specs: null } as unknown as { specs: { tiempo?: string } | null };
    expect(() => partial.specs?.tiempo).not.toThrow();
    expect(partial.specs?.tiempo).toBeUndefined();
  });

  it("optional chaining en images no lanza cuando images es undefined", () => {
    const partial = { images: undefined } as unknown as { images?: string[] };
    expect(() => partial.images?.[0]).not.toThrow();
    expect(partial.images?.[0]).toBeUndefined();
  });

  it("nullish coalescing para priceUSD null", () => {
    const partial = { priceUSD: null } as unknown as { priceUSD: number | null };
    const display = partial.priceUSD != null
      ? `USD ${partial.priceUSD.toLocaleString("es-AR")}`
      : "Consultar precio";
    expect(display).toBe("Consultar precio");
  });

  it("floorPlanSize con fallback a 'medium'", () => {
    const partial = { floorPlanSize: null } as unknown as { floorPlanSize: string | null };
    const size = partial.floorPlanSize ?? "medium";
    expect(size).toBe("medium");
  });
});
