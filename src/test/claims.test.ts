import { describe, it, expect } from "vitest";
import { readdirSync, readFileSync, statSync } from "fs";
import path from "path";
import { execFileSync } from "child_process";

/** Guarda: ningún texto del sitio afirma producción o fabricación nacional,
 * que MOVARA fabrica (el producto se fabrica fuera del país), cifras de
 * casas entregadas o años de experiencia ("más de 8 años"), ni el kit solar
 * (no es un producto que ofrezcamos), ni que la logística o el flete
 * interno o el transporte están incluidos (los paga el cliente según el
 * contrato). */
const CLAIMS =
  /fabricaci[oó]n argentina|hech[oa] en argentina|industria (nacional|argentina)|producci[oó]n nacional|fabricaci[oó]n nacional|fabricad[ao]s? en argentina|made in argentina|fabricamos|casas entregadas|a[nñ]os de experiencia|m[aá]s de 8 a[nñ]os|kit solar|(?<!\d)8 a[nñ]os|log[ií]stica[^."]{0,30}inclu[ií]d|(flete|transporte)[^."]{0,20}inclu[ií]d|incluye (el )?(transporte|flete)|incluyen? fabricaci[oó]n, transporte|transporte hasta tu terreno/i;

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

  it.each(["transporte incluido", "Flete incluido", "incluye transporte", "Incluye el flete", "Todos incluyen fabricación, transporte e instalación.", "Transporte hasta tu terreno"])("bloquea %s", (texto) => {
    expect(CLAIMS.test(texto)).toBe(true);
  });

  it("no confunde la aclaración de que el traslado se cotiza aparte", () => {
    expect(CLAIMS.test("El traslado hasta tu terreno se cotiza según tu ubicación.")).toBe(false);
    expect(CLAIMS.test("No incluye: flete hasta tu provincia")).toBe(false);
  });

  it.each(["mayores de 18 años", "28 años", "90 días"])("no confunde %s", (texto) => {
    expect(CLAIMS.test(texto)).toBe(false);
  });
});

/** Guarda de marca: el cliente nunca ve el nombre del proveedor ni que la
 * unidad es "plegable" (se dice "expandible"). Cubre todo el texto público
 * de src: páginas, componentes, metadata, alt de imágenes, emails, PDF del
 * cliente y datos de respaldo. Quedan afuera solo las pantallas internas
 * (admin, studio) y el PDF que se le manda al proveedor. Los comentarios no
 * se publican, así que no cuentan. Ver docs/base-del-sitio.md (Marca). */
const PROVEEDOR_O_PLEGABLE = /\bplegables?\b|\bfoldable\b|\bfolding\b|\bheshi\b|\bhoshi\b/i;

const SOLO_INTERNO = [
  /^src\/app\/admin\//,
  /^src\/app\/api\/admin\//,
  /^src\/components\/admin\//,
  /^src\/app\/studio\//,
  // PDF bilingüe para el proveedor (códigos de modelo del fabricante).
  /^src\/lib\/pdf\/model-codes\.ts$/,
];

const esComentario = (linea: string) => /^\s*(\/\/|\/\*|\*)/.test(linea);

describe("nombre del proveedor y 'plegable' fuera del texto público", () => {
  it("no aparecen en el código público del sitio", () => {
    const encontrados = archivos(path.join(process.cwd(), "src"))
      .map((f) => path.relative(process.cwd(), f))
      .filter((f) => !SOLO_INTERNO.some((r) => r.test(f)))
      .flatMap((f) =>
        readFileSync(f, "utf8")
          .split("\n")
          .map((linea, i) => ({ i: i + 1, linea }))
          .filter(({ linea }) => PROVEEDOR_O_PLEGABLE.test(linea) && !esComentario(linea))
          .map(({ i, linea }) => `${f}:${i}: ${linea.trim()}`)
      );
    expect(encontrados).toEqual([]);
  });

  it.each(["unidad plegable", "Plegables", "foldable house", "Folding container", "Heshi house", "HOSHI"])("bloquea %s", (texto) => {
    expect(PROVEEDOR_O_PLEGABLE.test(texto)).toBe(true);
  });

  it.each(["lista desplegable", "unidad expandible", "se despliega en destino"])("no confunde %s", (texto) => {
    expect(PROVEEDOR_O_PLEGABLE.test(texto)).toBe(false);
  });

  it("sí ve el texto dentro de JSX y strings, aunque la línea tenga código", () => {
    expect(esComentario('  description: "una unidad plegable",')).toBe(false);
    expect(esComentario("  // catálogo del proveedor Heshi")).toBe(true);
    expect(esComentario(" * la palabra plegable")).toBe(true);
  });
});

describe("archivos del proveedor fuera de public/", () => {
  // Todo lo versionado en public/ se publica y se sirve por URL: catálogos y
  // PDFs del proveedor van en assets-origen/ (ver docs/base-del-sitio.md,
  // Marca). Se miran los archivos de git, que son los que se despliegan.
  it("ningún archivo de public/ en git lleva el nombre del proveedor", () => {
    const publicos = execFileSync("git", ["ls-files", "public"], { encoding: "utf8" }).split("\n").filter(Boolean);
    expect(publicos.length).toBeGreaterThan(0);
    expect(publicos.filter((p) => /heshi|hoshi/i.test(p))).toEqual([]);
  });
});
