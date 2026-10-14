"use client";

import EliminarButton from "@/components/admin/EliminarButton";

/** "Eliminar" de un documento (unidades, envíos y pedidos), con la
 * confirmación dentro de la página. Solo se monta para rol admin; la ruta
 * DELETE lo vuelve a verificar. */
export default function EliminarDocumentoButton({
  url,
  nombre,
  motivoBloqueo,
}: {
  /** …/documentos/<documentoId> */
  url: string;
  nombre: string;
  /** Si viene, en vez del botón se muestra el motivo (ej. recibo confirmado). */
  motivoBloqueo?: string | null;
}) {
  return (
    <EliminarButton
      motivoBloqueo={motivoBloqueo}
      confirmTitle="¿Eliminar este documento?"
      confirmText={`Se borra "${nombre}" y su archivo. Esta acción no se puede deshacer.`}
      successMessage="Documento eliminado"
      className="text-red-600 hover:text-red-700 font-medium text-xs hover:underline flex-shrink-0"
      onEliminar={async () => {
        try {
          const res = await fetch(url, { method: "DELETE" });
          const json = await res.json().catch(() => null);
          return res.ok ? { ok: true } : { ok: false, error: json?.error ?? "No se pudo eliminar el documento." };
        } catch {
          return { ok: false, error: "No se pudo eliminar el documento. Revisá la conexión." };
        }
      }}
    />
  );
}
