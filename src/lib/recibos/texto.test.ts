import { describe, it, expect } from "vitest";
import { construirTextoRecibo, textoPlano, fechaLargaUTC, fechaHoraAR, fechaFinGarantia, TEXTO_RECIBO_VERSION, type DatosTextoRecibo } from "./texto";

const BASE: DatosTextoRecibo = {
  numeroRecibo: "REC-2026-001",
  fechaEntrega: new Date("2026-10-08T00:00:00.000Z"),
  lugarEntrega: "Ruta 34 km 230, Sunchales, Santa Fe",
  observaciones: null,
  clienteNombre: "Ana García",
  clienteDni: "30123456",
  clienteCuit: null,
  numeroUnidad: "MOV-UNIDAD-2026-001",
  modelo: "Flex 38",
};

describe("construirTextoRecibo", () => {
  it("arma título, número, encabezado y las 6 cláusulas", () => {
    const t = construirTextoRecibo(BASE);
    expect(t.titulo).toBe("RECIBO EN CONFORMIDAD DE ENTREGA");
    expect(t.numero).toBe("Nº REC-2026-001");
    expect(t.encabezado).toBe(
      'En Ruta 34 km 230, Sunchales, Santa Fe, el 8 de octubre de 2026, Ana García, DNI 30123456, en adelante "el Cliente", declara:'
    );
    expect(t.clausulas.map((c) => c.titulo)).toEqual([
      "1. Recepción",
      "2. Estado",
      "3. Garantía",
      "4. Alcance",
      "5. Firma electrónica",
      "6. Datos personales",
    ]);
    expect(t.clausulas[0].texto).toContain("la unidad Nº MOV-UNIDAD-2026-001, modelo Flex 38");
    expect(t.clausulas[1].texto).toContain("de acuerdo con lo pactado, sin observaciones.");
    expect(t.clausulas[1].texto).toContain("no implica renuncia a la garantía por defectos de fabricación o vicios ocultos");
    expect(t.clausulas[2].texto).toBe(
      "con esta entrega comienza la garantía de 12 meses, del 8 de octubre de 2026 al 8 de octubre de 2027, con los alcances y condiciones del contrato de compra."
    );
    expect(t.clausulas[4].texto).toContain("artículo 5 de la Ley 25.506");
    expect(t.clausulas[5].texto).toContain("Ley 25.326");
  });

  it("con observaciones usa 'salvo:' y no duplica el punto final", () => {
    const t = construirTextoRecibo({ ...BASE, observaciones: "  Raspón leve en el zócalo.  " });
    expect(t.clausulas[1].texto).toContain("de acuerdo con lo pactado, salvo: Raspón leve en el zócalo. La conformidad");
    expect(t.clausulas[1].texto).not.toContain("..");
  });

  it("observaciones solo con espacios cuentan como 'sin observaciones'", () => {
    expect(construirTextoRecibo({ ...BASE, observaciones: "   " }).clausulas[1].texto).toContain("sin observaciones");
  });

  it("sin DNI usa el CUIT; sin ninguno no menciona documento", () => {
    expect(construirTextoRecibo({ ...BASE, clienteDni: null, clienteCuit: "20-30123456-7" }).encabezado).toContain(
      "Ana García, CUIT 20-30123456-7, en adelante"
    );
    expect(construirTextoRecibo({ ...BASE, clienteDni: " ", clienteCuit: null }).encabezado).toContain("Ana García, en adelante");
  });

  it("no menciona montos, facturas como comprobante emitido, proveedor ni 'plegable'", () => {
    const plano = textoPlano(construirTextoRecibo(BASE)).toLowerCase();
    expect(plano).not.toMatch(/plegable|proveedor|usd|\$|heshi/);
  });
});

describe("textoPlano", () => {
  it("une todo con 'título: texto' y es estable", () => {
    const plano = textoPlano(construirTextoRecibo(BASE));
    expect(plano.startsWith("RECIBO EN CONFORMIDAD DE ENTREGA\nNº REC-2026-001\n\nEn Ruta 34")).toBe(true);
    expect(plano).toContain("\n\n1. Recepción: que recibió de MOVARA");
    expect(plano.endsWith("contacto@movara.com.ar.")).toBe(true);
    expect(textoPlano(construirTextoRecibo(BASE))).toBe(plano);
  });
});

describe("fechas", () => {
  it("fechaLargaUTC no corre el día por la zona horaria", () => {
    expect(fechaLargaUTC(new Date("2026-01-01T00:00:00.000Z"))).toBe("1 de enero de 2026");
  });
  it("fechaHoraAR muestra la hora de Argentina", () => {
    expect(fechaHoraAR(new Date("2026-10-08T13:36:00.000Z"))).toMatch(/8\/10\/2026.*10:36/);
  });
  it("la garantía termina 12 meses después de la entrega", () => {
    expect(fechaFinGarantia(new Date("2026-10-08T00:00:00.000Z")).toISOString().slice(0, 10)).toBe("2027-10-08");
  });
  it("versión del texto", () => expect(TEXTO_RECIBO_VERSION).toBe("v1"));
});
