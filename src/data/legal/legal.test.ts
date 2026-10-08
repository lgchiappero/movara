import { describe, it, expect } from "vitest";
import { POLITICA_PRIVACIDAD } from "./privacidad";
import { TERMINOS_CONDICIONES } from "./terminos";
import { EMPRESA } from "./empresa";
import { camposPendientes, type DocumentoLegal } from "@/lib/legal/campos";

function plano(d: DocumentoLegal): string {
  return [d.titulo, d.intro, ...d.secciones.flatMap((s) => [s.titulo, ...s.bloques.flatMap((b) => (b.tipo === "p" ? [b.texto] : b.items))])].join("\n");
}

const DOCS = [POLITICA_PRIVACIDAD, TERMINOS_CONDICIONES];

describe("textos legales", () => {
  it("los ids de las secciones son únicos (anclas del índice)", () => {
    for (const d of DOCS) {
      const ids = d.secciones.map((s) => s.id);
      expect(new Set(ids).size).toBe(ids.length);
    }
  });

  it("no queda ningún campo entre corchetes: listos para publicar en producción", () => {
    for (const d of DOCS) expect(camposPendientes(d)).toEqual([]);
    for (const v of Object.values(EMPRESA)) expect(v).not.toMatch(/[[\]]/);
  });

  it("identifican al responsable con razón social, CUIT, domicilio y jurisdicción", () => {
    for (const d of DOCS) {
      const t = plano(d);
      expect(t).toContain(EMPRESA.razonSocial);
      expect(t).toContain("CUIT 20-31832112-5");
      expect(t).toContain(EMPRESA.domicilio);
    }
    expect(plano(TERMINOS_CONDICIONES)).toContain("tribunales ordinarios de la ciudad de Rafaela, provincia de Santa Fe");
  });

  it("sin mencionar al proveedor, sin 'plegable' y sin claims de producción nacional", () => {
    for (const d of DOCS) {
      const t = plano(d).toLowerCase();
      expect(t).not.toMatch(/plegable|heshi|proveedor de la unidad/);
      expect(t).not.toMatch(/fabricaci[oó]n argentina|hecho en argentina|industria argentina|producci[oó]n nacional|fabricad[ao]s? en (argentina|el pa[ií]s)/);
    }
  });

  it("privacidad: Ley 25.326, transferencia internacional, plazos de respuesta y los dos textos obligatorios", () => {
    const t = plano(POLITICA_PRIVACIDAD);
    expect(t).toContain("Ley 25.326");
    expect(t).toContain("artículo 12 de la Ley 25.326");
    expect(t).toContain("10 días corridos");
    expect(t).toContain("5 días hábiles");
    expect(t).toContain("en forma gratuita a intervalos no inferiores a seis meses");
    expect(t).toContain("La AGENCIA DE ACCESO A LA INFORMACIÓN PÚBLICA, en su carácter de Órgano de Control de la Ley N° 25.326");
    expect(t).toContain("Meta Pixel");
    expect(t).toContain("Washington D.C., Estados Unidos");
    expect(t).toContain("San Pablo, Brasil");
    expect(t).toContain("contacto@movara.com.ar");
  });

  it("términos: imágenes ilustrativas, valores referenciales, presupuesto escrito como oferta formal, 90 días, garantía, Ley 24.240", () => {
    const t = plano(TERMINOS_CONDICIONES);
    expect(t).not.toMatch(/vinculante|orientativ/i);
    expect(t).toContain("son ilustrativos");
    expect(t).toContain("son referenciales");
    expect(t).toContain("La oferta formal de MOVARA es el presupuesto escrito y personalizado que entregamos a cada cliente, con su plazo de validez.");
    expect(t).toContain("contrato de compra");
    expect(t).toContain("90 días en adelante desde que se confirma el pedido con el anticipo");
    expect(t).toContain("garantía de 12 meses desde la entrega");
    expect(t).toContain("Ley 24.240");
    expect(t).toContain("República Argentina");
  });

  it("los dos tienen fecha de actualización", () => {
    for (const d of DOCS) expect(d.actualizado).toMatch(/\d{1,2} de [a-z]+ de \d{4}/);
  });
});
