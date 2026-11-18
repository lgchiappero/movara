import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { exigirSesion } from "@/lib/bot-whatsapp/permisos";
import { ID_CONFIG, gastoDelMes, obtenerConfigBot } from "@/lib/bot-whatsapp/config";
import { leerYValidar } from "@/lib/bot-whatsapp/http";
import { configPatchSchema } from "@/lib/validators/bot-whatsapp";

/** Configuración del bot y gasto del mes. Ver: los dos roles. */
export async function GET() {
  const acceso = await exigirSesion();
  if (!acceso.ok) return acceso.respuesta;
  const config = await obtenerConfigBot();
  return NextResponse.json({ config, gasto: await gastoDelMes(config.topeGastoMensualUsd) });
}

/** Cambiar la configuración, incluido prender/apagar: solo administrador. */
export async function PATCH(req: Request) {
  const acceso = await exigirSesion({ soloAdmin: true, escritura: true });
  if (!acceso.ok) return acceso.respuesta;
  const lectura = await leerYValidar(req, configPatchSchema);
  if (!lectura.ok) return lectura.respuesta;

  await obtenerConfigBot(); // existe antes de actualizar
  const config = await db.configBot.update({
    where: { id: ID_CONFIG },
    data: { ...lectura.datos, actualizadoPor: acceso.sesion.email },
  });
  return NextResponse.json({ config, gasto: await gastoDelMes(config.topeGastoMensualUsd) });
}
