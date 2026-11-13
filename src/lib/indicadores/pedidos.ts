import type { Prisma } from "@prisma/client";
import { hoyAR, soloFecha, sumarDias } from "@/lib/fecha-ar";

// Indicadores de pedidos (ConfiguracionPedido): `where` de Prisma compartido
// por el contador y la lista (/admin/configuraciones?indicador=… / ?estado=…).

export const DIAS_SIN_ANTICIPO = 7;

export const INDICADORES_PEDIDO = {
  sin_anticipo: {
    label: `Confirmados sin cobro registrado hace más de ${DIAS_SIN_ANTICIPO} días`,
    // "Sin anticipo" = ningún cobro real en Cobranza: el cliente del pedido
    // no tiene ningún pago recibido en los planes de cobro de sus unidades
    // (no se mira el campo manual `anticipo`). fechaConfirmacion es solo
    // fecha: se compara contra hoy − 7 días en Argentina, también sin hora.
    where: (ahora: Date): Prisma.ConfiguracionPedidoWhereInput => ({
      estadoPedido: "confirmado",
      fechaConfirmacion: { lte: soloFecha(sumarDias(hoyAR(ahora), -DIAS_SIN_ANTICIPO)) },
      NOT: {
        cliente: {
          unidades: { some: { acuerdosPago: { some: { tipo: "cobro", movimientos: { some: {} } } } } },
        },
      },
    }),
  },
} as const;

export type IndicadorPedido = keyof typeof INDICADORES_PEDIDO;

export function esIndicadorPedido(v: unknown): v is IndicadorPedido {
  return typeof v === "string" && Object.hasOwn(INDICADORES_PEDIDO, v);
}

export function whereIndicadorPedido(indicador: IndicadorPedido, ahora: Date): Prisma.ConfiguracionPedidoWhereInput {
  return INDICADORES_PEDIDO[indicador].where(ahora);
}

export function wherePedidoPorEstado(estado: string): Prisma.ConfiguracionPedidoWhereInput {
  return { estadoPedido: estado };
}

export function hrefIndicadorPedido(indicador: IndicadorPedido): string {
  return `/admin/configuraciones?indicador=${indicador}`;
}

export function hrefPedidosPorEstado(estado: string): string {
  return `/admin/configuraciones?estado=${estado}`;
}
