import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db/index";
import { enviarEmail } from "@/lib/email/enviar";
import { escapeHtml } from "@/lib/email/escape-html";
import { resumenError } from "@/lib/log-seguro";

const Schema = z.object({
  email: z.string().email(),
  source: z.string().max(50).optional(),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = Schema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Email inválido" }, { status: 400 });
    }

    const { email, source = "exit_intent" } = parsed.data;

    try {
      await db.$executeRaw`
        INSERT INTO leads_email (email, source)
        VALUES (${email}, ${source})
      `;
    } catch (dbErr) {
      console.error(`[leads-email] No se pudo guardar: ${resumenError(dbErr)}`);
    }

    const contactEmail = process.env.CONTACT_EMAIL;
    if (contactEmail) {
      const r = await enviarEmail({
        to: contactEmail,
        replyTo: "lucianogchiappero@gmail.com",
        subject: "MOVARA | Nuevo email capturado — exit intent",
        html: `<!DOCTYPE html>
<html lang="es">
<head><meta charset="utf-8"></head>
<body style="margin:0;padding:20px;background:#f4f4f4;font-family:Arial,sans-serif;">
  <div style="max-width:480px;margin:0 auto;background:#fff;border-radius:10px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,.08);">
    <div style="background:#2F2F2F;padding:20px 24px;">
      <p style="margin:0;color:#D4B06A;font-size:18px;font-weight:bold;">📧 Nuevo email capturado — Exit Intent</p>
    </div>
    <div style="padding:24px;">
      <table style="width:100%;border-collapse:collapse;font-size:14px;">
        <tr><td style="padding:10px 0;color:#888;width:100px">Email</td><td style="padding:10px 0;color:#222;font-weight:600">${escapeHtml(email)}</td></tr>
        <tr><td style="padding:10px 0;color:#888">Fuente</td><td style="padding:10px 0;color:#222">${escapeHtml(source)}</td></tr>
        <tr><td style="padding:10px 0;color:#888">Fecha</td><td style="padding:10px 0;color:#222">${new Date().toLocaleString("es-AR", { timeZone: "America/Argentina/Buenos_Aires" })}</td></tr>
      </table>
    </div>
  </div>
</body>
</html>`,
      });
      if (!r.ok) console.error(`[leads-email] Falló el email a MOVARA: ${r.error}`);
    }

    return NextResponse.json({ ok: true }, { status: 201 });
  } catch (err) {
    console.error(`[leads-email] ${resumenError(err)}`);
    return NextResponse.json({ error: "Error al procesar" }, { status: 500 });
  }
}
