import { NextRequest, NextResponse } from "next/server";
import { Resend } from "resend";
import { db } from "@/lib/db";
import { pedidoSchema } from "@/lib/validators/pedido";
import { modeloLabelsEs } from "@/lib/pdf/pedido-labels-es";
import { checkRateLimit, getClientIP } from "@/lib/rate-limit";
import { generateNumeroConsulta } from "@/lib/pedido/numero-consulta";

async function sendNotificationEmail(clienteNombre: string, modelo: string, numeroConsulta: string) {
  const apiKey = process.env.RESEND_API_KEY;
  const contactEmail = process.env.CONTACT_EMAIL || "lucianogchiappero@gmail.com";
  const fromEmail = process.env.RESEND_FROM_EMAIL ?? "MOVARA <onboarding@resend.dev>";

  if (!apiKey) return;

  try {
    const resend = new Resend(apiKey);
    await resend.emails.send({
      from: fromEmail,
      to: contactEmail,
      replyTo: "lucianogchiappero@gmail.com",
      subject: `Nueva consulta — ${clienteNombre} — ${modelo} — ${numeroConsulta}`,
      html: `<!DOCTYPE html>
<html lang="es">
<head><meta charset="utf-8"></head>
<body style="margin:0;padding:20px;background:#f4f4f4;font-family:Arial,sans-serif;">
  <div style="max-width:480px;margin:0 auto;background:#fff;border-radius:10px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,.08);">
    <div style="background:#2F2F2F;padding:20px 24px;">
      <p style="margin:0;color:#D4B06A;font-size:18px;font-weight:bold;">📦 Nueva consulta — ${numeroConsulta}</p>
    </div>
    <div style="padding:24px;">
      <p style="color:#555;line-height:1.6;">${clienteNombre} completó el configurador para un módulo ${modelo}. Vela en el panel: /admin/configuraciones</p>
    </div>
  </div>
</body>
</html>`,
    });
  } catch (err) {
    console.error("[pedido] Email error:", err);
  }
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

    const numeroConsulta = await db.$transaction(async (tx) => {
      const numero = await generateNumeroConsulta(tx);
      await tx.configuracionPedido.create({
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
      });
      return numero;
    });

    await sendNotificationEmail(data.clienteNombre, modeloLabelsEs[data.modelo], numeroConsulta);

    return NextResponse.json({ ok: true, numeroConsulta });
  } catch (err) {
    console.error("[pedido]", err);
    return NextResponse.json({ error: "Error al procesar la solicitud" }, { status: 500 });
  }
}
