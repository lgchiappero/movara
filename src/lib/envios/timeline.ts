import { estadoFabricacionIndex, estadoFabricacionLabels, type EstadoFabricacion } from "@/lib/envios/constantes";

export type PasoId =
  | "venta_cerrada"
  | "unidad_creada"
  | "cobro_anticipo"
  | "pago_fabrica"
  | "en_produccion"
  | "embarque"
  | "en_transito"
  | "en_aduana"
  | "en_destino"
  | "entregado";

export type PasoEstado = "completado" | "actual" | "pendiente";

export type PasoInfo = {
  id: PasoId;
  titulo: string;
  estado: PasoEstado;
  fecha: Date | null;
};

/** `anchor` es una clave semántica, no un href literal — el módulo de
 * lógica no conoce IDs de rutas (envioId, etc.), así que la resolución a
 * una URL real (same-page anchor o cross-page hacia /admin/envios/[id])
 * vive en la capa de presentación (ver UnidadTimeline.tsx). Valores:
 * "cobranza" | "estado" | "datos-unidad" | "garantia" |
 * "seccion-unidad:<key>" | "seccion-envio:<key>". */
export type AccionItem = { texto: string; anchor: string };

export type DatosTimelineUnidad = {
  clienteId: string | null;
  modelo: string | null;
  precioCliente: number | null;
  estadoFabricacion: string;
  createdAt: Date;
  fechaEntrega: Date | null;
  fechaEmbarque: Date | null;
  /** Fecha del primer movimiento de tipo "cobro" registrado para esta
   * unidad — null si todavía no se registró ningún cobro. */
  primerCobroFecha: Date | null;
  /** Fecha del primer movimiento de pago a fábrica (acuerdo de tipo "pago",
   * concepto "fabrica") — null si todavía no se registró ninguno. */
  primerPagoFabricaFecha: Date | null;
};

const TITULOS: Record<PasoId, string> = {
  venta_cerrada: "Venta cerrada",
  unidad_creada: "Unidad creada",
  cobro_anticipo: "Cobro anticipo",
  pago_fabrica: "Pago a fábrica",
  en_produccion: "En producción",
  embarque: "Embarque",
  en_transito: "En tránsito",
  en_aduana: "En aduana",
  en_destino: "En destino",
  entregado: "Entregado",
};

const ORDEN: PasoId[] = [
  "venta_cerrada",
  "unidad_creada",
  "cobro_anticipo",
  "pago_fabrica",
  "en_produccion",
  "embarque",
  "en_transito",
  "en_aduana",
  "en_destino",
  "entregado",
];

/** Un paso "completado" es uno del que ya salimos — se usa índice de
 * estadoFabricacionOptions (>=) en vez de igualdad estricta para que un
 * paso siga en verde una vez que la unidad avanzó más allá de él, no solo
 * mientras coincide exactamente. */
function completadoEnProduccion(estado: string): boolean {
  return estadoFabricacionIndex(estado) >= estadoFabricacionIndex("produccion_completa");
}
// Embarque/en_transito/en_aduana/en_destino describen un estado puntual
// ("se completó cuando estadoFabricacion = X") — para que el algoritmo
// secuencial funcione (el paso queda verde una vez que se lo dejó atrás,
// no mientras se está exactamente en X), "completado" acá significa
// "avanzó al estado SIGUIENTE o más allá", simétrico con en_produccion de
// arriba (que se completa recién al llegar a produccion_completa).
function completadoEmbarque(estado: string, fechaEmbarque: Date | null): boolean {
  return estadoFabricacionIndex(estado) >= estadoFabricacionIndex("en_transito") && fechaEmbarque !== null;
}
function completadoEnTransito(estado: string): boolean {
  return estadoFabricacionIndex(estado) >= estadoFabricacionIndex("en_aduana");
}
function completadoEnAduana(estado: string): boolean {
  return estadoFabricacionIndex(estado) >= estadoFabricacionIndex("en_destino");
}
function completadoEnDestino(estado: string): boolean {
  return estadoFabricacionIndex(estado) >= estadoFabricacionIndex("entregado");
}
function completadoEntregado(estado: string, fechaEntrega: Date | null): boolean {
  return estadoFabricacionIndex(estado) >= estadoFabricacionIndex("entregado") && fechaEntrega !== null;
}

/** Fecha mostrada para cada paso — solo se muestra cuando hay un dato real
 * y confiable en el schema; los pasos de tránsito/aduana/destino no tienen
 * un timestamp propio de "cuándo entró a ese estado" (no hay un log de
 * cambios), así que quedan en null en vez de inventar una fecha a partir
 * de updatedAt (que cambia con cualquier edición, no solo con el estado). */
function fechaPorPaso(id: PasoId, d: DatosTimelineUnidad): Date | null {
  switch (id) {
    case "venta_cerrada":
    case "unidad_creada":
      return d.createdAt;
    case "cobro_anticipo":
      return d.primerCobroFecha;
    case "pago_fabrica":
      return d.primerPagoFabricaFecha;
    case "embarque":
      return d.fechaEmbarque;
    case "entregado":
      return d.fechaEntrega;
    default:
      return null;
  }
}

/** Calcula los 10 pasos de la línea de tiempo — el primero cuyo predicado de
 * "completado" da falso es el "actual" (el más avanzado no completado);
 * todo lo anterior es "completado", todo lo posterior queda "pendiente"
 * sin importar si su propio predicado daría verdadero (progreso
 * secuencial: no se puede estar "en aduana" sin haber completado
 * "embarque" en la línea de tiempo, aunque el dato de fechaEmbarque falte). */
export function calcularPasos(d: DatosTimelineUnidad): PasoInfo[] {
  const completados: Record<PasoId, boolean> = {
    venta_cerrada: d.clienteId !== null && d.clienteId !== "",
    unidad_creada: !!d.modelo && d.precioCliente !== null,
    cobro_anticipo: d.primerCobroFecha !== null,
    pago_fabrica: d.primerPagoFabricaFecha !== null,
    en_produccion: completadoEnProduccion(d.estadoFabricacion),
    embarque: completadoEmbarque(d.estadoFabricacion, d.fechaEmbarque),
    en_transito: completadoEnTransito(d.estadoFabricacion),
    en_aduana: completadoEnAduana(d.estadoFabricacion),
    en_destino: completadoEnDestino(d.estadoFabricacion),
    entregado: completadoEntregado(d.estadoFabricacion, d.fechaEntrega),
  };

  let actualYaAsignado = false;
  return ORDEN.map((id) => {
    let estado: PasoEstado;
    if (completados[id] && !actualYaAsignado) {
      estado = "completado";
    } else if (!actualYaAsignado) {
      estado = "actual";
      actualYaAsignado = true;
    } else {
      estado = "pendiente";
    }
    return { id, titulo: TITULOS[id], estado, fecha: estado === "pendiente" ? null : fechaPorPaso(id, d) };
  });
}

export function pasoActual(pasos: PasoInfo[]): PasoInfo | null {
  return pasos.find((p) => p.estado === "actual") ?? null;
}

/** Título + acciones recomendadas para el paso actual cuando ese paso cae
 * en una de las etapas de fabricación/logística (pasos 5 a 10) — se indexa
 * por el estadoFabricacion real, no por el paso visual, así que una unidad
 * en "producción completa" muestra sus propias acciones ("Registrar saldo
 * a fábrica") aunque el nodo resaltado en la línea de tiempo sea
 * "Embarque" (el próximo nodo pendiente). */
export const ACCIONES_POR_ESTADO: Record<EstadoFabricacion, { corto: string; acciones: AccionItem[] }> = {
  pendiente: {
    corto: "Iniciar producción",
    acciones: [{ texto: "Cambiar estado a \"En producción\"", anchor: "estado" }],
  },
  // El primer pago a fábrica ya es un paso propio (pago_fabrica) que va
  // antes en la secuencia — si se llega acá, ya está registrado.
  en_produccion: {
    corto: "Completar producción",
    acciones: [
      { texto: "Subir PI en carpeta 04", anchor: "seccion-envio:04_produccion" },
      { texto: "Cambiar estado a \"Producción completa\"", anchor: "estado" },
    ],
  },
  produccion_completa: {
    corto: "Registrar saldo fábrica",
    acciones: [
      { texto: "Registrar pago saldo a fábrica", anchor: "cobranza" },
      { texto: "Coordinar embarque", anchor: "estado" },
    ],
  },
  embarcado: {
    corto: "Subir BL",
    acciones: [
      { texto: "Subir BL y Packing List en carpeta 05", anchor: "seccion-envio:05_embarque" },
      { texto: "Registrar pago flete", anchor: "cobranza" },
    ],
  },
  en_transito: {
    corto: "Confirmar arribo",
    acciones: [{ texto: "Confirmar fecha de arribo", anchor: "estado" }],
  },
  en_aduana: {
    corto: "Cobrar saldo",
    acciones: [
      { texto: "Registrar pago despachante", anchor: "cobranza" },
      { texto: "Subir documentos carpeta 06", anchor: "seccion-envio:06_despacho" },
      { texto: "Cobrar saldo al cliente", anchor: "cobranza" },
    ],
  },
  en_destino: {
    corto: "Coordinar transporte",
    acciones: [
      { texto: "Coordinar transporte local", anchor: "estado" },
      { texto: "Registrar pago transporte", anchor: "cobranza" },
    ],
  },
  entregado: {
    corto: "Activar garantía",
    acciones: [
      { texto: "Subir acta de entrega carpeta 07", anchor: "seccion-unidad:07_entrega" },
      { texto: "Activar garantía", anchor: "garantia" },
      { texto: "Cerrar cobros", anchor: "cobranza" },
    ],
  },
};

/** Título + acciones para cuando el paso actual es uno de los 4 pasos
 * comerciales (venta/unidad/cobro/pago a fábrica) — no dependen de
 * estadoFabricacion, sino de los datos de la unidad y de los movimientos
 * reales de cobranza. */
type PasoComercial = "venta_cerrada" | "unidad_creada" | "cobro_anticipo" | "pago_fabrica";
const PASOS_COMERCIALES: readonly PasoId[] = ["venta_cerrada", "unidad_creada", "cobro_anticipo", "pago_fabrica"];
function esPasoComercial(id: PasoId): id is PasoComercial {
  return PASOS_COMERCIALES.includes(id);
}

const ACCIONES_PASOS_COMERCIALES: Record<PasoComercial, { corto: string; titulo: string; acciones: AccionItem[] }> = {
  venta_cerrada: {
    corto: "Vincular cliente",
    titulo: "Venta cerrada",
    acciones: [{ texto: "Vincular la unidad a un cliente", anchor: "datos-unidad" }],
  },
  unidad_creada: {
    corto: "Completar datos",
    titulo: "Unidad creada",
    acciones: [{ texto: "Completar modelo y precio de la unidad", anchor: "datos-unidad" }],
  },
  cobro_anticipo: {
    corto: "Cobrar anticipo",
    titulo: "Cobro anticipo",
    acciones: [{ texto: "Registrar el cobro del anticipo", anchor: "cobranza" }],
  },
  pago_fabrica: {
    corto: "Registrar pago a fábrica",
    titulo: "Pago a fábrica",
    acciones: [{ texto: "Registrar el pago a fábrica", anchor: "cobranza" }],
  },
};

/** Título y acciones del paso actual, sea comercial (1-4) o de fabricación
 * (5-10, indexado por el estadoFabricacion real) — null cuando ya no hay
 * ningún paso "actual" (todo completado). */
export function accionesPasoActual(
  d: DatosTimelineUnidad
): { titulo: string; acciones: AccionItem[] } | null {
  const actual = pasoActual(calcularPasos(d));
  if (!actual) return null;
  if (esPasoComercial(actual.id)) {
    const c = ACCIONES_PASOS_COMERCIALES[actual.id];
    return { titulo: c.titulo, acciones: c.acciones };
  }
  const entrada = ACCIONES_POR_ESTADO[d.estadoFabricacion as EstadoFabricacion];
  if (!entrada) return { titulo: actual.titulo, acciones: [] };
  return { titulo: estadoFabricacionLabels[d.estadoFabricacion as EstadoFabricacion] ?? actual.titulo, acciones: entrada.acciones };
}

/** Etiqueta corta de una sola línea para columnas de grilla — misma lógica
 * que la línea de tiempo, pensada para /admin/unidades y la grilla del
 * dashboard. */
export function proximoPasoCorto(d: DatosTimelineUnidad): string {
  const actual = pasoActual(calcularPasos(d));
  if (!actual) return "✅ Completado";
  if (esPasoComercial(actual.id)) {
    return ACCIONES_PASOS_COMERCIALES[actual.id].corto;
  }
  return ACCIONES_POR_ESTADO[d.estadoFabricacion as EstadoFabricacion]?.corto ?? "Revisar estado";
}
