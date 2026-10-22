// Catálogo estático del configurador — extraído de ConfiguradorMovara.tsx
// ("use client") para que el panel admin y el generador de PDF (ambos
// server-side) puedan resolver modelo/finalidad/upgrades a texto legible
// sin importar el componente de UI completo.

import { findAdminExtraLabel } from "./admin-extras";

export const MOVARA_MODELS = [
  {
    key: "10ft" as const,
    nombre: "MOVARA Flex 18",
    superficie: 18,
    tagline: "Studio, espacio mínimo o módulo independiente",
    maxHab: 1,
  },
  {
    key: "20ft" as const,
    nombre: "MOVARA Flex 38",
    superficie: 38,
    tagline: "El más versátil — 1 o 2 ambientes",
    maxHab: 2,
    badge: "Más elegido",
  },
  {
    key: "40ft" as const,
    nombre: "MOVARA Flex 77",
    superficie: 77,
    tagline: "Máximo espacio — familia o inversión grande",
    maxHab: 3,
  },
] as const;

export type ModeloKey = (typeof MOVARA_MODELS)[number]["key"];

export const FINALIDADES = [
  { key: "inversor", emoji: "💰", label: "Inversor", desc: "Transformá capital en renta, sin años de obra", subdesc: "Airbnb, renta, glamping" },
  { key: "agro", emoji: "🌾", label: "Agro / Campo", desc: "Infraestructura lista para tu campo, sin meses de obra", subdesc: "Vivienda o infraestructura rural" },
  { key: "vivienda", emoji: "🏠", label: "Primera vivienda", desc: "Una nueva forma de habitar", subdesc: "Tu hogar propio" },
  { key: "turismo", emoji: "🏕️", label: "Turismo y hospitalidad", desc: "Eco resort, glamping o expansión rápida", subdesc: "Eco resort, glamping" },
  { key: "empresa", emoji: "💼", label: "Empresa / B2B", desc: "Oficinas, campamentos o infraestructura corporativa", subdesc: "Corporativo o industrial" },
  { key: "sector-publico", emoji: "🏛️", label: "Sector público", desc: "Vivienda social o infraestructura municipal", subdesc: "Municipal o social" },
] as const;

export type FinalidadKey = (typeof FINALIDADES)[number]["key"];

// ─── Mejoras de pedidos viejos ─────────────────────────────
// El configurador ofrecía un paso de "Mejoras" (universales y por zona
// climática) que ya no existe: no eran productos que ofrecemos. Los pedidos
// guardados conservan esos keys en `upgrades`; se siguen mostrando con su
// nombre en el admin y en los PDFs. Los balcones no están discontinuados:
// pasaron a la sección Balcón de "Configurá tu espacio".

const UPGRADES_CONFIGURACION_ANTERIOR: Record<string, string> = {
  "balcon-delantero": "Balcón delantero",
  "balcon-lateral": "Balcón lateral",
};

// Las líneas llevan "opción retirada" para que el test de claims las saltee:
// son nombres de pedidos viejos, no textos que el sitio ofrezca.
const UPGRADES_DISCONTINUADOS: Record<string, string> = {
  "panel-100": "Panel lana de roca 100mm",
  "triple-vidrio": "Triple vidrio (TDH)",
  "kit-solar": "Kit solar básico", // opción retirada
  // Por zona climática
  pu75: "Panel PU 75mm",
  dvh: "DVH doble vidrio",
  split: "Split inverter frío/calor",
  "techo-ventilado": "Techo ventilado reflectivo",
  "pintura-termo": "Pintura termorreflejante",
  solar: "Paneles solares",
  filtros: "Filtros anti-polvo",
  vmc: "VMC — Ventilación mecánica",
  "barrera-vapor": "Barrera de vapor reforzada",
  "pintura-anti": "Pintura anticorrosiva",
  anclaje: "Anclaje anti-vuelco M16",
  epdm: "Sellado EPDM perimetral",
  "solar-cuyo": "Paneles solares",
  "pu100-noa": "Panel PU 100mm",
  aluminio: "Aluminio anodizado",
  "solar-off-grid": "Sistema solar off-grid completo",
  "pu100-pat": "Panel PU 100mm",
  "triple-teh": "Triple vidrio",
  "anclaje-pat": "Anclaje reforzado",
  "techo-aguas": "Techo a dos aguas",
  madera: "Revestimiento en madera",
  "triple-peh": "Triple vidrio PVC",
  pu120: "Panel PU 120mm",
  "triple-yag": "Triple vidrio hermético",
  calefaccion: "Calefacción central",
};

/** Keys de `upgrades` que solo existen en pedidos viejos del configurador. */
export const UPGRADES_ANTERIORES_KEYS = [
  ...Object.keys(UPGRADES_CONFIGURACION_ANTERIOR),
  ...Object.keys(UPGRADES_DISCONTINUADOS),
];

/** Texto para mostrar un key guardado en `upgrades`: extra cargado por el
 *  admin, mejora de un pedido viejo (configuración anterior o discontinuada),
 *  o el key tal cual si no se reconoce — nunca se pierde el dato. */
export function getStoredUpgradeLabel(key: string): string {
  const admin = findAdminExtraLabel(key);
  if (admin) return admin;
  const anterior = UPGRADES_CONFIGURACION_ANTERIOR[key];
  if (anterior) return `${anterior} (configuración anterior)`;
  const discontinuado = UPGRADES_DISCONTINUADOS[key];
  if (discontinuado) return `${discontinuado} (opción discontinuada)`;
  return key;
}
