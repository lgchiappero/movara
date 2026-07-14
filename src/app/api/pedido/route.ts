import { NextRequest, NextResponse } from "next/server";
import { Resend } from "resend";
import { renderToBuffer } from "@react-pdf/renderer";
import { db } from "@/lib/db";
import { pedidoSchema } from "@/lib/validators/pedido";
import { PedidoDocument } from "@/lib/pdf/PedidoDocument";
import { modeloLabels } from "@/lib/pdf/pedido-labels";
import { checkRateLimit, getClientIP } from "@/lib/rate-limit";

async function sendPedidoEmail(pdfBuffer: Buffer, clienteNombre: string, modelo: string) {
  const apiKey = process.env.RESEND_API_KEY;
  const contactEmail = process.env.CONTACT_EMAIL || "lucianogchiappero@gmail.com";
  const fromEmail = process.env.RESEND_FROM_EMAIL ?? "MOVARA <onboarding@resend.dev>";

  if (!apiKey) return false;

  try {
    const resend = new Resend(apiKey);
    await resend.emails.send({
      from: fromEmail,
      to: contactEmail,
      subject: `Nuevo pedido configurado — ${clienteNombre} — ${modelo}`,
      html: `<!DOCTYPE html>
<html lang="es">
<head><meta charset="utf-8"></head>
<body style="margin:0;padding:20px;background:#f4f4f4;font-family:Arial,sans-serif;">
  <div style="max-width:480px;margin:0 auto;background:#fff;border-radius:10px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,.08);">
    <div style="background:#2F2F2F;padding:20px 24px;">
      <p style="margin:0;color:#D4B06A;font-size:18px;font-weight:bold;">📦 Nuevo pedido configurado</p>
    </div>
    <div style="padding:24px;">
      <p style="color:#555;line-height:1.6;">${clienteNombre} completó el configurador de pedido para un módulo ${modelo}. El detalle técnico completo está en el PDF adjunto.</p>
    </div>
  </div>
</body>
</html>`,
      attachments: [
        {
          filename: `pedido-${clienteNombre.replace(/\s+/g, "-").toLowerCase()}.pdf`,
          content: pdfBuffer,
        },
      ],
    });
    return true;
  } catch (err) {
    console.error("[pedido] Email error:", err);
    return false;
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
      return NextResponse.json({ error: "Datos inválidos" }, { status: 400 });
    }

    const data = parsed.data;

    try {
      await db.configuracionPedido.create({
        data: {
          leadId: data.leadId || null,
          clienteNombre: data.clienteNombre,
          clienteEmail: data.clienteEmail || null,
          clienteWhatsapp: data.clienteWhatsapp,
          modelo: data.modelo,
          zonaClimatica: data.zonaClimatica,
          banoInodoro: data.banoInodoro,
          banoEspejo: data.banoEspejo,
          banoDucha: data.banoDucha,
          cocinaTipo: data.cocinaTipo,
          cocinaExtractor: data.cocinaExtractor,
          cocinaAlacena: data.cocinaAlacena,
          cocinaVentana: data.cocinaVentana,
          aberturaRejas: data.aberturaRejas,
          aberturaMosquitero: data.aberturaMosquitero,
          aberturaCortinas: data.aberturaCortinas,
          lavarropas: data.lavarropas,
          energiaSolar: data.energiaSolar,
          calefon: data.calefon,
          galeria: data.galeria,
          mejoraParedes100: data.mejoraParedes100,
          mejoraTripleVidrio: data.mejoraTripleVidrio,
          mejoraTechoSandwich: data.mejoraTechoSandwich,
        },
      });
    } catch (dbErr) {
      console.error("[pedido] DB error:", dbErr);
      return NextResponse.json({ error: "Error al guardar el pedido" }, { status: 500 });
    }

    const fecha = new Date().toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });

    const pdfBuffer = await renderToBuffer(PedidoDocument({ data, fecha }));

    await sendPedidoEmail(pdfBuffer, data.clienteNombre, modeloLabels[data.modelo]);

    return NextResponse.json({
      ok: true,
      pdfBase64: pdfBuffer.toString("base64"),
    });
  } catch (err) {
    console.error("[pedido]", err);
    return NextResponse.json({ error: "Error al procesar la solicitud" }, { status: 500 });
  }
}
