import { describe, it, expect } from "vitest";
import { rutasARevalidar, TIPOS_CON_REVALIDACION } from "./revalidacion";

describe("rutasARevalidar", () => {
  it("cubre los tipos de Sanity que leen las páginas", () => {
    expect(TIPOS_CON_REVALIDACION.sort()).toEqual(
      ["configuradorModelos", "configuradorPage", "faqPage", "homePage", "modelo", "quienesSomos", "siteConfig"].sort()
    );
  });

  it("las rutas con [slug] llevan type page; todo el sitio es el layout raíz", () => {
    expect(rutasARevalidar("modelo")).toContainEqual({ path: "/modelos/[slug]", type: "page" });
    expect(rutasARevalidar("siteConfig")).toEqual([{ path: "/", type: "layout" }]);
  });

  it("un tipo desconocido no revalida nada", () => {
    expect(rutasARevalidar("flexPage")).toEqual([]);
  });
});
