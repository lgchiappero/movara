"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/admin/Toast";
import ModalConfirmacion from "@/components/ui/ModalConfirmacion";
import { ETIQUETA_EXCLUIDO, ETIQUETAS_EXCLUIDO, type EtiquetaExcluido } from "@/lib/bot-whatsapp/constantes";
import { formatearTelefonoWhatsapp } from "@/lib/bot-whatsapp/telefono";
import { llamarApi } from "./api";
import ImportarExcluidos from "./ImportarExcluidos";

export type Excluido = { id: string; telefono: string; etiqueta: string };

const input =
  "w-full rounded-lg border border-[#E5E5E5] bg-white px-3 py-2.5 text-base sm:text-sm text-[#1A1A1A] focus:outline-none focus:ring-2 focus:ring-[#D4B36A]";

/** Contactos a los que el bot nunca responde. Agregar: todos. Borrar: solo
 * administrador (el servidor también lo exige). */
export default function ContactosExcluidos({ excluidos, esAdmin }: { excluidos: Excluido[]; esAdmin: boolean }) {
  const [telefono, setTelefono] = useState("");
  const [etiqueta, setEtiqueta] = useState<EtiquetaExcluido>("AMIGO");
  const [enviando, setEnviando] = useState(false);
  const [aBorrar, setABorrar] = useState<Excluido | null>(null);
  const toast = useToast();
  const router = useRouter();

  async function agregar(e: React.FormEvent) {
    e.preventDefault();
    setEnviando(true);
    try {
      await llamarApi("/api/admin/bot-whatsapp/excluidos", "POST", { telefono, etiqueta });
      toast.showSuccess("Contacto excluido");
      setTelefono("");
      router.refresh();
    } catch (err) {
      toast.showError((err as Error).message);
    } finally {
      setEnviando(false);
    }
  }

  async function borrar({ id }: Excluido) {
    setABorrar(null);
    try {
      await llamarApi(`/api/admin/bot-whatsapp/excluidos/${id}`, "DELETE");
      toast.showSuccess("Contacto quitado de la lista");
      router.refresh();
    } catch (err) {
      toast.showError((err as Error).message);
    }
  }

  return (
    <section aria-labelledby="titulo-excluidos" className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 id="titulo-excluidos" className="text-lg font-bold text-[#1A1A1A]">Contactos excluidos</h2>
          <p className="text-sm text-stone-500">El bot nunca les responde (amigos, familia, proveedores).</p>
        </div>
        {esAdmin && <ImportarExcluidos />}
      </div>
      <form onSubmit={agregar} aria-label="Agregar contacto excluido" className="grid gap-3 rounded-2xl border border-[#E5E5E5] bg-white p-4 sm:grid-cols-[1fr_12rem_auto]">
        <input
          type="tel"
          required
          aria-label="Teléfono a excluir"
          placeholder="Teléfono (ej. 3493 667214)"
          className={input}
          value={telefono}
          onChange={(e) => setTelefono(e.target.value)}
        />
        <select aria-label="Etiqueta" className={input} value={etiqueta} onChange={(e) => setEtiqueta(e.target.value as EtiquetaExcluido)}>
          {ETIQUETAS_EXCLUIDO.map((x) => (
            <option key={x} value={x}>
              {ETIQUETA_EXCLUIDO[x]}
            </option>
          ))}
        </select>
        <button
          type="submit"
          disabled={enviando}
          className="min-h-11 rounded-xl bg-[#1A1A1A] px-5 text-sm font-bold text-[#D4B36A] hover:bg-[#2a2a2a] disabled:opacity-50"
        >
          Agregar
        </button>
      </form>
      {excluidos.length === 0 ? (
        <p className="rounded-2xl border border-[#E5E5E5] bg-white p-6 text-center text-sm text-stone-500">No hay contactos excluidos.</p>
      ) : (
        <ul className="divide-y divide-stone-100 rounded-2xl border border-[#E5E5E5] bg-white">
          {excluidos.map((x) => (
            <li key={x.id} className="flex items-center justify-between gap-3 px-4 py-2">
              <span className="text-sm text-[#1A1A1A]">
                <span className="font-medium">{formatearTelefonoWhatsapp(x.telefono)}</span>
                <span className="ml-2 rounded-full bg-stone-100 px-2 py-0.5 text-xs text-stone-600">
                  {ETIQUETA_EXCLUIDO[x.etiqueta as EtiquetaExcluido] ?? x.etiqueta}
                </span>
              </span>
              {esAdmin && (
                <button
                  type="button"
                  onClick={() => setABorrar(x)}
                  aria-label={`Quitar ${formatearTelefonoWhatsapp(x.telefono)}`}
                  className="min-h-11 rounded-lg px-3 text-sm font-medium text-red-600 hover:bg-red-50"
                >
                  Quitar
                </button>
              )}
            </li>
          ))}
        </ul>
      )}
      {aBorrar && (
        <ModalConfirmacion
          abierto
          titulo="¿Quitar de excluidos?"
          mensaje={`El bot va a poder responderle a ${formatearTelefonoWhatsapp(aBorrar.telefono)}.`}
          confirmar="Quitar"
          cancelar="Cancelar"
          onConfirmar={() => borrar(aBorrar)}
          onCancelar={() => setABorrar(null)}
        />
      )}
    </section>
  );
}
