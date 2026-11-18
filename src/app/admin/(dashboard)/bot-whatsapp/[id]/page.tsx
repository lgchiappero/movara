import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { getAdminUser } from "@/lib/admin/current-user";
import { isAdmin } from "@/lib/admin/roles";
import { claveSoloFecha, formatearFechaHoraAR } from "@/lib/fecha-ar";
import { buscarCoincidencias } from "@/lib/bot-whatsapp/coincidencias";
import { formatearTelefonoWhatsapp } from "@/lib/bot-whatsapp/telefono";
import { getWhatsAppUrl } from "@/lib/whatsapp";
import ChatLead from "@/components/admin/bot-whatsapp/ChatLead";
import DatosLeadForm from "@/components/admin/bot-whatsapp/DatosLeadForm";
import AccionesLead from "@/components/admin/bot-whatsapp/AccionesLead";

export const dynamic = "force-dynamic";

export default async function LeadWhatsappPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const lead = await db.leadWhatsapp.findUnique({
    where: { id },
    include: { mensajes: { orderBy: { creadoEn: "asc" } } },
  });
  if (!lead) notFound();

  const [sesion, coincidencias] = await Promise.all([getAdminUser(), buscarCoincidencias(lead.telefono)]);
  const esAdmin = sesion ? isAdmin(sesion.rol) : false;
  const telefono = formatearTelefonoWhatsapp(lead.telefono);

  return (
    // pr-12 / sm:pr-16 y pb-24: dejan libre la franja del botón flotante "?"
    // de la guía rápida (AdminGuiaRapida, fixed bottom-6 right-6, 48 px),
    // para que no tape los campos de "Datos" (la columna de la derecha).
    <div className="mx-auto max-w-5xl space-y-6 pb-24 pr-12 sm:pr-16">
      <div>
        <Link href="/admin/bot-whatsapp" className="inline-flex min-h-11 items-center text-sm font-medium text-stone-500 hover:text-[#1A1A1A]">
          ← Bot de WhatsApp
        </Link>
        <p className="mb-1 text-xs font-bold uppercase tracking-widest text-[#D4B36A]">Lead de WhatsApp</p>
        <h1 className="text-2xl font-bold text-[#1A1A1A]">{lead.nombre || "Sin nombre"}</h1>
        <p className="text-sm text-stone-600">
          {telefono} · alta {formatearFechaHoraAR(lead.creadoEn)} · {lead.respuestasBot} respuestas del bot
        </p>
        <a
          href={getWhatsAppUrl(`Hola${lead.nombre ? ` ${lead.nombre.split(" ")[0]}` : ""}! Te escribimos de MOVARA.`, lead.telefono)}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-3 inline-flex min-h-11 items-center rounded-xl bg-[#D4B36A] px-5 text-sm font-bold text-[#1A1A1A] hover:bg-[#c1a25a]"
        >
          Abrir en WhatsApp
        </a>
      </div>

      {(coincidencias.leads > 0 || coincidencias.pedidos.length > 0) && (
        <div role="note" className="rounded-2xl border border-[#D4B36A]/50 bg-[#D4B36A]/10 p-4 text-sm text-[#1A1A1A]">
          <p className="font-semibold">
            Este contacto ya figura en{" "}
            {[coincidencias.leads > 0 && "Leads", coincidencias.pedidos.length > 0 && "Pedidos"].filter(Boolean).join(" y ")}.
          </p>
          <ul className="mt-2 flex flex-wrap gap-x-4 gap-y-1">
            {coincidencias.leads > 0 && (
              <li>
                <Link href={`/admin/buscar?q=${encodeURIComponent(lead.telefono.slice(-10))}`} className="underline underline-offset-2">
                  Ver en Leads ({coincidencias.leads})
                </Link>
              </li>
            )}
            {coincidencias.pedidos.map((p) => (
              <li key={p.id}>
                <Link href={`/admin/configuraciones/${p.id}`} className="underline underline-offset-2">
                  Pedido {p.numero ?? "sin número"}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}

      <AccionesLead id={lead.id} controlHumano={lead.controlHumano} esAdmin={esAdmin} />

      <div className="grid gap-6 lg:grid-cols-[1fr_24rem]">
        <section aria-labelledby="titulo-chat" className="space-y-3">
          <h2 id="titulo-chat" className="text-lg font-bold text-[#1A1A1A]">Conversación</h2>
          <ChatLead mensajes={lead.mensajes} />
        </section>
        <section aria-labelledby="titulo-datos" className="space-y-3">
          <h2 id="titulo-datos" className="text-lg font-bold text-[#1A1A1A]">Datos</h2>
          <DatosLeadForm
            id={lead.id}
            inicial={{
              nombre: lead.nombre ?? "",
              uso: lead.uso ?? "",
              zona: lead.zona ?? "",
              terreno: lead.terreno ?? "",
              personas: lead.personas ?? "",
              plazo: lead.plazo ?? "",
              origen: lead.origen ?? "",
              origenDetalle: lead.origenDetalle ?? "",
              estado: lead.estado,
              notas: lead.notas ?? "",
              proximoContacto: lead.proximoContacto ? claveSoloFecha(lead.proximoContacto) : "",
            }}
          />
        </section>
      </div>
    </div>
  );
}
