"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/admin/Toast";
import { ETIQUETA_ORIGEN, ORIGENES } from "@/lib/bot-whatsapp/constantes";
import { llamarApi } from "./api";

const input =
  "w-full rounded-lg border border-[#E5E5E5] bg-white px-3 py-2.5 text-base sm:text-sm text-[#1A1A1A] focus:outline-none focus:ring-2 focus:ring-[#D4B36A]";
const VACIO = { telefono: "", nombre: "", zona: "", uso: "", origen: "", origenDetalle: "", notas: "" };

/** Alta manual de un lead (consultas que entraron por otro lado). */
export default function NuevoLeadWhatsapp() {
  const [abierto, setAbierto] = useState(false);
  const [f, setF] = useState(VACIO);
  const [enviando, setEnviando] = useState(false);
  const [existente, setExistente] = useState<string | null>(null);
  const toast = useToast();
  const router = useRouter();

  async function guardar(e: React.FormEvent) {
    e.preventDefault();
    setEnviando(true);
    setExistente(null);
    try {
      const { id } = await llamarApi<{ id: string }>("/api/admin/bot-whatsapp/leads", "POST", {
        ...f,
        origen: f.origen || null,
      });
      toast.showSuccess("Lead agregado");
      setF(VACIO);
      setAbierto(false);
      router.push(`/admin/bot-whatsapp/${id}`);
    } catch (err) {
      const e2 = err as Error & { status?: number; datos?: { id?: string | null } };
      if (e2.status === 409 && e2.datos?.id) setExistente(e2.datos.id);
      toast.showError(e2.message);
    } finally {
      setEnviando(false);
    }
  }

  if (!abierto) {
    return (
      <button
        type="button"
        onClick={() => setAbierto(true)}
        className="min-h-11 rounded-xl bg-[#1A1A1A] px-5 text-sm font-bold text-[#D4B36A] transition-colors hover:bg-[#2a2a2a]"
      >
        + Agregar lead manual
      </button>
    );
  }

  const campo = (k: keyof typeof VACIO, etiqueta: string, extra: React.InputHTMLAttributes<HTMLInputElement> = {}) => (
    <label className="block text-sm font-medium text-[#1A1A1A]">
      {etiqueta}
      <input className={`${input} mt-1.5`} value={f[k]} onChange={(e) => setF({ ...f, [k]: e.target.value })} {...extra} />
    </label>
  );

  return (
    <form onSubmit={guardar} aria-label="Agregar lead manual" className="w-full space-y-4 rounded-2xl border border-[#D4B36A]/40 bg-white p-5">
      <div className="grid gap-4 sm:grid-cols-2">
        {campo("telefono", "Teléfono *", { type: "tel", required: true, placeholder: "3493 667214" })}
        {campo("nombre", "Nombre")}
        {campo("zona", "Zona")}
        {campo("uso", "Uso")}
        <label className="block text-sm font-medium text-[#1A1A1A]">
          Origen
          <select className={`${input} mt-1.5`} value={f.origen} onChange={(e) => setF({ ...f, origen: e.target.value })}>
            <option value="">Sin dato</option>
            {ORIGENES.map((o) => (
              <option key={o} value={o}>
                {ETIQUETA_ORIGEN[o]}
              </option>
            ))}
          </select>
        </label>
        {campo("origenDetalle", "Detalle del origen (ej. quién lo recomendó)")}
      </div>
      <label className="block text-sm font-medium text-[#1A1A1A]">
        Notas
        <textarea className={`${input} mt-1.5`} rows={3} value={f.notas} onChange={(e) => setF({ ...f, notas: e.target.value })} />
      </label>
      {existente && (
        <p role="alert" className="text-sm text-amber-800">
          Ese teléfono ya tiene un lead.{" "}
          <Link href={`/admin/bot-whatsapp/${existente}`} className="font-semibold underline">
            Abrirlo
          </Link>
        </p>
      )}
      <div className="flex flex-col-reverse gap-3 sm:flex-row">
        <button type="button" onClick={() => setAbierto(false)} className="min-h-11 rounded-xl border border-stone-300 px-5 text-sm font-medium text-stone-600">
          Cancelar
        </button>
        <button
          type="submit"
          disabled={enviando}
          className="min-h-11 rounded-xl bg-[#D4B36A] px-5 text-sm font-bold text-[#1A1A1A] hover:bg-[#c1a25a] disabled:opacity-50"
        >
          {enviando ? "Guardando…" : "Guardar lead"}
        </button>
      </div>
    </form>
  );
}
