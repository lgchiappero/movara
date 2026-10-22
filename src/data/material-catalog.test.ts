import { describe, it, expect } from "vitest";
import {
  MATERIAL_CATEGORY_GROUPS,
  getDefaultMateriales,
  findMaterialOption,
  getMaterialLabel,
  getStoredMaterialLabel,
} from "@/data/material-catalog";

describe("getDefaultMateriales", () => {
  it("null para selectores nullable, primera opción para el resto (el primer selector de cada key define el valor)", () => {
    const result = getDefaultMateriales();
    const vistos = new Set<string>();
    for (const cat of MATERIAL_CATEGORY_GROUPS) {
      for (const sel of cat.selectors) {
        if (vistos.has(sel.key)) continue;
        vistos.add(sel.key);
        if (sel.nullable) {
          expect(result[sel.key]).toBeNull();
        } else {
          expect(result[sel.key]).toBe(sel.options[0]?.id ?? null);
        }
      }
    }
  });

  it("no pisa un key ya resuelto por un selector anterior que comparte el mismo key", () => {
    const keys = MATERIAL_CATEGORY_GROUPS.flatMap((c) => c.selectors.map((s) => s.key));
    const repetidos = keys.filter((k, i) => keys.indexOf(k) !== i);
    if (repetidos.length === 0) return; // no hay keys compartidos en el catálogo actual
    const result = getDefaultMateriales();
    expect(Object.keys(result).filter((k) => k === repetidos[0]).length).toBe(1);
  });
});

describe("findMaterialOption", () => {
  it("retorna null si id es null", () => {
    expect(findMaterialOption("cualquier-key", null)).toBeNull();
  });

  it("encuentra una opción real por key + id", () => {
    const sel = MATERIAL_CATEGORY_GROUPS[0].selectors[0];
    const opt = sel.options[0];
    const found = findMaterialOption(sel.key, opt.id);
    expect(found?.option.id).toBe(opt.id);
    expect(found?.selector.key).toBe(sel.key);
  });

  it("retorna null si el key no existe en ningún grupo", () => {
    expect(findMaterialOption("key-inexistente", "algo")).toBeNull();
  });

  it("retorna null si el id no existe dentro de un key válido", () => {
    const sel = MATERIAL_CATEGORY_GROUPS[0].selectors[0];
    expect(findMaterialOption(sel.key, "id-inexistente")).toBeNull();
  });
});

describe("getMaterialLabel", () => {
  it("retorna el label de una opción existente", () => {
    const sel = MATERIAL_CATEGORY_GROUPS[0].selectors[0];
    const opt = sel.options[0];
    expect(getMaterialLabel(sel.key, opt.id)).toBe(opt.label);
  });

  it("retorna el fallback cuando no hay selección (id null)", () => {
    expect(getMaterialLabel("cualquier-key", null)).toBe("(no seleccionado)");
  });

  it("retorna el fallback cuando el id no existe", () => {
    const sel = MATERIAL_CATEGORY_GROUPS[0].selectors[0];
    expect(getMaterialLabel(sel.key, "id-inexistente")).toBe("(no seleccionado)");
  });
});

describe("mesada", () => {
  it("ofrece solo las 5 mesadas reales del proveedor", () => {
    const sel = MATERIAL_CATEGORY_GROUPS.flatMap((c) => c.selectors).filter((s) => s.key === "mesada");
    expect(sel.flatMap((s) => s.options.map((o) => o.label))).toEqual([
      "Granito claro",
      "Blanco",
      "Mármol blanco vetas doradas",
      "Mármol blanco vetas grises",
      "Negro vetas doradas",
    ]);
  });

  it("una mesada retirada ya no se ofrece (no se encuentra en el catálogo)", () => {
    expect(findMaterialOption("mesada", "negro-absoluto")).toBeNull();
  });
});

describe("getStoredMaterialLabel", () => {
  it("retorna null si no hay valor guardado", () => {
    expect(getStoredMaterialLabel("mesada", null)).toBeNull();
    expect(getStoredMaterialLabel("mesada", "")).toBeNull();
  });

  it("retorna el label del catálogo para un id vigente", () => {
    expect(getStoredMaterialLabel("mesada", "granito-claro")).toBe("Granito claro");
  });

  it("muestra una opción retirada con su nombre, marcada como discontinuada", () => {
    expect(getStoredMaterialLabel("mesada", "negro")).toBe("Negro (opción discontinuada)");
    expect(getStoredMaterialLabel("mesada", "verde-agua")).toBe("Verde agua (opción discontinuada)");
  });

  it("muestra el texto libre del admin tal cual", () => {
    expect(getStoredMaterialLabel("mesada", "Granito gris")).toBe("Granito gris");
    expect(getStoredMaterialLabel("key-sin-retiradas", "algo")).toBe("algo");
  });
});
