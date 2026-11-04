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
export const PRECIO_BASE_DUCHA = "Base de ducha";
export const PRECIO_PUERTA_MODERNA = "Puerta doble hoja moderna";
export const PRECIO_COCINA_U = "Cocina en U";

// Regla de precio MOVARA para los extras:
//
//   precio = costo de fábrica × 1,35 (margen) × 1,21 (IVA),
//            redondeado hacia arriba a múltiplos de USD 5.
//
// Costo de fábrica (USD) → precio con IVA:
//   Base de ducha              100 → 165
//   Puerta doble hoja moderna  200 → 330
//   Cocina en U                400 → 655
// Los demás extras todavía no tienen costo de fábrica cargado: su precio es
// el de lista de abajo (balcón 3.100, panel labrado 950, inodoro 580, piso
// SPC 390, cocina ampliada con alacena 500).
export const MARGEN_EXTRAS = 1.35;
export const IVA = 1.21;

/** Precio con IVA de un extra a partir de su costo de fábrica (ver la regla
 *  arriba). Se redondea a centavos antes de subir al múltiplo de 5 para que
 *  un error de coma flotante no sume 5 de más. */
export function precioDesdeCostoFabrica(costo: number): number {
  const conIva = Math.round(costo * MARGEN_EXTRAS * IVA * 100) / 100;
  return Math.ceil(conIva / 5) * 5;
}

/** Costo de fábrica de los extras que lo tienen (USD). */
export const COSTOS_FABRICA: Record<string, number> = {
  [PRECIO_BASE_DUCHA]: 100,
  [PRECIO_PUERTA_MODERNA]: 200,
  [PRECIO_COCINA_U]: 400,
};

export const PRECIOS_EXTRAS_DEFAULT: Record<string, number> = {
  [PRECIO_BALCON]: 3100,
  [PRECIO_FACHADA]: 950,
  [PRECIO_INODORO]: 580,
  [PRECIO_PISO_SPC]: 390,
  [PRECIO_COCINA_AMPLIADA]: 500,
  ...Object.fromEntries(Object.entries(COSTOS_FABRICA).map(([nombre, costo]) => [nombre, precioDesdeCostoFabrica(costo)])),
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
