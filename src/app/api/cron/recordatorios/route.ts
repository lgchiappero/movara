import { NextRequest, NextResponse } from "next/server";
import { createHash, timingSafeEqual } from "crypto";
import { db } from "@/lib/db";
import { buildRecordatorioEmail, type CitaEmailData } from "@/lib/email/cita-emails";
import { enviarEmail } from "@/lib/email/enviar";
import { addDiasFechaKey, hoyFechaKey, fechaKeyToDate } from "@/lib/agenda/fecha";

/** Compara en tiempo constante (los hashes igualan el largo). */
function igualSeguro(a: string, b: string): boolean {
  const ha = createHash("sha256").update(a).digest();
  const hb = createHash("sha256").update(b).digest();
  return timingSafeEqual(ha, hb);
}

// Vercel Cron llama este endpoint por GET (ver vercel.json) y, si la variable
// CRON_SECRET existe en el proyecto, agrega automáticamente
// `Authorization: Bearer <CRON_SECRET>`. Sin CRON_SECRET configurado se
// rechaza todo: el endpoint nunca queda abierto.
export async function GET(req: NextRequest) {
  const cronSecret = process.env.CRON_SECRET;
  const auth = req.headers.get("authorization") ?? "";
  if (!cronSecret || !igualSeguro(auth, `Bearer ${cronSecret}`)) {
    if (!cronSecret) console.error("[cron/recordatorios] CRON_SECRET no configurado — pedido rechazado");
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const mananaKey = addDiasFechaKey(hoyFechaKey(), 1);
  const fecha = fechaKeyToDate(mananaKey);

  const citas = await db.cita.findMany({
    where: { fecha, estado: "confirmada", recordatorioEnviado: false },
  });

  if (!process.env.RESEND_API_KEY) {
    console.warn("[cron/recordatorios] RESEND_API_KEY no configurado — no se envió ningún recordatorio");
    return NextResponse.json({ ok: true, total: citas.length, enviados: 0, fallidos: citas.length, motivo: "sin RESEND_API_KEY" });
  }

  let enviados = 0;
  let fallidos = 0;
  for (const cita of citas) {
    const data: CitaEmailData = {
      id: cita.id,
      fecha: cita.fecha,
      horario: cita.horario,
      nombre: cita.nombre,
      email: cita.email,
      telefono: cita.telefono,
      tipoCliente: cita.tipoCliente,
      razonSocial: cita.razonSocial,
      consulta: cita.consulta,
    };
    const { subject, html } = buildRecordatorioEmail(data);
    const resultado = await enviarEmail({ to: cita.email, replyTo: "contacto@movara.com.ar", subject, html });
    if (!resultado.ok) {
      // No se marca recordatorioEnviado: la cita queda pendiente y se ve en el log.
      console.error(`[cron/recordatorios] cita=${cita.id} recordatorio no enviado: ${resultado.error}`);
      fallidos++;
      continue;
    }
    await db.cita.update({ where: { id: cita.id }, data: { recordatorioEnviado: true } });
    enviados++;
  }

  return NextResponse.json({ ok: true, total: citas.length, enviados, fallidos });
}
