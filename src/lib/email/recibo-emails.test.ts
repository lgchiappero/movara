import { describe, it, expect } from "vitest";
import { buildEmailSolicitudRecibo, buildEmailReciboConfirmado, primerNombre, type DatosEmailRecibo } from "./recibo-emails";

const D: DatosEmailRecibo = {
  numeroRecibo: "REC-2026-001",
  clienteNombre: "Ana <b>García</b>",
  numeroUnidad: "MOV-UNIDAD-2026-001",
  modelo: "Flex 38",
  fechaEntregaTexto: "8 de octubre de 2026",
  lugarEntrega: "Sunchales & alrededores",
  observaciones: null,
};

describe("primerNombre", () => {
  it("toma la primera palabra", () => {
    expect(primerNombre("  Ana María García ")).toBe("Ana");
    expect(primerNombre("")).toBe("");
  });
});

describe("buildEmailSolicitudRecibo", () => {
  it("asunto, saludo, detalle, botón y nota de WhatsApp — con datos escapados", () => {
    const { subject, html } = buildEmailSolicitudRecibo(D, "https://movara.com.ar/recibo/abc");
    expect(subject).toBe("Confirmá la recepción de tu MOVARA · REC-2026-001");
    expect(html).toContain("Hola Ana, tu MOVARA ya está en destino");
    expect(html).toContain("Con esa confirmación arranca tu garantía.");
    expect(html).toContain('href="https://movara.com.ar/recibo/abc"');
    expect(html).toContain("Confirmo que recibí la unidad en conformidad");
    expect(html).toContain("+54 9 3493 667214");
    expect(html).toContain("Sunchales &amp; alrededores");
    expect(html).toContain("Sin observaciones");
    expect(html).toContain("#1A1A1A");
    expect(html).toContain("#D4B36A");
    expect(html).not.toContain("<b>García</b>");
    expect(html).toContain('href="https://movara.com.ar/privacidad"');
  });

  it("muestra las observaciones cuando hay", () => {
    expect(buildEmailSolicitudRecibo({ ...D, observaciones: "Raspón <leve>" }, "x").html).toContain("Raspón &lt;leve&gt;");
  });
});

describe("buildEmailReciboConfirmado", () => {
  const datos = { ...D, confirmadoTexto: "8/10/2026, 10:36", garantiaHastaTexto: "8 de octubre de 2027" };

  it("versión cliente", () => {
    const { subject, html } = buildEmailReciboConfirmado(datos, "cliente");
    expect(subject).toBe("Tu Recibo en Conformidad · REC-2026-001");
    expect(html).toContain("Gracias, Ana");
    expect(html).toContain("vigente hasta el 8 de octubre de 2027");
  });

  it("versión MOVARA", () => {
    const { subject, html } = buildEmailReciboConfirmado(datos, "movara");
    expect(subject).toBe("Recibo en Conformidad confirmado · REC-2026-001 · Ana <b>García</b>");
    expect(html).toContain("Ana &lt;b&gt;García&lt;/b&gt; confirmó la recepción");
  });
});
