"use client";

import { useRef, useState } from "react";
import type { TipoDocumento, CampoDestino } from "@/lib/validators/documentos";

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
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setError(null);
    setUploading(true);

    try {
      const form = new FormData();
      form.append("file", file);
      form.append("tipo", tipo);
      if (campo) form.append("campo", campo);

      const res = await fetch(`/api/admin/configuraciones/${pedidoId}/documentos`, {
        method: "POST",
        body: form,
      });
      const json = await res.json();
      if (!res.ok) {
        setError(json.error ?? "No pudimos subir el archivo.");
        return;
      }
      onUploaded();
    } catch {
      setError("No pudimos subir el archivo. Probá de nuevo.");
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  return (
    <div className="space-y-1.5">
      <span className="text-xs font-medium text-stone-500">{label}</span>
      <div className="flex items-center gap-3 flex-wrap">
        {currentUrl && (
          <a
            href={currentUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-[#D4B06A] font-bold hover:underline"
          >
            Ver archivo actual
          </a>
        )}
        <label className="text-xs px-3 py-1.5 border border-[#E5E5E5] rounded-lg text-stone-600 hover:bg-stone-50 cursor-pointer transition-colors">
          {uploading ? "Subiendo..." : currentUrl ? "Reemplazar" : "Subir archivo"}
          <input
            ref={inputRef}
            type="file"
            accept=".pdf,.jpg,.jpeg,.png,.xlsx"
            className="hidden"
            disabled={uploading}
            onChange={handleFileChange}
          />
        </label>
      </div>
      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  );
}
