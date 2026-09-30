import type { AcuerdoConDetalle } from "@/lib/cobranza/types";

type AcuerdoConIncludes = {
  id: string;
  unidadId: string;
  unidad: {
    numeroUnidad: string | null;
    modelo: string | null;
    estadoFabricacion: string;
    cliente: { id: string; nombre: string };
  };
  tipo: string;
  concepto: string;
  descripcion: string | null;
  contraparte: string;
  moneda: string;
  totalAcordado: number;
  notas: string | null;
  createdAt: Date;
  cuotas: { id: string; descripcion: string; importe: number; vencimiento: Date | null; estado: string }[];
  movimientos: {
    id: string;
    fecha: Date;
    importe: number;
    modalidad: string;
    cuotaId: string | null;
    comprobanteUrl: string | null;
    notas: string | null;
    registradoPor: string;
  }[];
};

export function serializeAcuerdo(a: AcuerdoConIncludes): AcuerdoConDetalle {
  return {
    id: a.id,
    unidadId: a.unidadId,
    unidadNumero: a.unidad.numeroUnidad,
    unidadModelo: a.unidad.modelo,
    unidadEstado: a.unidad.estadoFabricacion,
    clienteId: a.unidad.cliente.id,
    clienteNombre: a.unidad.cliente.nombre,
    tipo: a.tipo,
    concepto: a.concepto,
    descripcion: a.descripcion,
    contraparte: a.contraparte,
    moneda: a.moneda,
    totalAcordado: a.totalAcordado,
    notas: a.notas,
    createdAt: a.createdAt.toISOString(),
    cuotas: a.cuotas.map((c) => ({
      id: c.id,
      descripcion: c.descripcion,
      importe: c.importe,
      vencimiento: c.vencimiento?.toISOString() ?? null,
      estado: c.estado,
    })),
    movimientos: a.movimientos.map((m) => ({
      id: m.id,
      fecha: m.fecha.toISOString(),
      importe: m.importe,
      modalidad: m.modalidad,
      cuotaId: m.cuotaId,
      comprobanteUrl: m.comprobanteUrl,
      // Se resuelve aparte (async) solo en las lecturas que necesitan
      // mostrar el link — ver src/lib/cobranza/attach-signed-urls.ts.
      comprobanteSignedUrl: null,
      notas: m.notas,
      registradoPor: m.registradoPor,
    })),
  };
}
