import { describe, it, expect } from "vitest";
import { readdirSync, readFileSync, statSync } from "fs";
import path from "path";

/** Guarda: ningún texto del sitio afirma producción o fabricación nacional,
 * que MOVARA fabrica (el producto se fabrica fuera del país), cifras de
 * casas entregadas o años de experiencia, ni que la logística o el flete
 * interno están incluidos (los paga el cliente según el contrato). */
const CLAIMS =
  /fabricaci[oó]n argentina|hech[oa] en argentina|industria (nacional|argentina)|producci[oó]n nacional|fabricaci[oó]n nacional|fabricad[ao]s? en argentina|made in argentina|fabricamos|casas entregadas|a[nñ]os de experiencia|log[ií]stica[^."]{0,30}inclu[ií]d|flete[^."]{0,20}inclu[ií]d/i;

function archivos(dir: string): string[] {
  return readdirSync(dir).flatMap((n) => {
    const p = path.join(dir, n);
    if (statSync(p).isDirectory()) return n === "__tests__" ? [] : archivos(p);
    return /\.(ts|tsx)$/.test(n) && !/\.test\.tsx?$/.test(n) ? [p] : [];
  });
}

describe("claims prohibidos (producción nacional, 'fabricamos', casas entregadas, años de experiencia, logística incluida)", () => {
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
