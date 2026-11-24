import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { exigirSesion } from "@/lib/bot-whatsapp/permisos";
import { leerYValidar } from "@/lib/bot-whatsapp/http";
import { prepararImportacion, telefonosValidos } from "@/lib/bot-whatsapp/importar-excluidos";
import { importarExcluidosSchema, MAX_BODY_IMPORTAR } from "@/lib/validators/bot-whatsapp";

/** Importar excluidos desde la agenda (.vcf), solo administrador. El archivo
 * no llega acá: el navegador manda teléfono y nombre de cada contacto.
 * - confirmar: false → solo el resumen (cuántos se agregan y cuántos se
 *   saltean), sin tocar la base;
 * - confirmar: true → agrega los nuevos. skipDuplicates cubre a alguien que
 *   agregó el mismo teléfono entre el resumen y la confirmación. */
export async function POST(req: Request) {
  const acceso = await exigirSesion({ soloAdmin: true, escritura: true });
  if (!acceso.ok) return acceso.respuesta;
  const lectura = await leerYValidar(req, importarExcluidosSchema, MAX_BODY_IMPORTAR);
  if (!lectura.ok) return lectura.respuesta;
  const { contactos, confirmar } = lectura.datos;

  const existentes = await db.contactoExcluido.findMany({
    where: { telefono: { in: telefonosValidos(contactos) } },
    select: { telefono: true },
  });
  const importacion = prepararImportacion(contactos, new Set(existentes.map((e) => e.telefono)));
  const resumen = {
    agregar: importacion.nuevos.length,
    saltear: importacion.repetidos + importacion.yaExcluidos + importacion.invalidos,
    repetidos: importacion.repetidos,
    yaExcluidos: importacion.yaExcluidos,
    invalidos: importacion.invalidos,
  };
  if (!confirmar || importacion.nuevos.length === 0) return NextResponse.json({ resumen, agregados: 0 });

  const { count } = await db.contactoExcluido.createMany({
    data: importacion.nuevos.map((n) => ({ ...n, creadoPor: acceso.sesion.email })),
    skipDuplicates: true,
  });
  return NextResponse.json({ resumen, agregados: count });
}
