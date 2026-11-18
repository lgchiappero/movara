"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/admin/Toast";
import ModalConfirmacion from "@/components/ui/ModalConfirmacion";
import { llamarApi } from "./api";

/** "Tomar control" / "Devolver al bot" (los dos roles) y borrar el lead
 * (solo administrador; el servidor también lo exige). */
export default function AccionesLead({
  id,
  controlHumano,
  esAdmin,
}: {
  id: string;
  controlHumano: boolean;
  esAdmin: boolean;
}) {
  const [control, setControl] = useState(controlHumano);
  const [guardando, setGuardando] = useState(false);
  const [confirmarBorrado, setConfirmarBorrado] = useState(false);
  const toast = useToast();
  const router = useRouter();

  async function alternarControl() {
    setGuardando(true);
    try {
      await llamarApi(`/api/admin/bot-whatsapp/leads/${id}`, "PATCH", { controlHumano: !control });
      setControl(!control);
      toast.showSuccess(!control ? "Tomaste el control: el bot ya no le responde." : "Devuelto al bot.");
      router.refresh();
    } catch (err) {
      toast.showError((err as Error).message);
    } finally {
      setGuardando(false);
    }
  }

  async function borrar() {
    setConfirmarBorrado(false);
    try {
      await llamarApi(`/api/admin/bot-whatsapp/leads/${id}`, "DELETE");
      toast.showSuccess("Lead borrado");
      router.push("/admin/bot-whatsapp");
    } catch (err) {
      toast.showError((err as Error).message);
    }
  }

  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
      <p className="text-sm text-stone-600 sm:w-full" aria-live="polite">
        {control ? "Lo atiende el equipo: el bot no le responde." : "Lo atiende el bot."}
      </p>
      <button
        type="button"
        disabled={guardando}
        onClick={alternarControl}
        className={`min-h-11 rounded-xl px-5 text-sm font-bold transition-colors disabled:opacity-50 ${
          control ? "border border-[#1A1A1A] text-[#1A1A1A] hover:bg-stone-100" : "bg-[#1A1A1A] text-[#D4B36A] hover:bg-[#2a2a2a]"
        }`}
      >
        {control ? "Devolver al bot" : "Tomar control"}
      </button>
      {esAdmin && (
        <button
          type="button"
          onClick={() => setConfirmarBorrado(true)}
          className="min-h-11 rounded-xl px-5 text-sm font-medium text-red-600 hover:bg-red-50"
        >
          Borrar lead
        </button>
      )}
      <ModalConfirmacion
        abierto={confirmarBorrado}
        titulo="¿Borrar este lead?"
        mensaje="Se borra con toda su conversación. No se puede deshacer."
        confirmar="Borrar"
        cancelar="Cancelar"
        onConfirmar={borrar}
        onCancelar={() => setConfirmarBorrado(false)}
      />
    </div>
  );
}
