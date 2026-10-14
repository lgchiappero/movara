// @vitest-environment node
import { describe, it, expect } from "vitest";
import { readdirSync, readFileSync, statSync } from "fs";
import path from "path";

// Dorado oficial del manual de marca: #D4B36A. El anterior (#D4B06A) y sus
// variantes derivadas no tienen que volver a aparecer en el sitio.
const VIEJOS = /#(d4b06a|bf9a52|c19f5a|c19f57|8a6a2e|c9a35d|e0c084|e0cc9e|ceba82|9a7a3c|715a2d)\b|rgba?\(\s*212\s*,\s*176\s*,\s*106/i;

function archivos(dir: string): string[] {
  return readdirSync(dir).flatMap((nombre) => {
    const p = path.join(dir, nombre);
    return statSync(p).isDirectory() ? archivos(p) : /\.(tsx?|css|mjs|js)$/.test(nombre) ? [p] : [];
  });
}

describe("dorado de marca", () => {
  it("ningún archivo del sitio usa el dorado anterior ni sus variantes", () => {
    const raiz = path.resolve(__dirname, "..");
    const conViejo = archivos(raiz)
      .filter((p) => !p.endsWith("dorado-marca.test.ts"))
      .filter((p) => VIEJOS.test(readFileSync(p, "utf8")))
      .map((p) => path.relative(raiz, p));
    expect(conViejo).toEqual([]);
  });

  it("el token de Tailwind del dorado es #D4B36A", () => {
    const css = readFileSync(path.resolve(__dirname, "../app/globals.css"), "utf8");
    expect(css).toContain("--color-brand-primary: #D4B36A;");
    expect(css).toContain("--color-sage-500: #D4B36A;");
    expect(css).toContain("--color-sage-600: #BF9D52;");
  });
});
