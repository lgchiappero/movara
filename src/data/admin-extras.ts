// Extras/mejoras de la sección "Configuración del espacio" en el detalle de
// pedido admin. El configurador público ya no ofrece mejoras; los keys que
// guardaba se conservan en UPGRADES_ANTERIORES_KEYS (configurador-catalog.ts).
// Se guardan como strings sueltos en ConfiguracionPedido.upgrades — ver
// getStoredUpgradeLabel() para cómo se muestran en la ficha y los PDFs.
export const ADMIN_EXTRAS = [
  { key: "paneles-premium", label: "Paneles premium" },
  { key: "piso-spc", label: "Piso SPC" },
  { key: "banera", label: "Bañera" },
  { key: "cocina-ampliada", label: "Cocina ampliada" },
  { key: "muro-vidrio", label: "Muro de vidrio" },
  { key: "galeria-sobretecho", label: "Galería con sobretecho" },
  { key: "inodoro-inteligente", label: "Inodoro inteligente" },
  { key: "sobretecho", label: "Sobretecho" },
] as const;

export type AdminExtraKey = (typeof ADMIN_EXTRAS)[number]["key"];

export function findAdminExtraLabel(key: string): string | undefined {
  return ADMIN_EXTRAS.find((e) => e.key === key)?.label;
}
