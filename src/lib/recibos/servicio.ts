import { renderToBuffer } from "@react-pdf/renderer";
import type { ReciboConformidad } from "@prisma/client";
import { db } from "@/lib/db";
import { BUCKET_MOVARA, buildStoragePath, downloadDocument, uploadDocument } from "@/lib/admin/storage";
import { ReciboConformidadDocument } from "@/lib/pdf/ReciboConformidadDocument";
import { buildEmailReciboConfirmado, buildEmailSolicitudRecibo, type DatosEmailRecibo } from "@/lib/email/recibo-emails";
import type { CrearReciboInput } from "@/lib/validators/recibo";
import { EMAIL_CONTACTO_MOVARA, NOMBRE_DOCUMENTO, linkRecibo } from "./constantes";
import { construirTextoRecibo, fechaFinGarantia, fechaHoraAR, fechaLargaUTC, textoPlano, type DatosTextoRecibo } from "./texto";
import { calcularHashRecibo } from "./hash";
import { generateNumeroRecibo } from "./numero-recibo";
import { enviarEmailRecibo, esReciboDePrueba, type ResultadoEmail } from "./enviar-email";

type Fallo = { ok: false; status: number; error: string };

export function datosTexto(r: ReciboConformidad): DatosTextoRecibo {
  return {
    numeroRecibo: r.numeroRecibo,
    fechaEntrega: r.fechaEntrega,
    lugarEntrega: r.lugarEntrega,
    observaciones: r.observaciones,
    clienteNombre: r.clienteNombre,
    clienteDni: r.clienteDni,
    clienteCuit: r.clienteCuit,
    numeroUnidad: r.numeroUnidad,
    modelo: r.modelo,
  };
}

function datosEmail(r: ReciboConformidad): DatosEmailRecibo {
  return {
    numeroRecibo: r.numeroRecibo,
    clienteNombre: r.clienteNombre,
    numeroUnidad: r.numeroUnidad,
    modelo: r.modelo,
    fechaEntregaTexto: fechaLargaUTC(r.fechaEntrega),
    lugarEntrega: r.lugarEntrega,
    observaciones: r.observaciones,
  };
}

/** Lugar por defecto: "dirección, localidad, provincia" con lo que haya. */
export function lugarPorDefecto(u: {
  direccionEntrega: string | null;
  localidadDestino: string | null;
  provinciaDestino: string | null;
}): string {
  return [u.direccionEntrega, u.localidadDestino, u.provinciaDestino]
    .map((v) => v?.trim())
    .filter(Boolean)
    .join(", ");
}

/** Qué le falta a una unidad para poder emitir su recibo (vacío = nada). */
export function faltantesParaRecibo(u: {
  numeroUnidad: string | null;
  modelo: string | null;
  cliente: { email: string | null };
}): string[] {
  const faltan: string[] = [];
  if (!u.numeroUnidad?.trim()) faltan.push("Nº de unidad");
  if (!u.modelo?.trim()) faltan.push("modelo");
  if (!u.cliente.email?.trim()) faltan.push("email del cliente");
  return faltan;
}

/** Crea el recibo con el snapshot de Cliente y Unidad. Una unidad tiene a lo
 * sumo un recibo no anulado. */
export async function crearRecibo(
  input: CrearReciboInput,
  creadoPor: string
): Promise<{ ok: true; recibo: ReciboConformidad } | Fallo> {
  const unidad = await db.unidad.findUnique({ where: { id: input.unidadId }, include: { cliente: true } });
  if (!unidad) return { ok: false, status: 404, error: "Unidad no encontrada" };

  const faltan = faltantesParaRecibo(unidad);
  if (faltan.length) {
    return { ok: false, status: 400, error: `Para emitir el recibo falta: ${faltan.join(", ")}` };
  }

  try {
    const recibo = await db.$transaction(async (tx) => {
      const vigente = await tx.reciboConformidad.findFirst({
        where: { unidadId: unidad.id, estado: { not: "anulado" } },
        select: { numeroRecibo: true },
      });
      if (vigente) throw new ReciboVigenteError(vigente.numeroRecibo);

      return tx.reciboConformidad.create({
        data: {
          unidadId: unidad.id,
          numeroRecibo: await generateNumeroRecibo(tx),
          fechaEntrega: input.fechaEntrega,
          lugarEntrega: input.lugarEntrega,
          observaciones: input.observaciones,
          creadoPor,
          clienteNombre: unidad.cliente.nombre,
          clienteDni: unidad.cliente.dni,
          clienteCuit: unidad.cliente.cuit,
          clienteEmail: unidad.cliente.email!.trim(),
          clienteTelefono: unidad.cliente.telefono,
          numeroUnidad: unidad.numeroUnidad!,
          modelo: unidad.modelo!,
        },
      });
    });
    return { ok: true, recibo };
  } catch (err) {
    if (err instanceof ReciboVigenteError) {
      return { ok: false, status: 409, error: `La unidad ya tiene el recibo ${err.numeroRecibo} sin anular` };
    }
    throw err;
  }
}

class ReciboVigenteError extends Error {
  constructor(public numeroRecibo: string) {
    super("recibo-vigente");
  }
}

/** Email al cliente con el link de confirmación. Si sale, registra cuándo y
 * a quién. Nunca lanza. */
export async function enviarSolicitud(recibo: ReciboConformidad, baseUrl?: string): Promise<ResultadoEmail> {
  const { subject, html } = buildEmailSolicitudRecibo(datosEmail(recibo), linkRecibo(recibo.token, baseUrl));
  const resultado = await enviarEmailRecibo(
    { to: recibo.clienteEmail, subject, html },
    { prueba: esReciboDePrueba(recibo.clienteEmail) }
  );
  if (resultado.ok) {
    await db.reciboConformidad.update({
      where: { id: recibo.id },
      data: { emailEnviadoAt: new Date(), emailEnviadoA: recibo.clienteEmail },
    });
  } else {
    console.error(`[recibos] No se pudo enviar el email de ${recibo.numeroRecibo}:`, resultado.error);
  }
  return resultado;
}

/** Recibo por token, si el link es válido: existe y no está anulado. */
export async function reciboPorToken(token: string): Promise<ReciboConformidad | null> {
  const recibo = await db.reciboConformidad.findUnique({ where: { token } });
  if (!recibo || recibo.estado === "anulado") return null;
  return recibo;
}

/** Registra la confirmación del cliente. Solo pasa de pendiente a confirmado
 * una vez: el update es condicional, así dos confirmaciones simultáneas no
 * pueden pisarse. En la misma transacción marca la unidad como entregada y
 * activa la garantía desde la fecha de entrega del recibo. */
export async function confirmarRecibo(
  token: string,
  evidencia: { ip: string | null; userAgent: string | null },
  ahora: Date = new Date()
): Promise<{ ok: true; recibo: ReciboConformidad } | Fallo> {
  const recibo = await reciboPorToken(token);
  if (!recibo) return { ok: false, status: 404, error: "LINK_INVALIDO" };
  if (recibo.estado === "confirmado") return { ok: false, status: 409, error: "Este recibo ya fue confirmado" };

  const textoConfirmado = textoPlano(construirTextoRecibo(datosTexto(recibo)));
  const hashContenido = calcularHashRecibo({
    ...datosTexto(recibo),
    textoConfirmado,
    clienteEmail: recibo.clienteEmail,
    confirmadoAt: ahora,
    ipConfirmacion: evidencia.ip,
    userAgent: evidencia.userAgent,
  });

  const confirmado = await db.$transaction(async (tx) => {
    const { count } = await tx.reciboConformidad.updateMany({
      where: { id: recibo.id, estado: "pendiente" },
      data: {
        estado: "confirmado",
        confirmadoAt: ahora,
        ipConfirmacion: evidencia.ip,
        userAgent: evidencia.userAgent,
        textoConfirmado,
        hashContenido,
      },
    });
    if (count === 0) return null;
    await tx.unidad.update({
      where: { id: recibo.unidadId },
      data: {
        estadoFabricacion: "entregado",
        fechaEntrega: recibo.fechaEntrega,
        garantiaActivada: true,
        garantiaInicio: recibo.fechaEntrega,
        garantiaFin: fechaFinGarantia(recibo.fechaEntrega),
      },
    });
    return tx.reciboConformidad.findUniqueOrThrow({ where: { id: recibo.id } });
  });

  if (!confirmado) return { ok: false, status: 409, error: "Este recibo ya fue confirmado" };
  return { ok: true, recibo: confirmado };
}

/** El hash guardado coincide con el recalculado a partir de los datos. */
export function verificarHash(r: ReciboConformidad): boolean {
  if (!r.hashContenido || !r.textoConfirmado || !r.confirmadoAt) return false;
  return (
    calcularHashRecibo({
      ...datosTexto(r),
      textoConfirmado: r.textoConfirmado,
      clienteEmail: r.clienteEmail,
      confirmadoAt: r.confirmadoAt,
      ipConfirmacion: r.ipConfirmacion,
      userAgent: r.userAgent,
    }) === r.hashContenido &&
    // y el texto guardado es el que corresponde a los datos del recibo
    r.textoConfirmado === textoPlano(construirTextoRecibo(datosTexto(r)))
  );
}

export function nombreArchivoPdf(r: Pick<ReciboConformidad, "numeroRecibo">): string {
  return `${NOMBRE_DOCUMENTO} ${r.numeroRecibo}.pdf`;
}

/** PDF del recibo confirmado, armado siempre desde los datos guardados. */
export async function generarPdfRecibo(r: ReciboConformidad): Promise<Buffer> {
  if (r.estado !== "confirmado" || !r.confirmadoAt || !r.hashContenido) {
    throw new Error(`[recibos] ${r.numeroRecibo} no está confirmado`);
  }
  return renderToBuffer(
    ReciboConformidadDocument({
      texto: construirTextoRecibo(datosTexto(r)),
      evidencia: {
        confirmadoTexto: fechaHoraAR(r.confirmadoAt),
        clienteEmail: r.clienteEmail,
        ipConfirmacion: r.ipConfirmacion,
        userAgent: r.userAgent,
        hashContenido: r.hashContenido,
      },
    })
  );
}

/** PDF para descargar: el guardado en Storage si existe, si no se regenera
 * (mismo contenido — sale de los mismos datos). */
export async function obtenerPdfRecibo(r: ReciboConformidad): Promise<Buffer> {
  if (r.pdfPath) {
    try {
      return await downloadDocument(BUCKET_MOVARA, r.pdfPath);
    } catch (err) {
      console.error(`[recibos] No se pudo leer el PDF guardado de ${r.numeroRecibo}, se regenera:`, err);
    }
  }
  return generarPdfRecibo(r);
}

/** Lo que pasa después de confirmar: guardar el PDF como documento de la
 * unidad (07_entrega) y mandarlo por email al cliente y a MOVARA. Si algo
 * falla, el recibo ya quedó confirmado: solo se registra en el log. */
export async function despuesDeConfirmar(r: ReciboConformidad): Promise<void> {
  let pdf: Buffer;
  try {
    pdf = await generarPdfRecibo(r);
  } catch (err) {
    console.error(`[recibos] No se pudo generar el PDF de ${r.numeroRecibo}:`, err);
    return;
  }

  const nombre = nombreArchivoPdf(r);
  try {
    const storagePath = buildStoragePath("unidades", r.unidadId, nombre);
    await uploadDocument(BUCKET_MOVARA, storagePath, new Uint8Array(pdf).buffer, "application/pdf");
    await db.$transaction([
      db.documentoUnidad.create({
        data: {
          unidadId: r.unidadId,
          seccion: "07_entrega",
          nombre,
          descripcion: "Confirmado por el cliente por email (firma electrónica, Ley 25.506)",
          url: storagePath,
          tipo: "application/pdf",
          subidoPor: "Recibo en Conformidad",
        },
      }),
      db.reciboConformidad.update({ where: { id: r.id }, data: { pdfPath: storagePath } }),
    ]);
  } catch (err) {
    console.error(`[recibos] No se pudo guardar el PDF de ${r.numeroRecibo} en los documentos de la unidad:`, err);
  }

  const datos = {
    ...datosEmail(r),
    confirmadoTexto: fechaHoraAR(r.confirmadoAt!),
    garantiaHastaTexto: fechaLargaUTC(fechaFinGarantia(r.fechaEntrega)),
  };
  const prueba = esReciboDePrueba(r.clienteEmail);
  const adjunto = [{ filename: nombre, content: pdf }];
  const envios: { to: string; para: "cliente" | "movara" }[] = [
    { to: r.clienteEmail, para: "cliente" },
    { to: EMAIL_CONTACTO_MOVARA, para: "movara" },
  ];
  for (const { to, para } of envios) {
    const { subject, html } = buildEmailReciboConfirmado(datos, para);
    const res = await enviarEmailRecibo({ to, subject, html, attachments: adjunto }, { prueba });
    if (!res.ok) console.error(`[recibos] No se pudo enviar ${r.numeroRecibo} confirmado (${para === "cliente" ? "al cliente" : "a MOVARA"}): ${res.error}`);
  }
}

/** Anula un recibo pendiente (solo rol admin — lo verifica la ruta). */
export async function anularRecibo(id: string, anuladoPor: string): Promise<{ ok: true } | Fallo> {
  const { count } = await db.reciboConformidad.updateMany({
    where: { id, estado: "pendiente" },
    data: { estado: "anulado", anuladoAt: new Date(), anuladoPor },
  });
  if (count === 1) return { ok: true };
  const existe = await db.reciboConformidad.findUnique({ where: { id }, select: { estado: true } });
  if (!existe) return { ok: false, status: 404, error: "Recibo no encontrado" };
  return { ok: false, status: 409, error: "Solo se puede anular un recibo pendiente" };
}
