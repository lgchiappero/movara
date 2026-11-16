"use client";

import { useCallback, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { paginaPadre } from "@/lib/navegacion/pagina-padre";
import { hayHistorialInterno } from "@/lib/navegacion/historial";
import { useSalidaProtegida } from "@/lib/navegacion/salida-protegida";
import ModalConfirmacion from "@/components/ui/ModalConfirmacion";

/** "Volver" del header, igual en todas las páginas menos la home.
 * - Si se llegó navegando dentro del sitio: router.back().
 * - Si se entró directo (WhatsApp, email, Google): a la página padre lógica
 *   (tabla en src/lib/navegacion/pagina-padre.ts), reemplazando la entrada
 *   para que un segundo "Volver" no rebote a la página de la que se salió.
 * - Si la página marcó datos sin enviar (configurador), confirma antes. */
export default function BotonVolver() {
  const pathname = usePathname();
  const router = useRouter();
  const aviso = useSalidaProtegida();
  const [confirmando, setConfirmando] = useState(false);

  const volver = useCallback(() => {
    setConfirmando(false);
    if (hayHistorialInterno()) router.back();
    else router.replace(paginaPadre(pathname));
  }, [pathname, router]);

  const cancelar = useCallback(() => setConfirmando(false), []);

  return (
    <>
      <button
        type="button"
        data-boton-volver
        aria-label="Volver"
        onClick={() => (aviso ? setConfirmando(true) : volver())}
        className="inline-flex items-center justify-center gap-1 min-h-11 min-w-11 -ml-2 sm:ml-0 sm:pl-2 sm:pr-3 rounded-xl text-sm font-medium text-[#2F2F2F] hover:bg-stone-100 transition-colors shrink-0"
      >
        <svg aria-hidden="true" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
        </svg>
        <span className="hidden sm:inline">Volver</span>
      </button>
      <ModalConfirmacion
        abierto={confirmando}
        titulo="¿Salir sin enviar?"
        mensaje={aviso ?? ""}
        confirmar="Salir"
        cancelar="Seguir acá"
        onConfirmar={volver}
        onCancelar={cancelar}
      />
    </>
  );
}
