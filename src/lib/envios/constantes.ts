// Catálogo de estados, secciones de documentos y modelos del sistema de
// envíos/unidades — separado del catálogo del configurador público
// (data/configurador-catalog.ts) porque acá "modelo" es un campo de texto
// libre sobre una unidad ya vendida, no una opción validada del wizard.

export const MODELOS_UNIDAD = ["Flex 18", "Flex 38", "Flex 77"] as const;

export const estadoFabricacionOptions = [
  "pendiente",
  "en_produccion",
  "produccion_completa",
  "embarcado",
  "en_transito",
  "en_aduana",
  "en_destino",
  "entregado",
] as const;
export type EstadoFabricacion = (typeof estadoFabricacionOptions)[number];

export const estadoFabricacionLabels: Record<EstadoFabricacion, string> = {
  pendiente: "Pendiente",
  en_produccion: "En producción",
  produccion_completa: "Producción completa",
  embarcado: "Embarcado",
  en_transito: "En tránsito",
  en_aduana: "En aduana",
  en_destino: "En destino",
  entregado: "Entregado",
};

export function estadoFabricacionIndex(estado: string): number {
  return estadoFabricacionOptions.indexOf(estado as EstadoFabricacion);
}

// Colores de los contadores por estado en el dashboard operativo — pedido
// explícito por el usuario (gris/azul/verde claro/naranja/amarillo/rojo/
// verde/gris oscuro), un color bien distinguible por estado.
export const estadoFabricacionColors: Record<EstadoFabricacion, string> = {
  pendiente: "bg-stone-100 text-stone-600",
  en_produccion: "bg-blue-100 text-blue-700",
  produccion_completa: "bg-emerald-50 text-emerald-600",
  embarcado: "bg-orange-100 text-orange-700",
  en_transito: "bg-yellow-100 text-yellow-700",
  en_aduana: "bg-red-100 text-red-700",
  en_destino: "bg-green-100 text-green-700",
  entregado: "bg-stone-700 text-white",
};

export type SeccionInfo = { key: string; titulo: string; guia: string; permiteDescripcion: boolean };

// Las 9 carpetas del detalle de unidad. 04/05/06 en realidad cuelgan del
// Envío (documentos compartidos por todas las unidades de ese contenedor),
// no de la Unidad — se muestran igual en el detalle de la unidad como
// solapa de lectura hacia los documentos de su envío.
export const SECCIONES_UNIDAD: SeccionInfo[] = [
  {
    key: "01_cliente",
    titulo: "01 — Cliente",
    guia: "Datos del cliente (nombre, DNI, CUIT, domicilio, contacto) · Foto DNI frente y dorso",
    permiteDescripcion: false,
  },
  {
    key: "02_contrato",
    titulo: "02 — Contrato",
    guia: "Contrato firmado por ambas partes (incluye configuración, detalle técnico y cronograma de pagos)",
    permiteDescripcion: true,
  },
  {
    key: "03_pagos",
    titulo: "03 — Pagos",
    guia: "Comprobante anticipo 30% · Comprobante saldo 70% · Otros pagos si aplica",
    permiteDescripcion: true,
  },
  {
    key: "07_entrega",
    titulo: "07 — Entrega",
    guia: "Acta de entrega firmada · Fotos estado de la unidad · Fotos instalación · Checklist · Foto QR instalado",
    permiteDescripcion: false,
  },
  {
    key: "08_garantia",
    titulo: "08 — Garantía MOVARA",
    guia: "Certificado de garantía MOVARA 12 meses entregado al cliente",
    permiteDescripcion: false,
  },
  {
    key: "09_reclamos",
    titulo: "09 — Reclamos",
    guia: "Solo si hay incidencia: descripción del problema · Fotos · Gestión y resultado",
    permiteDescripcion: true,
  },
];
export const seccionUnidadKeys = SECCIONES_UNIDAD.map((s) => s.key) as [string, ...string[]];

// Secciones cuya ausencia de documentos es operativamente urgente (el
// dashboard las usa para la alerta de "documentación incompleta") — el
// resto (01_cliente, 08_garantia, 09_reclamos) no bloquea el flujo si
// todavía no tienen archivos.
export const SECCIONES_CRITICAS_UNIDAD = ["02_contrato", "03_pagos", "07_entrega"] as const;

// Las 3 carpetas del envío — compartidas por todas las unidades de ese
// contenedor, por eso viven en DocumentoEnvio en vez de repetirse por
// unidad.
export const SECCIONES_ENVIO: SeccionInfo[] = [
  {
    key: "04_produccion",
    titulo: "04 — Producción",
    guia: "Proforma Invoice · Purchase Order · Fotos de producción en fábrica",
    permiteDescripcion: false,
  },
  {
    key: "05_embarque",
    titulo: "05 — Embarque",
    guia: "Bill of Lading · Packing List · Certificado de origen · Seguro de carga",
    permiteDescripcion: true,
  },
  {
    key: "06_despacho",
    titulo: "06 — Despacho",
    guia: "Despacho de importación (DI) · VEP pagado · Comprobante DEFIBA · Flete interno",
    permiteDescripcion: true,
  },
];
export const seccionEnvioKeys = SECCIONES_ENVIO.map((s) => s.key) as [string, ...string[]];
