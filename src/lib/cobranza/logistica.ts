/** Logística internacional: costos del envío completo, opcionalmente
 * prorrateados entre sus unidades. */

export type ProrrateoRow = { unidadId: string; unidadNumero: string | null; importe: number };

export type CostoLogisticaRow = {
  id: string;
  envioId: string;
  envioNumeroPI: string | null;
  envioContenedor: string | null;
  concepto: string;
  descripcion: string | null;
  moneda: string;
  importe: number;
  /** ISO — fecha de pago (o prevista si está pendiente). */
  fecha: string;
  estado: string;
  comprobanteUrl: string | null;
  comprobanteSignedUrl: string | null;
  notas: string | null;
  prorrateado: boolean;
  prorrateos: ProrrateoRow[];
  createdAt: string;
};

type CostoConIncludes = {
  id: string;
  envioId: string;
  envio: { numeroPI: string | null; numeroContenedor: string | null };
  concepto: string;
  descripcion: string | null;
  moneda: string;
  importe: number;
  fecha: Date;
  estado: string;
  comprobanteUrl: string | null;
  notas: string | null;
  prorrateado: boolean;
  createdAt: Date;
  prorrateos: { unidadId: string; importe: number; unidad: { numeroUnidad: string | null } }[];
};

/** Include de Prisma que espera serializeCosto. */
export const COSTO_INCLUDE = {
  envio: { select: { numeroPI: true, numeroContenedor: true } },
  prorrateos: { select: { unidadId: true, importe: true, unidad: { select: { numeroUnidad: true } } } },
} as const;

export function serializeCosto(c: CostoConIncludes): CostoLogisticaRow {
  return {
    id: c.id,
    envioId: c.envioId,
    envioNumeroPI: c.envio.numeroPI,
    envioContenedor: c.envio.numeroContenedor,
    concepto: c.concepto,
    descripcion: c.descripcion,
    moneda: c.moneda,
    importe: c.importe,
    fecha: c.fecha.toISOString(),
    estado: c.estado,
    comprobanteUrl: c.comprobanteUrl,
    comprobanteSignedUrl: null,
    notas: c.notas,
    prorrateado: c.prorrateado,
    prorrateos: c.prorrateos.map((p) => ({ unidadId: p.unidadId, unidadNumero: p.unidad.numeroUnidad, importe: p.importe })),
    createdAt: c.createdAt.toISOString(),
  };
}

/** Divide `importe` entre las unidades en partes iguales, redondeando a
 * centavos; la diferencia de redondeo va a la última, así la suma da
 * exactamente el total. */
export function prorratear(importe: number, unidadIds: string[]): { unidadId: string; importe: number }[] {
  if (unidadIds.length === 0) return [];
  const centavos = Math.round(importe * 100);
  const base = Math.floor(centavos / unidadIds.length);
  const resto = centavos - base * unidadIds.length;
  return unidadIds.map((unidadId, i) => ({
    unidadId,
    importe: (base + (i === unidadIds.length - 1 ? resto : 0)) / 100,
  }));
}

export type TotalesPorMoneda = { USD: number; ARS: number };

export function totalesLogistica(costos: CostoLogisticaRow[]): { pagado: TotalesPorMoneda; pendiente: TotalesPorMoneda } {
  const pagado = { USD: 0, ARS: 0 };
  const pendiente = { USD: 0, ARS: 0 };
  for (const c of costos) {
    if (c.moneda !== "USD" && c.moneda !== "ARS") continue;
    if (c.estado === "pagado") pagado[c.moneda] += c.importe;
    else pendiente[c.moneda] += c.importe;
  }
  return { pagado, pendiente };
}

/** Costos de más reciente a más viejo. */
export function ordenarCostos(costos: CostoLogisticaRow[]): CostoLogisticaRow[] {
  return [...costos].sort((a, b) => b.fecha.localeCompare(a.fecha) || b.createdAt.localeCompare(a.createdAt));
}
