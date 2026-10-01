export const TIPO_ACUERDO_OPTIONS = ["cobro", "pago"] as const;
export type TipoAcuerdo = (typeof TIPO_ACUERDO_OPTIONS)[number];

export const TIPO_ACUERDO_LABELS: Record<TipoAcuerdo, string> = {
  cobro: "Cobro",
  pago: "Pago",
};

/** "venta" es el concepto de un plan de pago de cobranza (cubre la venta
 * completa de la unidad; el detalle anticipo/cuotas/saldo vive en las
 * cuotas). anticipo/cuota/saldo/otro se aceptan por compatibilidad con
 * acuerdos creados antes de los planes de pago. */
export const CONCEPTO_COBRO_OPTIONS = ["venta", "anticipo", "cuota", "saldo", "otro"] as const;
export type ConceptoCobro = (typeof CONCEPTO_COBRO_OPTIONS)[number];

export const CONCEPTO_PAGO_OPTIONS = [
  "fabrica",
  "flete",
  "aduana",
  "despachante",
  "transporte",
  "grua",
  "impuestos",
  "seguro",
  "instalacion",
  "otro",
] as const;
export type ConceptoPago = (typeof CONCEPTO_PAGO_OPTIONS)[number];

/** Conceptos que se ofrecen al cargar un pago POR UNIDAD (fábrica y
 * logística nacional). Flete/seguro/aduana/despachante/impuestos siguen
 * siendo válidos (pagos viejos por unidad) pero la logística internacional
 * ahora se carga por envío — ver CONCEPTO_LOGISTICA_OPTIONS. */
export const CONCEPTO_PAGO_UNIDAD_OPTIONS = ["fabrica", "transporte", "grua", "instalacion", "otro"] as const satisfies readonly ConceptoPago[];
export type ConceptoPagoUnidad = (typeof CONCEPTO_PAGO_UNIDAD_OPTIONS)[number];

/** Logística internacional — costos del envío completo (contenedor). */
export const CONCEPTO_LOGISTICA_OPTIONS = ["flete", "seguro", "aduana", "despachante", "portuarios", "vep", "otro"] as const;
export type ConceptoLogistica = (typeof CONCEPTO_LOGISTICA_OPTIONS)[number];

export const CONCEPTO_LOGISTICA_LABELS: Record<ConceptoLogistica, string> = {
  flete: "Flete marítimo",
  seguro: "Seguro de carga",
  aduana: "Aduana",
  despachante: "Despachante",
  portuarios: "Gastos portuarios",
  vep: "VEP",
  otro: "Otro",
};

export const ESTADO_COSTO_OPTIONS = ["pagado", "pendiente"] as const;
export type EstadoCosto = (typeof ESTADO_COSTO_OPTIONS)[number];

export const CONCEPTO_LABELS: Record<ConceptoCobro | ConceptoPago, string> = {
  venta: "Plan de pago",
  anticipo: "Anticipo",
  cuota: "Cuota",
  saldo: "Saldo",
  fabrica: "Fábrica",
  flete: "Flete",
  aduana: "Aduana",
  despachante: "Despachante",
  transporte: "Transporte local",
  grua: "Grúa",
  impuestos: "Impuestos",
  seguro: "Seguro",
  instalacion: "Instalación",
  otro: "Otro",
};

/** Texto sugerido para la descripción al elegir un tipo de concepto en el
 * modal de nuevo cobro/pago — el admin lo puede editar libremente. */
export const DESCRIPCION_SUGERIDA: Record<ConceptoCobro | ConceptoPago, string> = {
  venta: "",
  anticipo: "Anticipo 30%",
  cuota: "Cuota 1/3",
  saldo: "Saldo final",
  fabrica: "Primera cuota fábrica",
  flete: "Flete internacional",
  aduana: "Gastos de aduana",
  despachante: "Honorarios despachante",
  transporte: "Transporte local",
  grua: "Servicio de grúa",
  impuestos: "Impuestos",
  seguro: "Seguro de carga",
  instalacion: "Instalación en destino",
  otro: "",
};

export const MONEDA_OPTIONS = ["USD", "ARS"] as const;
export type Moneda = (typeof MONEDA_OPTIONS)[number];

export const MODALIDAD_OPTIONS = ["transferencia", "efectivo", "cripto", "otro"] as const;
export type Modalidad = (typeof MODALIDAD_OPTIONS)[number];

export const MODALIDAD_LABELS: Record<Modalidad, string> = {
  transferencia: "Transferencia",
  efectivo: "Efectivo",
  cripto: "Cripto",
  otro: "Otro",
};

export const ESTADO_CUOTA_OPTIONS = ["pendiente", "pagado", "vencido"] as const;
export type EstadoCuota = (typeof ESTADO_CUOTA_OPTIONS)[number];

export const ESTADO_CUOTA_LABELS: Record<EstadoCuota, string> = {
  pendiente: "Pendiente",
  pagado: "Pagado",
  vencido: "Vencido",
};

export const ESTADO_CUOTA_COLORS: Record<EstadoCuota, string> = {
  pendiente: "bg-stone-100 text-stone-600",
  pagado: "bg-emerald-100 text-emerald-700",
  vencido: "bg-red-100 text-red-700",
};

// Estado del acuerdo: no se guarda en la base, se deriva de sus cuotas y
// movimientos en cada lectura (ver src/lib/cobranza/calc.ts).
export const ESTADO_ACUERDO_OPTIONS = ["pendiente", "parcial", "saldado", "vencido"] as const;
export type EstadoAcuerdo = (typeof ESTADO_ACUERDO_OPTIONS)[number];

export const ESTADO_ACUERDO_LABELS: Record<EstadoAcuerdo, string> = {
  pendiente: "Pendiente",
  parcial: "Parcial",
  saldado: "Saldado",
  vencido: "Vencido",
};

export const ESTADO_ACUERDO_COLORS: Record<EstadoAcuerdo, string> = {
  pendiente: "bg-stone-100 text-stone-600",
  parcial: "bg-[#D4B06A]/20 text-[#8a6a2e]",
  saldado: "bg-emerald-100 text-emerald-700",
  vencido: "bg-red-100 text-red-700",
};
