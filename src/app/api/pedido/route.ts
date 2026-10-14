import { NextRequest, NextResponse } from "next/server";
import { enviarEmail } from "@/lib/email/enviar";
import { escapeHtml } from "@/lib/email/escape-html";
import { db } from "@/lib/db";
import { pedidoSchema } from "@/lib/validators/pedido";
import { modeloLabelsEs } from "@/lib/pdf/pedido-labels-es";
import { checkRateLimit, getClientIP } from "@/lib/rate-limit";
import { generateNumeroConsulta } from "@/lib/pedido/numero-consulta";
import { resumenError } from "@/lib/log-seguro";

async function sendNotificationEmail(clienteNombre: string, modelo: string, numeroConsulta: string) {
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
    </div>
  </div>
</body>
</html>`,
  });
  if (!resultado.ok) console.error(`[pedido] ${numeroConsulta} Falló el email a MOVARA: ${resultado.error}`);
}

export async function POST(req: NextRequest) {
  const ip = getClientIP(req);
  const { allowed } = checkRateLimit(ip);
  if (!allowed) {
    return NextResponse.json({ error: "Demasiadas solicitudes" }, { status: 429 });
  }

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
          materiales: data.materiales,
          upgrades: data.upgrades,
          precioEstimado: data.precioEstimado,
          numeroConsulta: numero,
        },
        select: { tokenSeguimiento: true },
      });
      return { numeroConsulta: numero, tokenSeguimiento: creado.tokenSeguimiento };
    });

    await sendNotificationEmail(data.clienteNombre, modeloLabelsEs[data.modelo], numeroConsulta);

    return NextResponse.json({ ok: true, numeroConsulta, tokenSeguimiento });
  } catch (err) {
    console.error(`[pedido] ${resumenError(err)}`);
    return NextResponse.json({ error: "Error al procesar la solicitud" }, { status: 500 });
  }
}
