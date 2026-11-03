// Precios de los extras con costo (USD, IVA incluido). La fuente es
// `siteConfig.preciosExtras` en Sanity (se edita desde el Studio); estos
// valores son el fallback cuando un extra no tiene precio cargado ahí, y
// tienen que coincidir con los que se cargan en el Studio.
//
// El nombre es la clave: es lo que se elige en el Studio y lo que usan el
// configurador (`priceName` en material-catalog.ts) y la ficha técnica.

export const PRECIO_BALCON = "Balcón con sobretecho";
export const PRECIO_FACHADA = "Panel metálico labrado";
export const PRECIO_INODORO = "Inodoro inteligente";
export const PRECIO_PISO_SPC = "Piso SPC 4 mm";
export const PRECIO_COCINA_AMPLIADA = "Cocina ampliada";

export const PRECIOS_EXTRAS_DEFAULT: Record<string, number> = {
  [PRECIO_BALCON]: 3100,
  [PRECIO_FACHADA]: 950,
  [PRECIO_INODORO]: 580,
  [PRECIO_PISO_SPC]: 390,
  [PRECIO_COCINA_AMPLIADA]: 500,
};

/** Nombres que se pueden elegir en el Studio (lista desplegable). */
export const NOMBRES_PRECIOS_EXTRAS = Object.keys(PRECIOS_EXTRAS_DEFAULT);

export const LEYENDA_PRECIOS = "Precios en USD, IVA incluido.";
export const A_CONSULTAR = "A consultar";

/** Para un extra sin fallback propio (no debería pasar). */
const DEFAULT_PRECIO_ADICIONAL = 500;

export type PreciosConfig = {
  precioBaseM2?: number | null;
  precioAdicionalDefault?: number | null;
  preciosExtras?: { nombre?: string | null; precio?: number | null }[] | null;
};

/** Precio de un extra: el cargado en Sanity bajo ese nombre, o el fallback
 *  del código. */
export function resolvePrecioExtra(nombre: string, precios?: PreciosConfig | null): number {
  return (
    precios?.preciosExtras?.find((e) => e.nombre === nombre)?.precio ??
    PRECIOS_EXTRAS_DEFAULT[nombre] ??
    precios?.precioAdicionalDefault ??
    DEFAULT_PRECIO_ADICIONAL
  );
}

export function formatUSD(n: number): string {
  return `USD ${new Intl.NumberFormat("es-AR", { maximumFractionDigits: 0 }).format(Math.round(n))}`;
}
