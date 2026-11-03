import { NextRequest, NextResponse } from "next/server";
import { enviarEmail } from "@/lib/email/enviar";
import { escapeHtml } from "@/lib/email/escape-html";
import { db } from "@/lib/db";
import { pedidoSchema } from "@/lib/validators/pedido";
import { modeloLabelsEs } from "@/lib/pdf/pedido-labels-es";
import { checkRateLimit, getClientIP } from "@/lib/rate-limit";
import { generateNumeroConsulta } from "@/lib/pedido/numero-consulta";
import { resumenError } from "@/lib/log-seguro";
import { calcularPrecio, toDesgloseEstimado } from "@/lib/precio-configurador";
import type { PreciosConfig } from "@/data/precios-extras";
import { materialesSegunAmbientes } from "@/data/material-catalog";
import { client } from "@/sanity/lib/client";
import { SITE_CONFIG_QUERY } from "@/sanity/lib/queries";
import { detalleConsultaHtml } from "@/lib/email/nueva-consulta";
import { conSavepoint, registrarContacto } from "@/lib/clientes/servicio";
import { origenDelBody } from "@/lib/origen-visita/clasificar";

async function sendNotificationEmail(clienteNombre: string, modelo: string, numeroConsulta: string, detalle: string) {
  const contactEmail = process.env.CONTACT_EMAIL || "lucianogchiappero@gmail.com";

  const resultado = await enviarEmail({
    to: contactEmail,
    replyTo: "lucianogchiappero@gmail.com",
    subject: `Nueva consulta — ${clienteNombre} — ${modelo} — ${numeroConsulta}`,
    html: `<!DOCTYPE html>
<html lang="es">
<head><meta charset="utf-8"></head>
<body style="margin:0;padding:20px;background:#f4f4f4;font-family:Arial,sans-serif;">
  <div style="max-width:480px;margin:0 auto;background:#fff;border-radius:10px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,.08);">
    <div style="background:#2F2F2F;padding:20px 24px;">
    <p style="margin:0;color:#D4B36A;font-size:18px;font-weight:bold;">📦 Nueva consulta — ${numeroConsulta}</p>
    </div>
    <div style="padding:24px;">
    <p style="color:#555;line-height:1.6;">${escapeHtml(clienteNombre)} completó el configurador para un módulo ${modelo}. Vela en el panel: /admin/configuraciones</p>
    ${detalle}
    </div>
  </div>
</body>
</html>`,
  });
  if (!resultado.ok) console.error(`[pedido] ${numeroConsulta} Falló el email a MOVARA: ${resultado.error}`);
}

/** Si el pedido no se pudo guardar (ej. a la base le falta una columna), el
 *  contacto no se pierde: llega por email a MOVARA para recontactarlo. Los
 *  datos personales van solo al email, nunca a los logs. */
async function avisarPedidoNoGuardado(data: { clienteNombre: string; clienteWhatsapp: string; clienteEmail?: string | null; modelo: string; provincia: string; localidad: string }) {
  const contactEmail = process.env.CONTACT_EMAIL || "lucianogchiappero@gmail.com";
  const fila = (k: string, v: string | null | undefined) =>
    `<tr><td style="padding:4px 8px;color:#777;">${k}</td><td style="padding:4px 8px;color:#222;font-weight:bold;">${escapeHtml(v || "—")}</td></tr>`;
  const resultado = await enviarEmail({
    to: contactEmail,
    replyTo: "lucianogchiappero@gmail.com",
    subject: `⚠️ Consulta NO guardada — recontactar a ${data.clienteNombre}`,
    html: `<!DOCTYPE html><html lang="es"><head><meta charset="utf-8"></head><body style="font-family:Arial,sans-serif;padding:20px;">
<p style="font-size:16px;font-weight:bold;color:#9a3412;">El configurador no pudo guardar esta consulta (error de base de datos). No figura en el admin: hay que recontactarla.</p>
<table>${fila("Fecha", new Date().toLocaleString("es-AR", { timeZone: "America/Argentina/Buenos_Aires" }))}${fila("Nombre", data.clienteNombre)}${fila("WhatsApp", data.clienteWhatsapp)}${fila("Email", data.clienteEmail)}${fila("Modelo", modeloLabelsEs[data.modelo as keyof typeof modeloLabelsEs] ?? data.modelo)}${fila("Ubicación", `${data.localidad}, ${data.provincia}`)}</table>
</body></html>`,
  });
  if (!resultado.ok) console.error(`[pedido] Falló el email de consulta no guardada: ${resultado.error}`);
}

/** Precios de Sanity; si no responde, el cálculo usa el fallback del código. */
async function getPrecios(): Promise<PreciosConfig | null> {
  try {
    return await client.fetch<PreciosConfig | null>(SITE_CONFIG_QUERY);
  } catch (err) {
    console.error(`[pedido] No se pudieron leer los precios de Sanity: ${resumenError(err)}`);
    return null;
  }
}

export async function POST(req: NextRequest) {
  const ip = getClientIP(req);
  const { allowed } = checkRateLimit(ip);
  if (!allowed) {
    return NextResponse.json({ error: "Demasiadas solicitudes" }, { status: 429 });
  }

  // Solo se avisa "no guardada" si falló antes de guardar el pedido.
  let datosContacto: Parameters<typeof avisarPedidoNoGuardado>[0] | null = null;
  try {
    const body = await req.json();
    const parsed = pedidoSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Datos inválidos", details: parsed.error.issues },
        { status: 400 }
      );
    }

    const data = parsed.data;
    datosContacto = data;
    const origen = origenDelBody((body as { origen?: unknown } | null)?.origen);
    // El desglose se calcula acá, no se toma del navegador: es la foto de los
    // precios del día que muestran después los PDFs.
    // Sin baño no se guarda ni se cobra nada del baño (un navegador viejo
    // podría mandarlo igual).
    const materiales = materialesSegunAmbientes(data.materiales, { incluyeBano: data.incluyeBano });
    const precio = calcularPrecio({ modelo: data.modelo, materiales, precios: await getPrecios() });

    const { numeroConsulta, tokenSeguimiento } = await db.$transaction(async (tx) => {
      const numero = await generateNumeroConsulta(tx);
      const creado = await tx.configuracionPedido.create({
        data: {
          clienteNombre: data.clienteNombre,
          clienteWhatsapp: data.clienteWhatsapp,
          clienteEmail: data.clienteEmail,
          tipoCliente: data.tipoCliente,
          razonSocial: data.razonSocial || null,
          nombreContacto: data.nombreContacto || null,
          modelo: data.modelo,
          finalidad: data.finalidad,
          provincia: data.provincia,
          localidad: data.localidad,
          habitaciones: data.habitaciones,
          incluyeCocina: data.incluyeCocina,
          tipoCocina: data.tipoCocina,
          incluyeBano: data.incluyeBano,
          tipoAgua: data.tipoAgua,
          lavarropas: data.lavarropas,
          materiales,
          upgrades: data.upgrades,
          notasConfiguracion: data.notasConfiguracion,
          precioEstimado: precio.total,
          desgloseEstimado: toDesgloseEstimado(precio),
          numeroConsulta: numero,
        },
        select: { id: true, tokenSeguimiento: true },
      });

      // Cliente y lead en la misma transacción, pero dentro de un savepoint:
      // si fallan, el pedido se guarda igual y queda el error en el log.
      await conSavepoint(tx, "vincular_cliente", () =>
        registrarContacto(
          tx,
          {
            nombre: data.clienteNombre,
            email: data.clienteEmail,
            telefono: data.clienteWhatsapp,
            tipoCliente: data.tipoCliente,
            razonSocial: data.razonSocial || null,
            nombreContacto: data.nombreContacto || null,
            provincia: data.provincia,
            localidad: data.localidad,
          },
          { tipo: "pedido", pedidoId: creado.id, numeroConsulta: numero },
          origen
        )
      ).catch((err) => console.error(`[pedido] ${numero} No se pudo vincular cliente y lead: ${resumenError(err)}`));

      return { numeroConsulta: numero, tokenSeguimiento: creado.tokenSeguimiento };
    });

    datosContacto = null;
    const aCotizar = precio.aConsultar.map((o) => o.nombre);
    await sendNotificationEmail(
      data.clienteNombre,
      modeloLabelsEs[data.modelo],
      numeroConsulta,
      detalleConsultaHtml(aCotizar, data.notasConfiguracion)
    );

    return NextResponse.json({ ok: true, numeroConsulta, tokenSeguimiento });
  } catch (err) {
    console.error(`[pedido] ${resumenError(err)}`);
    if (datosContacto) await avisarPedidoNoGuardado(datosContacto).catch(() => {});
    return NextResponse.json({ error: "Error al procesar la solicitud" }, { status: 500 });
  }
}
