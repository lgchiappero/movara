import { describe, it, expect } from "vitest";
import {
  MATERIAL_CATEGORY_GROUPS,
  getDefaultMateriales,
  findMaterialOption,
  getMaterialLabel,
  getStoredMaterialLabel,
  getOpcionesAConsultar,
  esSelectorAConsultar,
  getExtrasElegidos,
  getMaterialesAnteriores,
  materialesSegunAmbientes,
  AMOBLAMIENTO_BANO_OPCIONES,
  AMOBLAMIENTO_BANO_EN,
  getExtraDeOpcion,
  etiquetaConExtra,
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

describe("opciones a consultar (bañera, muro cortina, sobretecho completo)", () => {
  it("la bañera y el muro cortina no tienen precio de lista y son los únicos selectores a consultar", () => {
    const aConsultar = MATERIAL_CATEGORY_GROUPS.flatMap((g) => g.selectors).filter((s) => s.aConsultar);
    expect(aConsultar.map((s) => s.key)).toEqual(["banera", "muroVidrio"]);
    expect(aConsultar.every((s) => !s.priceName && s.nullable)).toBe(true);
  });

  it("el techo del balcón: solo en el balcón tiene precio, el completo es a consultar", () => {
    expect(findMaterialOption("techoBalcon", "solo-balcon")?.option).toMatchObject({ priceName: "Balcón con sobretecho" });
    expect(findMaterialOption("techoBalcon", "completo")?.option).toMatchObject({ aConsultar: true });
  });

  it("esSelectorAConsultar depende de lo elegido", () => {
    expect(esSelectorAConsultar("balcon", { balcon: "frontal", techoBalcon: "completo" })).toBe(true);
    expect(esSelectorAConsultar("techoBalcon", { balcon: "frontal", techoBalcon: "completo" })).toBe(true);
    expect(esSelectorAConsultar("balcon", { balcon: "frontal", techoBalcon: "solo-balcon" })).toBe(false);
    expect(esSelectorAConsultar("banera", { banera: "banera-01" })).toBe(true);
    expect(esSelectorAConsultar("banera", { banera: null })).toBe(false);
    expect(esSelectorAConsultar("piso", { piso: "spc-8917" })).toBe(false);
  });

  it("los extras con precio tienen el nombre del precio en precios-extras", () => {
    expect(getExtrasElegidos({ exterior: "premium-02-azul-oscuro", piso: "spc-8911", inodoro: "inteligente-bidet", exterior2: "x" })).toEqual([
      { key: "exterior", nombre: "Panel metálico labrado: Azul oscuro", tipo: "precio", priceName: "Panel metálico labrado" },
      { key: "piso", nombre: "Piso SPC 4 mm: 8911", tipo: "precio", priceName: "Piso SPC 4 mm" },
      { key: "inodoro", nombre: "Inodoro inteligente con bidet", tipo: "precio", priceName: "Inodoro inteligente" },
    ]);
    expect(getExtrasElegidos({ exterior: "gris-oscuro", piso: "nogal-oscuro" })).toEqual([]);
  });

  it("el configurador arranca sin inodoro inteligente", () => {
    expect(getDefaultMateriales().inodoro).toBeNull();
  });

  it("el configurador arranca sin balcón, sin techo y sin muro cortina", () => {
    const d = getDefaultMateriales();
    expect([d.balcon, d.techoBalcon, d.muroVidrio]).toEqual([null, null, null]);
  });

  it("el techo usa las dos fotos del balcón y el muro cortina no tiene foto", () => {
    expect(findMaterialOption("techoBalcon", "solo-balcon")?.option.img).toContain("balcon%20solo.png");
    expect(findMaterialOption("techoBalcon", "completo")?.option.img).toContain("balcon%20con%20techocompleto.png");
    const muro = findMaterialOption("muroVidrio", "vidrio-01")?.option;
    expect(muro?.img).toBeUndefined();
    expect(muro?.descripcion).toBeTruthy();
  });

  it("ya no existe la galería con sobretecho como opción del configurador", () => {
    expect(findMaterialOption("galeria", "galeria-01")).toBeNull();
  });

  it("getOpcionesAConsultar devuelve lo elegido en orden de catálogo e ignora valores inválidos", () => {
    expect(getOpcionesAConsultar({ techoBalcon: "completo", balcon: "frontal", muroVidrio: null, piso: "x" })).toEqual([
      { key: "balcon", nombre: "Balcón frontal" },
      { key: "techoBalcon", nombre: "Sobretecho completo: balcón y toda la unidad" },
    ]);
    expect(getOpcionesAConsultar({ balcon: "no-existe" })).toEqual([]);
  });
});

describe("getMaterialesAnteriores (pedidos con la galería vieja)", () => {
  it("muestra la galería como configuración anterior", () => {
    expect(getMaterialesAnteriores({ galeria: "galeria-01" })).toEqual([
      { key: "galeria", nombre: "Galería", label: "Galería con sobretecho (configuración anterior)" },
    ]);
  });

  it("texto libre en galería se muestra tal cual, y nada si no hay valor", () => {
    expect(getMaterialesAnteriores({ galeria: "Galería de madera" })[0].label).toBe("Galería de madera (configuración anterior)");
    expect(getMaterialesAnteriores({ galeria: null })).toEqual([]);
    expect(getMaterialesAnteriores({})).toEqual([]);
  });
});

describe("materialesSegunAmbientes", () => {
  it("con baño deja todo como está", () => {
    const m = { inodoro: "inteligente-bidet", piso: "spc-8911" };
    expect(materialesSegunAmbientes(m, { incluyeBano: true })).toBe(m);
  });

  it("sin baño saca todo lo del baño (y no suma el inodoro), sin tocar el resto", () => {
    const m = { panelesBano: "marmol-venas", puertaBano: "negro-cuadricula", banera: "banera-01", inodoro: "inteligente-bidet", piso: "spc-8911" };
    const r = materialesSegunAmbientes(m, { incluyeBano: false });
    expect(r).toMatchObject({ panelesBano: null, puertaBano: null, banera: null, inodoro: null, piso: "spc-8911" });
    expect(getExtrasElegidos(r).map((e) => e.key)).toEqual(["piso"]);
    expect(m.inodoro).toBe("inteligente-bidet");
  });
});

describe("amoblamiento del baño", () => {
  const selector = MATERIAL_CATEGORY_GROUPS.find((g) => g.key === "bano-group")!.selectors;

  it("va en el baño después de paneles y puerta, con 4 opciones: la 2 y la 4 traen base de ducha con costo", () => {
    expect(selector.map((s) => s.key).slice(0, 3)).toEqual(["panelesBano", "puertaBano", "amoblamientoBano"]);
    const amob = selector[2];
    expect(amob.label).toBe("Amoblamiento del baño");
    expect(amob).toMatchObject({ fotosVerticales: true, imageFit: "contain" });
    expect(amob.priceName).toBeUndefined();
    expect(amob.aConsultar).toBeUndefined();
    expect(amob.options).toEqual([
      { id: "amoblamiento-01", img: "/configurador/bano/bano-amoblamiento-01.jpg", label: "Amoblamiento — opción 1" },
      {
        id: "amoblamiento-02",
        img: "/configurador/bano/bano-amoblamiento-02.jpg",
        label: "Amoblamiento — opción 2",
        priceName: "Base de ducha",
        descripcion: "Incluye base de ducha negra",
        extraNombre: "Base de ducha (negra)",
      },
      { id: "amoblamiento-03", img: "/configurador/bano/bano-amoblamiento-03.jpg", label: "Amoblamiento — opción 3" },
      {
        id: "amoblamiento-04",
        img: "/configurador/bano/bano-amoblamiento-04.jpg",
        label: "Amoblamiento — opción 4",
        priceName: "Base de ducha",
        descripcion: "Incluye base de ducha blanca",
        extraNombre: "Base de ducha (blanca)",
      },
    ]);
    expect(amob.options.map((o) => o.label)).toEqual([...AMOBLAMIENTO_BANO_OPCIONES]);
  });

  it("arranca en la opción 1, no es un extra y sin baño no se guarda", () => {
    expect(getDefaultMateriales().amoblamientoBano).toBe("amoblamiento-01");
    expect(getExtrasElegidos({ amoblamientoBano: "amoblamiento-03" })).toEqual([]);
    expect(getExtrasElegidos({ amoblamientoBano: "amoblamiento-01" })).toEqual([]);
    expect(materialesSegunAmbientes({ amoblamientoBano: "amoblamiento-03" }, { incluyeBano: false }).amoblamientoBano).toBeNull();
    expect(getStoredMaterialLabel("amoblamientoBano", "amoblamiento-03")).toBe("Amoblamiento — opción 3");
  });

  it("nombres en inglés para el proveedor", () => {
    expect(AMOBLAMIENTO_BANO_EN).toEqual({
      "amoblamiento-01": "Bathroom furniture — option 1",
      "amoblamiento-02": "Bathroom furniture — option 2 · Shower base — black",
      "amoblamiento-03": "Bathroom furniture — option 3",
      "amoblamiento-04": "Bathroom furniture — option 4 · Shower base — white",
    });
  });
});

describe("base de ducha (opciones 2 y 4 del amoblamiento)", () => {
  it("es un extra con precio propio por opción, con nombre negra/blanca", () => {
    expect(getExtrasElegidos({ amoblamientoBano: "amoblamiento-02" })).toEqual([
      { key: "amoblamientoBano", nombre: "Base de ducha (negra)", tipo: "precio", priceName: "Base de ducha" },
    ]);
    expect(getExtrasElegidos({ amoblamientoBano: "amoblamiento-04" })).toEqual([
      { key: "amoblamientoBano", nombre: "Base de ducha (blanca)", tipo: "precio", priceName: "Base de ducha" },
    ]);
  });

  it("getExtraDeOpcion devuelve el extra de la opción elegida, o null", () => {
    expect(getExtraDeOpcion("amoblamientoBano", "amoblamiento-04")).toBe("Base de ducha (blanca)");
    expect(getExtraDeOpcion("amoblamientoBano", "amoblamiento-01")).toBeNull();
    expect(getExtraDeOpcion("amoblamientoBano", null)).toBeNull();
  });

  it("sin baño no se cobra", () => {
    expect(getExtrasElegidos(materialesSegunAmbientes({ amoblamientoBano: "amoblamiento-04" }, { incluyeBano: false }))).toEqual([]);
  });

  it("los demás selectores con precio por opción o por selector no cambian", () => {
    expect(getExtrasElegidos({ piso: "spc-8911" })).toEqual([{ key: "piso", nombre: "Piso SPC 4 mm: 8911", tipo: "precio", priceName: "Piso SPC 4 mm" }]);
    expect(getExtrasElegidos({ balcon: "frontal", techoBalcon: "solo-balcon" })[0]).toMatchObject({ tipo: "precio", priceName: "Balcón con sobretecho" });
  });
});

describe("precio de la base de ducha", () => {
  it("USD 165 de fallback y elegible en la lista del Studio", async () => {
    const { PRECIOS_EXTRAS_DEFAULT, NOMBRES_PRECIOS_EXTRAS, resolvePrecioExtra } = await import("@/data/precios-extras");
    expect(PRECIOS_EXTRAS_DEFAULT["Base de ducha"]).toBe(165);
    expect(NOMBRES_PRECIOS_EXTRAS).toContain("Base de ducha");
    expect(resolvePrecioExtra("Base de ducha", null)).toBe(165);
  });
});

describe("regla de precio: costo de fábrica × 1,35 × 1,21, hacia arriba a múltiplos de 5", () => {
  it("da los precios documentados y redondea siempre hacia arriba", async () => {
    const { precioDesdeCostoFabrica, COSTOS_FABRICA, PRECIOS_EXTRAS_DEFAULT, NOMBRES_PRECIOS_EXTRAS } = await import("@/data/precios-extras");
    expect(precioDesdeCostoFabrica(100)).toBe(165);
    expect(precioDesdeCostoFabrica(200)).toBe(330);
    expect(precioDesdeCostoFabrica(400)).toBe(655);
    expect(precioDesdeCostoFabrica(101)).toBe(165); // 164,98 → 165
    expect(precioDesdeCostoFabrica(0)).toBe(0);
    expect(COSTOS_FABRICA).toEqual({ "Base de ducha": 100, "Puerta doble hoja moderna": 200, "Cocina en U": 400 });
    expect(PRECIOS_EXTRAS_DEFAULT).toMatchObject({ "Base de ducha": 165, "Puerta doble hoja moderna": 330, "Cocina en U": 655, "Cocina ampliada": 500 });
    expect(NOMBRES_PRECIOS_EXTRAS).toEqual(expect.arrayContaining(["Puerta doble hoja moderna", "Cocina en U"]));
  });
});

describe("puerta doble hoja moderna y cocina en U", () => {
  it("solo la puerta doble hoja moderna tiene costo; el selector ya no dice sin costo", () => {
    const sel = MATERIAL_CATEGORY_GROUPS.flatMap((g) => g.selectors).find((s) => s.key === "puertaPrincipal")!;
    expect(sel.label).toBe("Puerta principal");
    expect(sel.options.filter((o) => o.priceName).map((o) => o.id)).toEqual(["doble-hoja-moderna"]);
    expect(getExtrasElegidos({ puertaPrincipal: "doble-hoja-moderna" })).toEqual([
      { key: "puertaPrincipal", nombre: "Puerta doble hoja moderna", tipo: "precio", priceName: "Puerta doble hoja moderna" },
    ]);
    for (const id of ["corredera-doble", "doble-hoja-abatible", "vidrio-lateral"]) expect(getExtrasElegidos({ puertaPrincipal: id })).toEqual([]);
    expect(getDefaultMateriales().puertaPrincipal).toBe("corredera-doble");
  });

  it("las cocinas en U son el extra Cocina en U; las de alacena siguen en Cocina ampliada", () => {
    expect(getExtrasElegidos({ cocinaAmpliada: "ushape-02" })).toEqual([
      { key: "cocinaAmpliada", nombre: "Cocina en U — opción 2", tipo: "precio", priceName: "Cocina en U" },
    ]);
    expect(getExtrasElegidos({ cocinaAmpliada: "alacena-01" })).toEqual([
      { key: "cocinaAmpliada", nombre: "Cocina ampliada: Con alacena — opción 1", tipo: "precio", priceName: "Cocina ampliada" },
    ]);
  });

  it("etiquetaConExtra: muestra solo el extra si ya incluye la opción, si no los dos", () => {
    expect(etiquetaConExtra("Doble hoja moderna", "Puerta doble hoja moderna")).toBe("Puerta doble hoja moderna");
    expect(etiquetaConExtra("En U — opción 1", "Cocina en U — opción 1")).toBe("Cocina en U — opción 1");
    expect(etiquetaConExtra("Amoblamiento — opción 4", "Base de ducha (blanca)")).toBe("Amoblamiento — opción 4 — Base de ducha (blanca)");
    expect(etiquetaConExtra("Maple", null)).toBe("Maple");
  });
});
