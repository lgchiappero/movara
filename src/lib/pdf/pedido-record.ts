// Forma real de un ConfiguracionPedido guardado, para narrativa/PDF/spec —
// a diferencia de PedidoInput (src/lib/validators/pedido.ts), que es el
// contrato ESTRICTO que exige el configurador público antes de aceptar un
// envío, acá todo lo que en Prisma es opcional sigue siendo opcional.
//
// Un pedido puede llegar a esta forma sin estar completo: filas viejas del
// flujo admin anterior a la unificación del configurador, o pedidos creados
// a mano desde /admin/configuraciones (que deliberadamente no piden
// materiales/tipoAgua/tipoCocina/etc. al crearlos). Los builders de
// narrativa y PDF tienen que poder mostrar "lo que hay" sin explotar.
export type PedidoRecord = {
  clienteNombre: string;
  clienteWhatsapp: string | null;
  modelo: string | null;
  finalidad: string | null;
  provincia: string | null;
  localidad: string | null;
  habitaciones: number | null;
  incluyeCocina: boolean;
  tipoCocina: string | null;
  incluyeBano: boolean;
  tipoAgua: string | null;
  lavarropas: string | null;
  materiales: Record<string, string | null> | null;
  upgrades: string[];
};

export const SIN_ESPECIFICAR = "No especificado";

/** Busca `value` en `labels` — si `value` es null o no matchea ninguna
 * clave conocida, devuelve el fallback en vez de "undefined" o un crash. */
export function labelOrFallback<T extends string>(
  labels: Record<T, string>,
  value: string | null,
  fallback = SIN_ESPECIFICAR
): string {
  if (value === null) return fallback;
  return labels[value as T] ?? fallback;
}
