import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { estadoPedidoOptions, ESTADO_PEDIDO_CANCELADO, type EstadoPedido } from "@/lib/pedido/estado-pedido";
import { ensureNumeroPedido } from "@/lib/pedido/numero-pedido";
import { buildEstadoEmail } from "@/lib/email/pedido-estado-email";
import { enviarEmail } from "@/lib/email/enviar";
import { calcularGarantiaFechaFin } from "@/lib/pedido/garantia";
import { getAdminUser } from "@/lib/admin/current-user";
import { isAdmin } from "@/lib/admin/roles";
import { recalcularClientes } from "@/lib/clientes/servicio";

const numberOrNull = z.union([z.number(), z.null()]);
const stringOrNull = z.union([z.string(), z.null()]).transform((v) => (v === "" ? null : v));
const dateOrNull = z
  .union([z.string(), z.null()])
  .transform((v) => (v ? new Date(v) : null));

const GestionSchema = z.object({
  // "cancelado" solo se acepta si el pedido ya estaba cancelado (se guardan
  // otros datos sin reactivarlo); para cancelar está .../cancelar.
  estadoPedido: z.enum([...estadoPedidoOptions, ESTADO_PEDIDO_CANCELADO]),
  precioFinal: numberOrNull,
  anticipo: numberOrNull,
  numeroFabrica: stringOrNull,
  numeroContenedor: stringOrNull,
  numeroBL: stringOrNull,
  fechaConfirmacion: dateOrNull,
  fechaProduccion: dateOrNull,
  fechaDespacho: dateOrNull,
  fechaArriboEstimado: dateOrNull,
  fechaEntrega: dateOrNull,
  notasInternas: stringOrNull,
  notasCliente: stringOrNull,
  costoProveedor: numberOrNull,
  costoFlete: numberOrNull,
  costoAduana: numberOrNull,
  costoOtros: numberOrNull,

  // ─── Gestión comercial ────────────────────────────────────
  vendedorAsignado: stringOrNull,
  piProveedor: stringOrNull,
  fechaPIPagado: dateOrNull,
  montoPI: numberOrNull,
  // piUrl/comprobantePagoUrl/comprobanteSaldoUrl/seguroUrl/inspeccionUrl/
  // fotosUrl NO se editan acá — solo los setea el endpoint de documentos al
  // subir un archivo (ver src/lib/validators/documentos.ts, campoDestino).

  // ─── Logística y aduana ────────────────────────────────────
  seguroTransporte: z.boolean(),
  inspeccionFabrica: z.boolean(),
  fotosDespachadas: z.boolean(),
  notasDespachador: stringOrNull,
  gastosDespachante: numberOrNull,
  impuestosAduana: numberOrNull,
  gastosPortuarios: numberOrNull,

  // ─── Entrega e instalación ──────────────────────────────────
  costoGruaDescarga: numberOrNull,
  costoTransporteLocal: numberOrNull,
  instalacionFecha: dateOrNull,
  instalacionNotas: stringOrNull,
  satisfaccionCliente: stringOrNull,

  // ─── Garantía MOVARA ────────────────────────────────────────
  garantiaActivada: z.boolean(),
  garantiaFechaInicio: dateOrNull,
  // garantiaFechaFin se calcula server-side, no viaja en el input.
});

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const body = await req.json();
  const parsed = GestionSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Datos inválidos" }, { status: 400 });
  }
  const data = parsed.data;

  const saldoPendiente =
    data.precioFinal != null ? data.precioFinal - (data.anticipo ?? 0) : null;

  const costoTotal =
    data.costoProveedor != null ||
    data.costoFlete != null ||
    data.costoAduana != null ||
    data.costoOtros != null
      ? (data.costoProveedor ?? 0) +
        (data.costoFlete ?? 0) +
        (data.costoAduana ?? 0) +
        (data.costoOtros ?? 0)
      : null;

  const margenUSD =
    data.precioFinal != null && costoTotal != null ? data.precioFinal - costoTotal : null;

  const margenPorcentaje =
    margenUSD != null && data.precioFinal ? (margenUSD / data.precioFinal) * 100 : null;

  const garantiaFechaFin = calcularGarantiaFechaFin(data.garantiaFechaInicio);

  try {
    const previous = await db.configuracionPedido.findUnique({
      where: { id },
      select: { estadoPedido: true, clienteEmail: true, clienteNombre: true },
    });
    const eraCancelado = previous?.estadoPedido === ESTADO_PEDIDO_CANCELADO;
    if (data.estadoPedido === ESTADO_PEDIDO_CANCELADO && !eraCancelado) {
      return NextResponse.json({ error: "Para cancelar el pedido usá \"Cancelar pedido\"" }, { status: 400 });
    }
    // Pasar un pedido cancelado a un estado del flujo lo reactiva.
    const reactivacion =
      eraCancelado && data.estadoPedido !== ESTADO_PEDIDO_CANCELADO
        ? { motivoCancelacion: null, fechaCancelacion: null, canceladoPor: null, estadoAntesDeCancelar: null }
        : {};

    let config = await db.configuracionPedido.update({
      where: { id },
      data: {
        ...data,
        ...reactivacion,
        saldoPendiente,
        costoTotal,
        margenUSD,
        margenPorcentaje,
        garantiaFechaFin,
      },
    });

    const estadoCambio = previous && previous.estadoPedido !== config.estadoPedido;
    if (estadoCambio) {
      await recalcularClientes(db, [config.clienteId]).catch((err) =>
        console.error("[admin/configuraciones/:id PATCH] No se pudo recalcular el estado del cliente", err)
      );
      if (config.estadoPedido === "confirmado" && !config.numeroPedido) {
        await ensureNumeroPedido(id);
        config = await db.configuracionPedido.findUniqueOrThrow({ where: { id } });
      }
      await enviarEmailEstado(config.estadoPedido as EstadoPedido, config);
    }

    return NextResponse.json({ ok: true, config });
  } catch (err) {
    console.error("[admin/configuraciones/:id PATCH]", err);
    return NextResponse.json({ error: "Error al guardar" }, { status: 500 });
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const session = await getAdminUser();
  if (!session) {
    return NextResponse.json({ error: "Sesión inválida" }, { status: 401 });
  }
  if (!isAdmin(session.rol)) {
    return NextResponse.json({ error: "Solo un administrador puede eliminar" }, { status: 403 });
  }

  try {
    await db.$transaction(async (tx) => {
      const borrado = await tx.configuracionPedido.delete({ where: { id }, select: { clienteId: true } });
      await recalcularClientes(tx, [borrado.clienteId]);
    });
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[admin/configuraciones/:id DELETE]", err);
    return NextResponse.json({ error: "Error al eliminar" }, { status: 500 });
  }
}

async function enviarEmailEstado(
  estado: EstadoPedido,
  config: {
    clienteEmail: string | null;
    clienteNombre: string;
    numeroPedido: string | null;
    tokenSeguimiento: string;
    fechaDespacho: Date | null;
    fechaArriboEstimado: Date | null;
  }
) {
  if (!config.clienteEmail) return;

  const email = buildEstadoEmail(estado, {
    clienteNombre: config.clienteNombre,
    numeroPedido: config.numeroPedido,
    tokenSeguimiento: config.tokenSeguimiento,
    fechaDespacho: config.fechaDespacho,
    fechaArriboEstimado: config.fechaArriboEstimado,
  });
  if (!email) return;

  const resultado = await enviarEmail({
    to: config.clienteEmail,
    replyTo: "contacto@movara.com.ar",
    subject: email.subject,
    html: email.html,
  });
  if (!resultado.ok) {
    console.error(`[admin/configuraciones/:id] ${config.numeroPedido ?? "-"} Falló el email de estado "${estado}": ${resultado.error}`);
  }
}
