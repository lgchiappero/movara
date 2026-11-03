import { INODORO_INTELIGENTE_ID } from "./material-catalog";

// Extras/mejoras de la sección "Configuración del espacio" en el detalle de
// pedido admin. El configurador público ya no ofrece mejoras; los keys que
// guardaba se conservan en UPGRADES_ANTERIORES_KEYS (configurador-catalog.ts).
// Se guardan como strings sueltos en ConfiguracionPedido.upgrades — ver
// getStoredUpgradeLabel() para cómo se muestran en la ficha y los PDFs.
export const ADMIN_EXTRAS = [
  { key: "paneles-premium", label: "Panel metálico labrado" },
  { key: "piso-spc", label: "Piso SPC 4 mm" },
  { key: "banera", label: "Bañera" },
  { key: "cocina-ampliada", label: "Cocina ampliada" },
  { key: "muro-vidrio", label: "Muro de vidrio" },
  { key: "galeria-sobretecho", label: "Galería con sobretecho" },
  { key: "inodoro-inteligente", label: "Inodoro inteligente con bidet" },
  { key: "sobretecho", label: "Sobretecho" },
] as const;

export type AdminExtraKey = (typeof ADMIN_EXTRAS)[number]["key"];

export function findAdminExtraLabel(key: string): string | undefined {
  return ADMIN_EXTRAS.find((e) => e.key === key)?.label;
}

// El inodoro inteligente se elige en el configurador (materiales.inodoro) y
// en el admin es el extra "inodoro-inteligente": el tilde lo muestra y lo
// edita, y se guarda en materiales para que el pedido tenga un solo dato.
export const ADMIN_EXTRA_INODORO = "inodoro-inteligente";

type Materiales = Record<string, unknown> | null | undefined;

/** Extras tildados en el form: los de `upgrades` más el inodoro elegido en
 *  el configurador. */
export function extrasAdminTildados(materiales: Materiales, upgrades: readonly string[]): string[] {
  const conInodoro = materiales?.inodoro === INODORO_INTELIGENTE_ID && !upgrades.includes(ADMIN_EXTRA_INODORO);
  return conInodoro ? [...upgrades, ADMIN_EXTRA_INODORO] : [...upgrades];
}

/** Al guardar: el tilde del inodoro pasa a `materiales.inodoro` y sale de
 *  `upgrades`. */
export function separarInodoroDeExtras(upgrades: readonly string[]): { upgrades: string[]; inodoro: string | null } {
  return {
    upgrades: upgrades.filter((k) => k !== ADMIN_EXTRA_INODORO),
    inodoro: upgrades.includes(ADMIN_EXTRA_INODORO) ? INODORO_INTELIGENTE_ID : null,
  };
}
