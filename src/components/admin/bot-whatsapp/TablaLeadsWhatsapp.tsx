import Link from "next/link";
import { formatearFechaHoraAR, formatearSoloFecha } from "@/lib/fecha-ar";
import { ETIQUETA_ESTADO, ETIQUETA_ORIGEN, type EstadoLead, type Origen } from "@/lib/bot-whatsapp/constantes";
import { formatearTelefonoWhatsapp } from "@/lib/bot-whatsapp/telefono";
import type { FilaLead } from "@/lib/bot-whatsapp/leads";

const estado = (e: string) => ETIQUETA_ESTADO[e as EstadoLead] ?? e;
const origen = (o: string | null) => (o ? (ETIQUETA_ORIGEN[o as Origen] ?? o) : "—");
const fecha = (d: Date | null) => (d ? formatearFechaHoraAR(d) : "—");
const dia = (d: Date | null) => (d ? formatearSoloFecha(d, "corto") : "—");

/** Leads del bot: tabla en pantallas anchas, tarjetas en el celular. */
export default function TablaLeadsWhatsapp({ leads }: { leads: FilaLead[] }) {
  if (leads.length === 0) {
    return <p className="rounded-2xl border border-[#E5E5E5] bg-white p-10 text-center text-sm text-stone-500">No hay leads con ese filtro.</p>;
  }
  return (
    <>
      <ul className="space-y-3 sm:hidden" aria-label="Leads de WhatsApp">
        {leads.map((l) => (
          <li key={l.id}>
            <Link href={`/admin/bot-whatsapp/${l.id}`} className="block rounded-2xl border border-[#E5E5E5] bg-white p-4">
              <div className="flex items-start justify-between gap-3">
                <p className="font-semibold text-[#1A1A1A]">{l.nombre || "Sin nombre"}</p>
                <span className="shrink-0 rounded-full bg-[#1A1A1A] px-2.5 py-0.5 text-xs font-semibold text-[#D4B36A]">{estado(l.estado)}</span>
              </div>
              <p className="text-sm text-stone-600">{formatearTelefonoWhatsapp(l.telefono)}</p>
              <p className="mt-1 text-xs text-stone-500">
                {[l.zona, l.uso, origen(l.origen)].filter((x) => x && x !== "—").join(" · ") || "Sin datos"}
              </p>
              <p className="mt-1 text-xs text-stone-500">
                Último mensaje: {fecha(l.ultimoMensajeEn)} · Próximo contacto: {dia(l.proximoContacto)}
              </p>
            </Link>
          </li>
        ))}
      </ul>
      <div className="hidden overflow-x-auto rounded-2xl border border-[#E5E5E5] bg-white sm:block">
        <table className="w-full text-sm">
          <thead className="bg-stone-50 text-left text-xs uppercase tracking-wider text-stone-500">
            <tr>
              {["Nombre", "Teléfono", "Zona", "Uso", "Estado", "Origen", "Último mensaje", "Próximo contacto"].map((h) => (
                <th key={h} scope="col" className="px-4 py-3 font-semibold">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-stone-100">
            {leads.map((l) => (
              <tr key={l.id} className="hover:bg-stone-50">
                <td className="px-4 py-3">
                  <Link href={`/admin/bot-whatsapp/${l.id}`} className="font-semibold text-[#1A1A1A] hover:text-[#BF9D52]">
                    {l.nombre || "Sin nombre"}
                  </Link>
                  {l.controlHumano && <span className="ml-2 text-xs text-stone-500">(equipo)</span>}
                </td>
                <td className="whitespace-nowrap px-4 py-3 text-stone-600">{formatearTelefonoWhatsapp(l.telefono)}</td>
                <td className="px-4 py-3 text-stone-600">{l.zona || "—"}</td>
                <td className="px-4 py-3 text-stone-600">{l.uso || "—"}</td>
                <td className="px-4 py-3">
                  <span className="rounded-full bg-[#1A1A1A] px-2.5 py-0.5 text-xs font-semibold text-[#D4B36A]">{estado(l.estado)}</span>
                </td>
                <td className="px-4 py-3 text-stone-600">{origen(l.origen)}</td>
                <td className="whitespace-nowrap px-4 py-3 text-stone-600">{fecha(l.ultimoMensajeEn)}</td>
                <td className="whitespace-nowrap px-4 py-3 text-stone-600">{dia(l.proximoContacto)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
