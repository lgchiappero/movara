"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/admin/Toast";

/** Botón rojo de "Eliminar" con modal de confirmación — reutilizado en
 * clientes/envíos/unidades/pipeline/configuraciones/agenda/cobranza.
 * Solo se debe renderizar cuando el llamador ya verificó rol === "admin"
 * (esto no hace ese chequeo, la página que lo monta decide si lo muestra). */
export default function EliminarButton({
  onEliminar,
  motivoBloqueo,
  label = "Eliminar",
  confirmTitle = "¿Eliminar este registro?",
  confirmText = "Esta acción no se puede deshacer.",
  successMessage = "Eliminado correctamente",
  onSuccess,
  className,
}: {
  /** Ejecuta el DELETE — debe devolver { ok, error? } en vez de lanzar,
   * así el componente puede mostrar el error exacto que dio el servidor. */
  onEliminar: () => Promise<{ ok: boolean; error?: string }>;
  /** Si viene con texto, no se renderiza el botón — se muestra este
   * motivo en su lugar (ej. "No se puede eliminar: tiene 3 unidades
   * asociadas"). */
  motivoBloqueo?: string | null;
  label?: string;
  confirmTitle?: string;
  confirmText?: string;
  successMessage?: string;
  /** Por default hace router.refresh() tras eliminar — pasar esto para
   * redirigir a otra página en vez (ej. cuando se borra el registro que
   * la página actual está mostrando). */
  onSuccess?: () => void;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const { showSuccess, showError } = useToast();

  if (motivoBloqueo) {
    return <p className="text-xs text-stone-400">{motivoBloqueo}</p>;
  }

  async function handleConfirm() {
    setLoading(true);
    try {
      const result = await onEliminar();
      if (result.ok) {
        setOpen(false);
        showSuccess(successMessage);
        if (onSuccess) onSuccess();
        else router.refresh();
      } else {
        showError(result.error ?? "No se pudo eliminar.");
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={
          className ??
          "px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white text-xs font-bold rounded-lg transition-colors"
        }
      >
        {label}
      </button>
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-2xl p-6 max-w-sm w-full space-y-4">
            <h3 className="font-bold text-[#2F2F2F]">{confirmTitle}</h3>
            <p className="text-sm text-stone-500">{confirmText}</p>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setOpen(false)}
                disabled={loading}
                className="px-4 py-2 text-sm text-stone-600 hover:bg-stone-100 rounded-lg transition-colors"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleConfirm}
                disabled={loading}
                className="px-4 py-2 text-sm bg-red-600 hover:bg-red-700 disabled:opacity-60 text-white font-bold rounded-lg transition-colors"
              >
                {loading ? "Eliminando..." : "Eliminar"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
