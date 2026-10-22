import { describe, it, expect } from "vitest";
import { readdirSync, readFileSync, statSync } from "fs";
import path from "path";

/** Guarda: ningún texto del sitio afirma producción o fabricación nacional,
 * que MOVARA fabrica (el producto se fabrica fuera del país), cifras de
 * casas entregadas o años de experiencia ("más de 8 años"), ni el kit solar
 * (no es un producto que ofrezcamos), ni que la logística o el flete
 * interno están incluidos (los paga el cliente según el contrato). */
const CLAIMS =
  /fabricaci[oó]n argentina|hech[oa] en argentina|industria (nacional|argentina)|producci[oó]n nacional|fabricaci[oó]n nacional|fabricad[ao]s? en argentina|made in argentina|fabricamos|casas entregadas|a[nñ]os de experiencia|m[aá]s de 8 a[nñ]os|kit solar|(?<!\d)8 a[nñ]os|log[ií]stica[^."]{0,30}inclu[ií]d|flete[^."]{0,20}inclu[ií]d/i;

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
        .filter(
          ({ linea }) =>
            CLAIMS.test(linea) &&
            !linea.includes("sin claims de producción nacional") &&
            // Nombres de pedidos viejos que el admin tiene que poder mostrar.
            !linea.includes("// opción retirada")
        )
        .map(({ f, i, linea }) => `${path.relative(process.cwd(), f)}:${i}: ${linea.trim()}`)
    );
    expect(encontrados).toEqual([]);
  });

  it.each(["Más de 8 años transformando terrenos", "más de 8 años", "hace 8 años", "8 anos"])("bloquea %s", (texto) => {
    expect(CLAIMS.test(texto)).toBe(true);
  });

  it("bloquea el kit solar", () => {
    expect(CLAIMS.test("Kit solar completo")).toBe(true);
  });

  it.each(["mayores de 18 años", "28 años", "90 días"])("no confunde %s", (texto) => {
    expect(CLAIMS.test(texto)).toBe(false);
  });
});
