import { NextRequest, NextResponse } from "next/server";
import { Resend } from "resend";
import { db } from "@/lib/db";
import { buildRecordatorioEmail, type CitaEmailData } from "@/lib/email/cita-emails";
import { addDiasFechaKey, hoyFechaKey, fechaKeyToDate } from "@/lib/agenda/fecha";

// Vercel Cron llama este endpoint por GET y, si CRON_SECRET está seteado en
// el proyecto, agrega automáticamente `Authorization: Bearer <CRON_SECRET>`
// — ver vercel.json. Sin CRON_SECRET configurado no se exige auth (permite
// probar el endpoint a mano en dev).
export async function GET(req: NextRequest) {
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret) {
    const auth = req.headers.get("authorization");
    if (auth !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }
  }

  const mananaKey = addDiasFechaKey(hoyFechaKey(), 1);
  const fecha = fechaKeyToDate(mananaKey);

  const citas = await db.cita.findMany({
    where: { fecha, estado: "confirmada", recordatorioEnviado: false },
  });

  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.warn("[cron/recordatorios] RESEND_API_KEY no configurado — no se envió ningún recordatorio");
    return NextResponse.json({ ok: true, total: citas.length, enviados: 0, motivo: "sin RESEND_API_KEY" });
  }

  const fromEmail = process.env.RESEND_FROM_EMAIL ?? "MOVARA <onboarding@resend.dev>";
  const resend = new Resend(apiKey);

  let enviados = 0;
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
    try {
      await resend.emails.send({ from: fromEmail, to: cita.email, replyTo: "lucianogchiappero@gmail.com", subject, html });
    } catch (err) {
      console.error("[cron/recordatorios] Error enviando a", cita.email, err);
      continue; // no marca recordatorioEnviado si el envío falló
    }
    await db.cita.update({ where: { id: cita.id }, data: { recordatorioEnviado: true } });
    enviados++;
  }

  return NextResponse.json({ ok: true, total: citas.length, enviados });
}
