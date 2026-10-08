import { describe, it, expect } from "vitest";
import { readdirSync, readFileSync, statSync } from "fs";
import path from "path";

/** Guarda: ningún texto del sitio afirma producción o fabricación nacional
 * ni que MOVARA fabrica (el producto se fabrica fuera del país). */
const CLAIMS = /fabricaci[oó]n argentina|hech[oa] en argentina|industria (nacional|argentina)|producci[oó]n nacional|fabricaci[oó]n nacional|fabricad[ao]s? en argentina|made in argentina|fabricamos (en|y entregamos)/i;

function archivos(dir: string): string[] {
  return readdirSync(dir).flatMap((n) => {
    const p = path.join(dir, n);
    if (statSync(p).isDirectory()) return n === "__tests__" ? [] : archivos(p);
    return /\.(ts|tsx)$/.test(n) && !/\.test\.tsx?$/.test(n) ? [p] : [];
  });
}

describe("claims de producción nacional", () => {
  it("no aparecen en el código del sitio", () => {
    const encontrados = archivos(path.join(process.cwd(), "src")).flatMap((f) =>
      readFileSync(f, "utf8")
        .split("\n")
        .map((linea, i) => ({ f, i: i + 1, linea }))
        .filter(({ linea }) => CLAIMS.test(linea) && !linea.includes("sin claims de producción nacional"))
        .map(({ f, i, linea }) => `${path.relative(process.cwd(), f)}:${i}: ${linea.trim()}`)
    );
    expect(encontrados).toEqual([]);
  });
});
