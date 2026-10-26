import { z } from "zod";

/** Estado comercial del cliente, de menos a más avanzado. */
export const ESTADO_CLIENTE_OPTIONS = [
  "interesado",
  "pedido_iniciado",
  "presupuestado",
  "comprador",
  "entregado",
] as const;
export type EstadoCliente = (typeof ESTADO_CLIENTE_OPTIONS)[number];

export const ESTADO_CLIENTE_LABELS: Record<EstadoCliente, string> = {
  interesado: "Interesado",
  pedido_iniciado: "Pedido iniciado",
  presupuestado: "Presupuestado",
  comprador: "Comprador",
  entregado: "Entregado",
};

export const ESTADO_CLIENTE_COLORS: Record<EstadoCliente, string> = {
  interesado: "bg-stone-100 text-stone-600",
  pedido_iniciado: "bg-orange-100 text-orange-700",
  presupuestado: "bg-yellow-100 text-yellow-700",
  comprador: "bg-green-100 text-green-700",
  entregado: "bg-sky-100 text-sky-700",
};

export function esEstadoCliente(v: unknown): v is EstadoCliente {
  return (ESTADO_CLIENTE_OPTIONS as readonly unknown[]).includes(v);
}

export function rangoEstado(estado: string): number {
  return ESTADO_CLIENTE_OPTIONS.indexOf(estado as EstadoCliente);
}

const ESTADOS_PEDIDO_COMPRADOR = ["confirmado", "en_produccion", "en_transito", "en_aduana"];

export type DatosEstado = {
  /** estadoPedido de cada pedido del cliente (los cancelados no cuentan). */
  estadosPedido: string[];
  tieneUnidad: boolean;
  tieneReciboConfirmado: boolean;
};

/** Estado automático: el del pedido más avanzado del cliente.
 * entregado: recibo en conformidad confirmado o pedido entregado.
 * comprador: pedido confirmado o más avanzado, o una unidad creada.
 * presupuestado / pedido_iniciado: pedido presupuestado / en consulta.
 * interesado: dejó datos sin pedido. */
export function calcularEstadoAutomatico(d: DatosEstado): EstadoCliente {
  const estados = d.estadosPedido;
  if (d.tieneReciboConfirmado || estados.includes("entregado")) return "entregado";
  if (d.tieneUnidad || estados.some((e) => ESTADOS_PEDIDO_COMPRADOR.includes(e))) return "comprador";
  if (estados.includes("presupuestado")) return "presupuestado";
  if (estados.includes("consulta")) return "pedido_iniciado";
  return "interesado";
}

export type EstadoGuardado = { estado: string; estadoManual: boolean; estadoAutomatico: string };

export type CambioEstado = {
  estado?: EstadoCliente;
  estadoAutomatico?: EstadoCliente;
  estadoManual?: false;
  estadoManualEn?: null;
  estadoManualPor?: null;
};

/** Qué guardar después de recalcular. Un estado manual se respeta hasta que
 * los pedidos lleven al cliente más adelante que el manual y que el
 * automático anterior: ahí se actualiza y deja de ser manual. (Comparar
 * también con el automático anterior evita que un estado bajado a mano
 * vuelva a subir con cualquier recálculo.) Null si no hay nada que cambiar. */
export function resolverEstado(actual: EstadoGuardado, automatico: EstadoCliente): CambioEstado | null {
  const cambio: CambioEstado = {};
  if (actual.estadoAutomatico !== automatico) cambio.estadoAutomatico = automatico;

  if (!actual.estadoManual) {
    if (actual.estado !== automatico) cambio.estado = automatico;
  } else if (
    rangoEstado(automatico) > rangoEstado(actual.estado) &&
    rangoEstado(automatico) > rangoEstado(actual.estadoAutomatico)
  ) {
    Object.assign(cambio, { estado: automatico, estadoManual: false, estadoManualEn: null, estadoManualPor: null });
  }
  return Object.keys(cambio).length ? cambio : null;
}

/** Body de PATCH /api/admin/clientes/[id]/estado: un estado manual, o
 * volver al cálculo automático. */
export const cambioEstadoClienteSchema = z.union([
  z.object({ estado: z.enum(ESTADO_CLIENTE_OPTIONS) }),
  z.object({ automatico: z.literal(true) }),
]);
export type CambioEstadoClienteInput = z.infer<typeof cambioEstadoClienteSchema>;

/** Orden de /admin/clientes: primero los "pedido iniciado" (hay que
 * presupuestarlos), después el resto; dentro de cada grupo, el más reciente
 * primero. */
export function ordenarClientes<T extends { estado: string; updatedAt: Date }>(clientes: T[]): T[] {
  return [...clientes].sort((a, b) => {
    const pa = a.estado === "pedido_iniciado" ? 0 : 1;
    const pb = b.estado === "pedido_iniciado" ? 0 : 1;
    return pa - pb || b.updatedAt.getTime() - a.updatedAt.getTime();
  });
}
