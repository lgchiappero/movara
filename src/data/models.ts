export type ModelImage = {
  // Sanity image fields
  asset?: { _ref: string; _type: string };
  hotspot?: unknown;
  crop?: unknown;
  // Static gradient fallback
  gradient?: string;
  accent?: string;
  // Shared
  label?: string;
};

export type ModelSpecs = {
  estructura: string;
  cubierta: string;
  cerramiento: string;
  aislacion: string;
  instalaciones: string;
  terminaciones: string;
  tiempo: string;
  garantia: string;
};

export type ProductModel = {
  slug: string;
  name: string;
  tagline: string;
  description: string;
  size: number;
  rooms: number;
  baths: number;
  tag?: string;
  features: string[];
  specs: ModelSpecs;
  images: ModelImage[];
  floorPlanSize: "small" | "medium" | "large" | "xl";
  video?: { url: string; label?: string } | null;
  videos?: { url: string; titulo?: string }[] | null;
  maxHabitaciones?: number | null;
  permiteCocinaSiMax3Hab?: boolean | null;
  // Campos MOVARA nuevos
  tamano?: "10ft" | "20ft" | "40ft" | null;
  incluyeCocina?: boolean | null;
  incluyeBano?: boolean | null;
  especificaciones?: { clave: string; valor: string }[] | null;
  finalidades?: string[] | null;
  destacado?: boolean | null;
  activo?: boolean | null;
  proximamente?: boolean | null;
};
