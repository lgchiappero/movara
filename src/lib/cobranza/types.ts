export type Cuota = {
  id: string;
  descripcion: string;
  importe: number;
  vencimiento: string | null;
  estado: string;
};

export type MovimientoDetalle = {
  id: string;
  fecha: string;
  importe: number;
  modalidad: string;
  cuotaId: string | null;
  comprobanteUrl: string | null;
  // URL firmada de corta duración, resuelta server-side solo donde hace
  // falta mostrar el link de ver/descargar (no en todas las lecturas de
  // AcuerdoConDetalle) — null si no se resolvió o no hay comprobante.
  comprobanteSignedUrl: string | null;
  notas: string | null;
  registradoPor: string;
};

export type AcuerdoConDetalle = {
  id: string;
  unidadId: string;
  unidadNumero: string | null;
  unidadModelo: string | null;
  unidadEstado: string;
  clienteId: string;
  clienteNombre: string;
  tipo: string;
  concepto: string;
  descripcion: string | null;
  contraparte: string;
  moneda: string;
  totalAcordado: number;
  notas: string | null;
  createdAt: string;
  cuotas: Cuota[];
  movimientos: MovimientoDetalle[];
};

export type UnidadOpcion = { id: string; numeroUnidad: string | null; clienteNombre: string };

export type ClienteOpcion = { id: string; nombre: string };

export type TipoCambioRow = {
  id: string;
  fecha: string;
  usdArs: number;
  fuente: string | null;
  cargadoPor: string;
};

export type CierreRow = {
  id: string;
  mes: number;
  anio: number;
  cerradoPor: string;
  notas: string | null;
  totalCobradoUSD: number;
  totalCobradoARS: number;
  totalPagadoUSD: number;
  totalPagadoARS: number;
  margenUSD: number;
  createdAt: string;
};
