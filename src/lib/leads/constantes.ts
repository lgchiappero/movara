export const ETAPA_OPTIONS = [
  "nuevo",
  "en_contacto",
  "propuesta_enviada",
  "ganado",
  "perdido",
] as const;
export type Etapa = (typeof ETAPA_OPTIONS)[number];

export const ETAPA_LABELS: Record<Etapa, string> = {
  nuevo: "Nuevo",
  en_contacto: "En contacto",
  propuesta_enviada: "Propuesta enviada",
  ganado: "Ganado",
  perdido: "Perdido",
};

export const ETAPA_COLORS: Record<Etapa, string> = {
  nuevo: "bg-stone-100 text-stone-600",
  en_contacto: "bg-yellow-100 text-yellow-700",
  propuesta_enviada: "bg-orange-100 text-orange-700",
  ganado: "bg-green-100 text-green-700",
  perdido: "bg-red-100 text-red-700",
};

/** Una vez en una de estas dos etapas, el lead salió del pipeline activo. */
export const ETAPAS_FINALES: readonly Etapa[] = ["ganado", "perdido"];

export const ORIGEN_OPTIONS = [
  "web",
  "instagram",
  "whatsapp",
  "referido",
  "cliente_recurrente",
] as const;
export type Origen = (typeof ORIGEN_OPTIONS)[number];

export const ORIGEN_LABELS: Record<Origen, string> = {
  web: "Web",
  instagram: "Instagram",
  whatsapp: "WhatsApp",
  referido: "Referido",
  cliente_recurrente: "Cliente recurrente",
};

export const ORIGEN_COLORS: Record<Origen, string> = {
  web: "bg-blue-100 text-blue-700",
  instagram: "bg-violet-100 text-violet-700",
  whatsapp: "bg-green-100 text-green-700",
  referido: "bg-amber-100 text-amber-700", // "dorado"
  cliente_recurrente: "bg-stone-200 text-stone-700",
};
