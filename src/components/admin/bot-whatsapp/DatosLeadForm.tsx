"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/admin/Toast";
import { ESTADOS_LEAD, ETIQUETA_ESTADO, ETIQUETA_ORIGEN, ORIGENES } from "@/lib/bot-whatsapp/constantes";
import { llamarApi } from "./api";

export type DatosLead = {
  nombre: string;
  uso: string;
  zona: string;
  terreno: string;
  personas: string;
  plazo: string;
  origen: string;
  origenDetalle: string;
  estado: string;
  notas: string;
  proximoContacto: string; // YYYY-MM-DD o ""
};

const input =
  "w-full rounded-lg border border-[#E5E5E5] bg-white px-3 py-2.5 text-base sm:text-sm text-[#1A1A1A] focus:outline-none focus:ring-2 focus:ring-[#D4B36A]";
const etiqueta = "block text-sm font-medium text-[#1A1A1A]";

/** Datos de calificación, estado, notas y próximo contacto (los dos roles). */
export default function DatosLeadForm({ id, inicial }: { id: string; inicial: DatosLead }) {
  const [d, setD] = useState(inicial);
  const [guardando, setGuardando] = useState(false);
  const toast = useToast();
  const router = useRouter();
  const set = (k: keyof DatosLead) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    setD({ ...d, [k]: e.target.value });

  async function guardar(e: React.FormEvent) {
    e.preventDefault();
    setGuardando(true);
    try {
      await llamarApi(`/api/admin/bot-whatsapp/leads/${id}`, "PATCH", {
        ...d,
        origen: d.origen || null,
        proximoContacto: d.proximoContacto || null,
      });
      toast.showSuccess("Datos guardados");
      router.refresh();
    } catch (err) {
      toast.showError((err as Error).message);
    } finally {
      setGuardando(false);
    }
  }

  const texto = (k: keyof DatosLead, nombre: string) => (
    <label className={etiqueta}>
      {nombre}
      <input className={`${input} mt-1.5`} value={d[k]} onChange={set(k)} />
    </label>
  );

  return (
    <form onSubmit={guardar} aria-label="Datos del lead" className="space-y-4 rounded-2xl border border-[#E5E5E5] bg-white p-5">
      <div className="grid gap-4 sm:grid-cols-2">
        <label className={etiqueta}>
          Estado
          <select className={`${input} mt-1.5`} value={d.estado} onChange={set("estado")}>
            {ESTADOS_LEAD.map((x) => (
              <option key={x} value={x}>
                {ETIQUETA_ESTADO[x]}
              </option>
            ))}
          </select>
        </label>
        <label className={etiqueta}>
          Próximo contacto
          <input type="date" className={`${input} mt-1.5`} value={d.proximoContacto} onChange={set("proximoContacto")} />
        </label>
        {texto("nombre", "Nombre")}
        {texto("zona", "Zona")}
        {texto("uso", "Uso")}
        {texto("terreno", "Terreno")}
        {texto("personas", "Personas")}
        {texto("plazo", "Plazo")}
        <label className={etiqueta}>
          Origen
          <select className={`${input} mt-1.5`} value={d.origen} onChange={set("origen")}>
            <option value="">Sin dato</option>
            {ORIGENES.map((o) => (
              <option key={o} value={o}>
                {ETIQUETA_ORIGEN[o]}
              </option>
            ))}
          </select>
        </label>
        {texto("origenDetalle", "Detalle del origen")}
      </div>
      <label className={etiqueta}>
        Notas internas
        <textarea className={`${input} mt-1.5`} rows={4} value={d.notas} onChange={set("notas")} />
      </label>
      <button
        type="submit"
        disabled={guardando}
        className="min-h-11 w-full rounded-xl bg-[#D4B36A] px-6 text-sm font-bold text-[#1A1A1A] hover:bg-[#c1a25a] disabled:opacity-50 sm:w-auto"
      >
        {guardando ? "Guardando…" : "Guardar datos"}
      </button>
    </form>
  );
}
