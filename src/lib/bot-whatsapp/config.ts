import type { ConfigBot } from "@prisma/client";
import { db } from "@/lib/db";
import { mesAnioAR } from "@/lib/fecha-ar";
import { AVISO_GASTO, HORARIO_POR_DEFECTO, MENSAJE_BIENVENIDA_POR_DEFECTO } from "./constantes";

export const ID_CONFIG = "unico";

/** La configuración del bot. Si todavía no existe, la crea con los valores
 * por defecto: el bot arranca APAGADO. */
export async function obtenerConfigBot(): Promise<ConfigBot> {
  return db.configBot.upsert({
    where: { id: ID_CONFIG },
    update: {},
    create: { id: ID_CONFIG, horarioAtencion: HORARIO_POR_DEFECTO, mensajeBienvenida: MENSAJE_BIENVENIDA_POR_DEFECTO },
  });
}

/** Mes en curso en hora argentina, como se guarda en UsoBot.mes. */
export function mesActual(ahora: Date = new Date()): string {
  const { anio, mes } = mesAnioAR(ahora);
  return `${anio}-${String(mes).padStart(2, "0")}`;
}

export type NivelGasto = "normal" | "aviso" | "tope";

export type GastoMes = { mes: string; costoUsd: number; topeUsd: number; porcentaje: number; nivel: NivelGasto };

/** Gasto del mes contra el tope: amarillo desde el 80 %, rojo al 100 %. */
export function calcularGasto(mes: string, costoUsd: number, topeUsd: number): GastoMes {
  const porcentaje = topeUsd > 0 ? costoUsd / topeUsd : costoUsd > 0 ? 1 : 0;
  const nivel: NivelGasto = porcentaje >= 1 ? "tope" : porcentaje >= AVISO_GASTO ? "aviso" : "normal";
  return { mes, costoUsd, topeUsd, porcentaje, nivel };
}

export async function gastoDelMes(topeUsd: number, ahora: Date = new Date()): Promise<GastoMes> {
  const mes = mesActual(ahora);
  const uso = await db.usoBot.findUnique({ where: { mes } });
  return calcularGasto(mes, uso?.costoUsd ?? 0, topeUsd);
}
