import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getAdminUser } from "@/lib/admin/current-user";
import { isAdmin } from "@/lib/admin/roles";
import { BUCKET_MOVARA, BUCKET_PEDIDOS, eliminarArchivo } from "@/lib/admin/storage";
import { campoDestinoOptions } from "@/lib/validators/documentos";

export type OrigenDocumento = "unidad" | "envio" | "pedido";

export type ResultadoEliminar = { ok: true } | { ok: false; status: number; error: string };

type Documento = { id: string; url: string; seccion?: string };

/** Busca el documento solo dentro de su entidad: un id de otra unidad (o
 * de otro tipo de entidad) da 404. */
async function buscarDocumento(origen: OrigenDocumento, entidadId: string, documentoId: string): Promise<Documento | null> {
  if (origen === "unidad") {
    return db.documentoUnidad.findFirst({
      where: { id: documentoId, unidadId: entidadId },
      select: { id: true, url: true, seccion: true },
    });
  }
  if (origen === "envio") {
    return db.documentoEnvio.findFirst({ where: { id: documentoId, envioId: entidadId }, select: { id: true, url: true } });
  }
  return db.documentoPedido.findFirst({ where: { id: documentoId, pedidoId: entidadId }, select: { id: true, url: true } });
}

/** El PDF de un Recibo en Conformidad confirmado es la evidencia de la
 * entrega: no se puede eliminar. */
async function reciboConfirmadoDelDocumento(unidadId: string, doc: Documento): Promise<string | null> {
  if (doc.seccion !== "07_entrega") return null;
  const recibo = await db.reciboConformidad.findFirst({
    where: { unidadId, estado: "confirmado", pdfPath: doc.url },
    select: { numeroRecibo: true },
  });
  return recibo?.numeroRecibo ?? null;
}

/** Elimina un documento: primero el archivo en Storage y, solo si eso
 * salió bien, el registro en la base. Si Storage falla, el documento queda
 * como estaba (nunca un registro apuntando a un archivo borrado a medias). */
export async function eliminarDocumento(
  origen: OrigenDocumento,
  entidadId: string,
  documentoId: string
): Promise<ResultadoEliminar> {
  const doc = await buscarDocumento(origen, entidadId, documentoId);
  if (!doc) return { ok: false, status: 404, error: "Documento no encontrado" };

  if (origen === "unidad") {
    const numeroRecibo = await reciboConfirmadoDelDocumento(entidadId, doc);
    if (numeroRecibo) {
      return {
        ok: false,
        status: 409,
        error: `No se puede eliminar: es el Recibo en Conformidad ${numeroRecibo} confirmado`,
      };
    }
  }

  const bucket = origen === "pedido" ? BUCKET_PEDIDOS : BUCKET_MOVARA;
  const borrado = await eliminarArchivo(bucket, doc.url);
  if (!borrado) {
    return { ok: false, status: 502, error: "No pudimos borrar el archivo. El documento no se eliminó; probá de nuevo." };
  }

  if (origen === "unidad") {
    await db.documentoUnidad.delete({ where: { id: doc.id } });
  } else if (origen === "envio") {
    await db.documentoEnvio.delete({ where: { id: doc.id } });
  } else {
    // Un documento del pedido puede estar además en un campo del pedido
    // (PI, comprobantes, seguro…): ese campo deja de apuntar al archivo.
    const pedido = await db.configuracionPedido.findUnique({
      where: { id: entidadId },
      select: Object.fromEntries(campoDestinoOptions.map((c) => [c, true])) as Record<(typeof campoDestinoOptions)[number], true>,
    });
    const campos = campoDestinoOptions.filter((c) => pedido?.[c] === doc.url);
    await db.$transaction([
      db.documentoPedido.delete({ where: { id: doc.id } }),
      ...(campos.length
        ? [db.configuracionPedido.update({ where: { id: entidadId }, data: Object.fromEntries(campos.map((c) => [c, null])) })]
        : []),
    ]);
  }
  return { ok: true };
}

/** Handler común de DELETE …/documentos/[documentoId] (unidades, envíos y
 * pedidos): sesión válida y rol admin, después eliminarDocumento. */
export async function responderEliminarDocumento(
  origen: OrigenDocumento,
  entidadId: string,
  documentoId: string
): Promise<NextResponse> {
  const session = await getAdminUser();
  if (!session) {
    return NextResponse.json({ error: "Sesión inválida" }, { status: 401 });
  }
  if (!isAdmin(session.rol)) {
    return NextResponse.json({ error: "Solo un administrador puede eliminar" }, { status: 403 });
  }
  const resultado = await eliminarDocumento(origen, entidadId, documentoId);
  if (!resultado.ok) {
    return NextResponse.json({ error: resultado.error }, { status: resultado.status });
  }
  return NextResponse.json({ ok: true });
}
