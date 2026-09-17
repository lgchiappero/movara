import { NextRequest, NextResponse } from "next/server";
import { Resend } from "resend";
import { db } from "@/lib/db";
import { citaSchema } from "@/lib/validators/cita";
import { fechaKeyToDate, hoyFechaKey, dateToFechaKey } from "@/lib/agenda/fecha";
import { checkRateLimit, getClientIP } from "@/lib/rate-limit";
import {
  buildConfirmacionClienteEmail,
  buildNuevaVisitaAdminEmail,
  buildReagendacionAdminEmail,
  type CitaEmailData,
} from "@/lib/email/cita-emails";

function getResend() {
  const apiKey = process.env.RESEND_API_KEY;
  const fromEmail = process.env.RESEND_FROM_EMAIL ?? "MOVARA <onboarding@resend.dev>";
  if (!apiKey) return null;
  return { resend: new Resend(apiKey), fromEmail };
}

async function enviarEmails(cita: CitaEmailData) {
  const setup = getResend();
  if (!setup) return;
  const { resend, fromEmail } = setup;
  const contactEmail = process.env.CONTACT_EMAIL;

  const cliente = buildConfirmacionClienteEmail(cita);
  try {
    await resend.emails.send({ from: fromEmail, to: cita.email, subject: cliente.subject, html: cliente.html });
  } catch (err) {
    console.error("[agenda/citas] Error enviando confirmación al cliente:", err);
  }

  if (contactEmail) {
    const admin = buildNuevaVisitaAdminEmail(cita);
    try {
      await resend.emails.send({ from: fromEmail, to: contactEmail, subject: admin.subject, html: admin.html });
    } catch (err) {
      console.error("[agenda/citas] Error enviando notificación al admin:", err);
    }
  }
}

async function enviarEmailsReagendacion(
  cita: CitaEmailData,
  citaAnterior: { fecha: Date; horario: string }
) {
  const setup = getResend();
  if (!setup) return;
  const { resend, fromEmail } = setup;
  const contactEmail = process.env.CONTACT_EMAIL;

  const cliente = buildConfirmacionClienteEmail(cita);
  try {
    await resend.emails.send({ from: fromEmail, to: cita.email, subject: cliente.subject, html: cliente.html });
  } catch (err) {
    console.error("[agenda/citas] Error enviando confirmación de reagendación al cliente:", err);
  }

  if (contactEmail) {
    const admin = buildReagendacionAdminEmail({
      nombre: cita.nombre,
      email: cita.email,
      telefono: cita.telefono,
      fechaAnterior: citaAnterior.fecha,
      horarioAnterior: citaAnterior.horario,
      fechaNueva: cita.fecha,
      horarioNueva: cita.horario,
    });
    try {
      await resend.emails.send({ from: fromEmail, to: contactEmail, subject: admin.subject, html: admin.html });
    } catch (err) {
      console.error("[agenda/citas] Error enviando aviso de reagendación al admin:", err);
    }
  }
}

export async function POST(req: NextRequest) {
  const ip = getClientIP(req);
  const { allowed } = checkRateLimit(ip);
  if (!allowed) {
    return NextResponse.json({ error: "Demasiadas solicitudes" }, { status: 429 });
  }

  const body = await req.json().catch(() => null);
  const reemplazarCitaId =
    body && typeof body === "object" && typeof (body as Record<string, unknown>).reemplazarCitaId === "string"
      ? ((body as Record<string, unknown>).reemplazarCitaId as string)
      : null;

  const parsed = citaSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Datos inválidos", details: parsed.error.issues },
      { status: 400 }
    );
  }
  const data = parsed.data;
  const fecha = fechaKeyToDate(data.fecha);

  // Si el cliente ya tiene una visita confirmada a futuro con este email,
  // no se agenda de una — se avisa y se le da a elegir. `reemplazarCitaId`
  // es la confirmación explícita de "sí, cancelá la anterior".
  if (!reemplazarCitaId) {
    const citaFuturaExistente = await db.cita.findFirst({
      where: { email: data.email, estado: "confirmada", fecha: { gt: fechaKeyToDate(hoyFechaKey()) } },
      orderBy: { fecha: "asc" },
    });
    if (citaFuturaExistente) {
      return NextResponse.json(
        {
          error: "Ya tenés una visita agendada",
          code: "cita-duplicada",
          citaExistente: {
            id: citaFuturaExistente.id,
            fecha: dateToFechaKey(citaFuturaExistente.fecha),
            horario: citaFuturaExistente.horario,
          },
        },
        { status: 409 }
      );
    }
  }

  try {
    // Re-verificada server-side: si ya no coincide (otra sesión la canceló,
    // etc.) simplemente no se cancela nada y se agenda como una reserva
    // normal — no es motivo para hacer fallar el pedido del cliente.
    const citaAnterior = reemplazarCitaId
      ? await db.cita.findFirst({ where: { id: reemplazarCitaId, email: data.email, estado: "confirmada" } })
      : null;

    const cita = await db.$transaction(async (tx) => {
      const disponibilidad = await tx.disponibilidadAgenda.findUnique({ where: { fecha } });
      if (!disponibilidad || !disponibilidad.habilitada || !disponibilidad.horarios.includes(data.horario)) {
        throw new Error("horario-no-disponible");
      }

      const ocupado = await tx.cita.findFirst({
        where: { fecha, horario: data.horario, estado: { not: "cancelada" } },
      });
      if (ocupado) {
        throw new Error("horario-ya-reservado");
      }

      if (citaAnterior) {
        await tx.cita.update({
          where: { id: citaAnterior.id },
          data: {
            estado: "cancelada",
            canceladaPor: "cliente",
            motivoCancelacion: "Reagendado por el cliente",
          },
        });
      }

      return tx.cita.create({
        data: {
          fecha,
          horario: data.horario,
          tipoCliente: data.tipoCliente,
          nombre: data.nombre,
          email: data.email,
          telefono: data.telefono,
          razonSocial: data.razonSocial || null,
          consulta: data.consulta ?? "",
        },
      });
    });

    try {
      const leadExistente = await db.lead.findFirst({ where: { email: data.email } });
      if (!leadExistente) {
        const fechaEs = fecha.toLocaleDateString("es-AR", {
          timeZone: "UTC",
          day: "numeric",
          month: "long",
          year: "numeric",
        });
        await db.lead.create({
          data: {
            nombre: data.nombre,
            telefono: data.telefono,
            email: data.email,
            mensaje: `Agendó visita al showroom para ${fechaEs} a las ${data.horario}hs`,
          },
        });
      }
    } catch (err) {
      console.error("[agenda/citas] Error guardando lead:", err);
    }

    const emailData: CitaEmailData = {
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

    if (citaAnterior) {
      await enviarEmailsReagendacion(emailData, {
        fecha: citaAnterior.fecha,
        horario: citaAnterior.horario,
      });
    } else {
      await enviarEmails(emailData);
    }

    return NextResponse.json({ ok: true, id: cita.id }, { status: 201 });
  } catch (err) {
    if (err instanceof Error && (err.message === "horario-no-disponible" || err.message === "horario-ya-reservado")) {
      return NextResponse.json(
        { error: "Ese horario ya no está disponible — elegí otro." },
        { status: 409 }
      );
    }
    console.error("[agenda/citas]", err);
    return NextResponse.json({ error: "Error al agendar la visita" }, { status: 500 });
  }
}
