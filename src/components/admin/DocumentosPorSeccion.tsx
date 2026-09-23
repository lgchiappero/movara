"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { SeccionInfo } from "@/lib/envios/constantes";

export type DocumentoSeccionConUrl = {
  id: string;
  seccion: string;
  nombre: string;
  descripcion: string | null;
  subidoPor: string;
  createdAt: string;
  signedUrl: string | null;
};

export default function DocumentosPorSeccion({
  uploadUrl,
  secciones,
  documentos,
}: {
  uploadUrl: string;
  secciones: SeccionInfo[];
  documentos: DocumentoSeccionConUrl[];
}) {
  const porSeccion = new Map<string, DocumentoSeccionConUrl[]>();
  for (const d of documentos) {
    if (!porSeccion.has(d.seccion)) porSeccion.set(d.seccion, []);
    porSeccion.get(d.seccion)!.push(d);
  }

  return (
    <div className="space-y-4">
      {secciones.map((s) => (
        <SeccionCard key={s.key} seccion={s} documentos={porSeccion.get(s.key) ?? []} uploadUrl={uploadUrl} />
      ))}
    </div>
  );
}

function SeccionCard({
  seccion,
  documentos,
  uploadUrl,
}: {
  seccion: SeccionInfo;
  documentos: DocumentoSeccionConUrl[];
  uploadUrl: string;
}) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [descripcion, setDescripcion] = useState("");
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleUpload(e: React.FormEvent) {
    e.preventDefault();
    const file = inputRef.current?.files?.[0];
    if (!file) {
      setError("Elegí un archivo primero.");
      return;
    }
    setError(null);
    setUploading(true);
    try {
      const form = new FormData();
      form.append("file", file);
      form.append("seccion", seccion.key);
      if (descripcion.trim()) form.append("descripcion", descripcion.trim());

      const res = await fetch(uploadUrl, { method: "POST", body: form });
      const json = await res.json();
      if (!res.ok) {
        setError(json.error ?? "No pudimos subir el documento.");
        return;
      }
      setDescripcion("");
      if (inputRef.current) inputRef.current.value = "";
      router.refresh();
    } catch {
      setError("No pudimos subir el documento. Probá de nuevo.");
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="bg-white rounded-2xl border border-[#E5E5E5] p-5 space-y-3">
      <div>
        <h3 className="text-sm font-bold text-[#2F2F2F]">{seccion.titulo}</h3>
        <p className="text-xs text-stone-400 mt-0.5">{seccion.guia}</p>
      </div>

      {documentos.length > 0 && (
        <div className="space-y-1.5">
          {documentos.map((d) => (
            <div
              key={d.id}
              className="flex items-center justify-between gap-3 text-sm py-1.5 border-b border-[#F5F5F5] last:border-0"
            >
              <div className="min-w-0">
                <p className="font-medium text-[#2F2F2F] truncate">{d.nombre}</p>
                <p className="text-xs text-stone-400">
                  {new Date(d.createdAt).toLocaleDateString("es-AR")} · {d.subidoPor}
                  {d.descripcion ? ` · ${d.descripcion}` : ""}
                </p>
              </div>
              {d.signedUrl ? (
                <a
                  href={d.signedUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sage-600 font-medium text-xs hover:underline flex-shrink-0"
                >
                  Ver
                </a>
              ) : (
                <span className="text-stone-300 text-xs flex-shrink-0">No disponible</span>
              )}
            </div>
          ))}
        </div>
      )}

      <form onSubmit={handleUpload} className="flex flex-col sm:flex-row gap-2 sm:items-center pt-1">
        <input
          ref={inputRef}
          type="file"
          accept=".pdf,.jpg,.jpeg,.png,.xlsx,.docx"
          className="text-xs flex-1 min-w-0"
        />
        {seccion.permiteDescripcion && (
          <input
            className="text-xs rounded-lg border border-[#E5E5E5] px-2 py-1.5 flex-1 min-w-0"
            placeholder="Descripción (opcional)"
            value={descripcion}
            onChange={(e) => setDescripcion(e.target.value)}
          />
        )}
        <button
          type="submit"
          disabled={uploading}
          className="px-3 py-1.5 bg-sage-500 hover:bg-sage-600 disabled:opacity-60 text-[#2F2F2F] font-bold text-xs rounded-lg transition-colors whitespace-nowrap"
        >
          {uploading ? "Subiendo..." : "Subir archivo"}
        </button>
      </form>
      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  );
}
