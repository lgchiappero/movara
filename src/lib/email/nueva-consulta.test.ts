import { describe, it, expect } from "vitest";
import { detalleConsultaHtml } from "./nueva-consulta";

describe("detalleConsultaHtml (email de nueva consulta)", () => {
  it("sin opciones a cotizar ni notas, no agrega nada", () => {
    expect(detalleConsultaHtml([], null)).toBe("");
  });

  it("lista cada opción con la etiqueta A cotizar", () => {
    const html = detalleConsultaHtml(["Balcón frontal", "Sobretecho solo en el balcón"], null);
    expect(html).toContain("<li>Balcón frontal — <strong");
    expect(html.match(/A cotizar<\/strong>/g)).toHaveLength(2);
  });

  it("escapa el HTML de las notas y respeta los saltos de línea", () => {
    const html = detalleConsultaHtml([], 'Rampa <script>alert("x")</script>\nTerreno & "orientación"');
    expect(html).toContain("Notas del cliente");
    expect(html).not.toContain("<script>");
    expect(html).toContain("&lt;script&gt;");
    expect(html).toContain("<br>Terreno &amp;");
  });
});
