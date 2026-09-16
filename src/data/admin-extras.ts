// Extras/mejoras de la sección "Configuración del espacio" en el detalle de
// pedido admin — independientes del catálogo de upgrades del configurador
// público (UNIVERSAL_UPGRADES/UPGRADES_BY_REGION en configurador-catalog.ts,
// que depende de región y no cubre estos ítems). Se guardan como strings
// sueltos en ConfiguracionPedido.upgrades junto a los keys que sí vienen del
// configurador — ver findAdminExtraLabel() para el fallback usado al
// renderizar narrativa/PDF cuando un key no está en el catálogo público.
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
