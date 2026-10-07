import { describe, it, expect } from "vitest";
import { escapeHtml } from "./escape-html";

describe("escapeHtml", () => {
  it("escapa los 5 caracteres especiales de HTML", () => {
    expect(escapeHtml(`<a href="x">'&'</a>`)).toBe("&lt;a href=&quot;x&quot;&gt;&#39;&amp;&#39;&lt;/a&gt;");
  });

  it("deja intacto el texto normal (tildes, ñ, saltos de línea)", () => {
    expect(escapeHtml("Hola, soy Ñoño — consulta\nlínea 2")).toBe("Hola, soy Ñoño — consulta\nlínea 2");
  });
});
