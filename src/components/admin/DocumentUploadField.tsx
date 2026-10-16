"use client";

import { useState } from "react";
import type { TipoDocumento, CampoDestino } from "@/lib/validators/documentos";
import { enviarFormularioConArchivos, mensajeDeError } from "@/lib/admin/subida-cliente";
import { TIPOS_PEDIDOS } from "@/lib/admin/tipos-archivo";
import FileUpload from "@/components/admin/ui/FileUpload";
import { useSubidaArchivos } from "@/components/admin/ui/useSubidaArchivos";

export default function DocumentUploadField({
  pedidoId,
  tipo,
  campo,
  label,
  currentUrl,
  onUploaded,
}: {
  pedidoId: string;
  tipo: TipoDocumento;
  campo?: CampoDestino;
  label: string;
  /** URL firmada vigente del archivo ya subido, si existe — la genera el
   * server component padre en cada render (force-dynamic), no este widget. */
  currentUrl: string | null;
  onUploaded: () => void;
}) {
  const archivo = useSubidaArchivos();
  const [error, setError] = useState<string | null>(null);

  async function subir() {
    const file = archivo.archivos[0];
    if (!file) return;
    setError(null);
    archivo.empezar();
    let ok = false;
    try {
      const form = new FormData();
      form.append("tipo", tipo);
      if (campo) form.append("campo", campo);
      const res = await enviarFormularioConArchivos({
        url: `/api/admin/configuraciones/${pedidoId}/documentos`,
        form,
        archivos: [{ campo: "file", file }],
        destino: "pedidos",
        entidadId: pedidoId,
        alProgresar: archivo.alProgresar,
      });
      if (!res.ok) {
        setError(res.json.error ?? "No pudimos subir el archivo.");
        return;
      }
      ok = true;
      onUploaded();
    } catch (err) {
      setError(mensajeDeError(err, "No pudimos subir el archivo. Probá de nuevo."));
    } finally {
      archivo.terminar(ok);
    }
  }

  return (
    <div className="space-y-2">
      <FileUpload
        label={label}
        tipos={TIPOS_PEDIDOS}
        compacto
        {...archivo.campo}
        extra={
          currentUrl ? (
            <a
              href={currentUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-sage-600 font-bold hover:underline"
            >
              Ver archivo actual
            </a>
          ) : null
        }
      />
      {archivo.archivos.length > 0 && (
        <button
          type="button"
          onClick={subir}
          disabled={archivo.subiendo}
          className="w-full px-4 py-2 bg-sage-500 hover:bg-sage-600 disabled:opacity-60 text-[#2F2F2F] font-bold text-sm rounded-lg transition-colors"
        >
          {archivo.subiendo ? "Subiendo…" : currentUrl ? "Reemplazar archivo" : "Subir archivo"}
        </button>
      )}
      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  );
}
