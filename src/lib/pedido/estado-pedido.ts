export const estadoPedidoOptions = [
  "consulta",
  "presupuestado",
  "confirmado",
  "en_produccion",
  "en_transito",
  "en_aduana",
  "entregado",
] as const;

export type EstadoPedido = (typeof estadoPedidoOptions)[number];

export const estadoPedidoLabels: Record<EstadoPedido, string> = {
  consulta: "Consulta",
  presupuestado: "Presupuestado",
  confirmado: "Confirmado",
  en_produccion: "En producción",
  en_transito: "En tránsito",
  en_aduana: "En aduana",
  entregado: "Entregado",
};

export function estadoPedidoIndex(estado: string): number {
  return estadoPedidoOptions.indexOf(estado as EstadoPedido);
}

/** Fuera del flujo: un pedido cancelado no cuenta para el estado del
 * cliente ni se muestra en /mi-pedido. Se cancela y reactiva desde
 * /api/admin/configuraciones/[id]/cancelar. */
export const ESTADO_PEDIDO_CANCELADO = "cancelado";

export function etiquetaEstadoPedido(estado: string): string {
  return estado === ESTADO_PEDIDO_CANCELADO ? "Cancelado" : (estadoPedidoLabels[estado as EstadoPedido] ?? estado);
}
