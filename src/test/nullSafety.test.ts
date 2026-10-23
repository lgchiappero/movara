import { describe, it, expect } from "vitest";

describe("Seguridad de campos opcionales — modelos parciales de Sanity", () => {
  it("optional chaining en specs no lanza cuando specs es null", () => {
    const partial = { specs: null } as unknown as { specs: { tiempo?: string } | null };
    expect(() => partial.specs?.tiempo).not.toThrow();
    expect(partial.specs?.tiempo).toBeUndefined();
  });

  it("optional chaining en images no lanza cuando images es undefined", () => {
    const partial = { images: undefined } as unknown as { images?: string[] };
    expect(() => partial.images?.[0]).not.toThrow();
    expect(partial.images?.[0]).toBeUndefined();
  });

  it("floorPlanSize con fallback a 'medium'", () => {
    const partial = { floorPlanSize: null } as unknown as { floorPlanSize: string | null };
    const size = partial.floorPlanSize ?? "medium";
    expect(size).toBe("medium");
  });
});
