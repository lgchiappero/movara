import { describe, it, expect } from "vitest";
import { PRECIO_INCLUYE, PRECIO_NO_INCLUYE } from "@/data/precio-incluye";
import { FAQ_CATEGORIES } from "@/data/faq";

describe("qué incluye el precio de un modelo", () => {
  it("no da por incluidos el traslado, las conexiones, la instalación ni los planos", () => {
    for (const item of PRECIO_INCLUYE) {
      expect(item).not.toMatch(/transporte|traslado|flete|conexi|instalaci|planos|permisos|descarga|platea/i);
    }
  });

  it("aclara que el traslado, la descarga, la base y las conexiones van aparte", () => {
    const texto = PRECIO_NO_INCLUYE.join(" ");
    for (const palabra of ["Traslado", "Descarga", "platea", "Conexiones", "permisos"]) {
      expect(texto).toContain(palabra);
    }
  });

  it("coincide con la pregunta frecuente sobre el precio", () => {
    const respuestas = FAQ_CATEGORIES.flatMap((c) => c.preguntas.map((p) => p.respuesta)).join(" ");
    expect(respuestas).toContain("No incluye: flete hasta tu provincia, descarga, la platea o pilotes, conexiones de servicios ni permisos municipales");
  });
});
