export const TIPO_ACUERDO_OPTIONS = ["cobro", "pago"] as const;
export type TipoAcuerdo = (typeof TIPO_ACUERDO_OPTIONS)[number];

export const TIPO_ACUERDO_LABELS: Record<TipoAcuerdo, string> = {
  cobro: "Cobro",
  pago: "Pago",
};

export const CONCEPTO_COBRO_OPTIONS = ["anticipo", "cuota", "saldo", "otro"] as const;
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
  "otro",
] as const;
export type ConceptoPago = (typeof CONCEPTO_PAGO_OPTIONS)[number];

/** "venta" era el único concepto de cobro antes de desglosarlo en
 * anticipo/cuota/saldo — ya no se ofrece al crear, pero los acuerdos
 * viejos lo siguen teniendo y necesitan su label. */
type ConceptoLegacy = "venta";

export const CONCEPTO_LABELS: Record<ConceptoCobro | ConceptoPago | ConceptoLegacy, string> = {
  venta: "Venta",
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
  otro: "Otro",
};

/** Texto sugerido para la descripción al elegir un tipo de concepto en el
 * modal de nuevo cobro/pago — el admin lo puede editar libremente. */
export const DESCRIPCION_SUGERIDA: Record<ConceptoCobro | ConceptoPago, string> = {
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
