"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { enviarFormularioConArchivos, mensajeDeError } from "@/lib/admin/subida-cliente";
import { TIPOS_MOVARA } from "@/lib/admin/tipos-archivo";
import FileUpload from "@/components/admin/ui/FileUpload";
import { useSubidaArchivos } from "@/components/admin/ui/useSubidaArchivos";
import type { SeccionInfo } from "@/lib/envios/constantes";
import EliminarDocumentoButton from "@/components/admin/EliminarDocumentoButton";

export type DocumentoSeccionConUrl = {
  id: string;
  seccion: string;
  nombre: string;
  descripcion: string | null;
  subidoPor: string;
  createdAt: string;
  signedUrl: string | null;
  /** Motivo por el que no se puede eliminar (ej. Recibo en Conformidad confirmado). */
  noEliminable?: string | null;
};

export default function DocumentosPorSeccion({
  uploadUrl,
  subida,
  secciones,
  documentos,
  puedeEliminar = false,
}: {
  uploadUrl: string;
  /** Destino de la subida directa a Storage (archivos de más de 4,5 MB). */
  subida: { destino: "envios" | "unidades"; entidadId: string };
  secciones: SeccionInfo[];
  documentos: DocumentoSeccionConUrl[];
  /** Solo rol admin: muestra "Eliminar" en cada documento. */
  puedeEliminar?: boolean;
}) {
  const porSeccion = new Map<string, DocumentoSeccionConUrl[]>();
  for (const d of documentos) {
    if (!porSeccion.has(d.seccion)) porSeccion.set(d.seccion, []);
    porSeccion.get(d.seccion)!.push(d);
  }

  return (
    <div className="space-y-4">
      {secciones.map((s) => (
        <SeccionCard key={s.key} seccion={s} documentos={porSeccion.get(s.key) ?? []} uploadUrl={uploadUrl} subida={subida} puedeEliminar={puedeEliminar} />
      ))}
    </div>
  );
}

function SeccionCard({
  seccion,
  documentos,
  uploadUrl,
  subida,
  puedeEliminar,
}: {
  seccion: SeccionInfo;
  documentos: DocumentoSeccionConUrl[];
  uploadUrl: string;
  subida: { destino: "envios" | "unidades"; entidadId: string };
  puedeEliminar: boolean;
}) {
  const router = useRouter();
  const archivo = useSubidaArchivos();
  const [descripcion, setDescripcion] = useState("");
  const [error, setError] = useState<string | null>(null);

  async function handleUpload(e: React.FormEvent) {
    e.preventDefault();
    const file = archivo.archivos[0];
    if (!file) {
      setError("Elegí un archivo primero.");
      return;
    }
    setError(null);
    archivo.empezar();
    let ok = false;
    try {
      const form = new FormData();
      form.append("seccion", seccion.key);
      if (descripcion.trim()) form.append("descripcion", descripcion.trim());
      const res = await enviarFormularioConArchivos({
        url: uploadUrl,
        form,
        archivos: [{ campo: "file", file }],
        destino: subida.destino,
        entidadId: subida.entidadId,
        alProgresar: archivo.alProgresar,
      });
      if (!res.ok) {
        setError(res.json.error ?? "No pudimos subir el documento.");
        return;
      }
      ok = true;
      setDescripcion("");
      router.refresh();
    } catch (err) {
      setError(mensajeDeError(err, "No pudimos subir el documento. Probá de nuevo."));
    } finally {
      archivo.terminar(ok);
    }
  }

  return (
    <div id={`seccion-${seccion.key}`} className="bg-white rounded-2xl border border-[#E5E5E5] p-5 space-y-3">
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
                <p className="font-medium text-[#2F2F2F] break-words [overflow-wrap:anywhere]">{d.nombre}</p>
                <p className="text-xs text-stone-400">
                  {new Date(d.createdAt).toLocaleDateString("es-AR")} · {d.subidoPor}
                  {d.descripcion ? ` · ${d.descripcion}` : ""}
                </p>
              </div>
              <div className="flex items-center gap-3 flex-shrink-0">
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
                {puedeEliminar && (
                  <EliminarDocumentoButton url={`${uploadUrl}/${d.id}`} nombre={d.nombre} motivoBloqueo={d.noEliminable} />
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      <form onSubmit={handleUpload} className="space-y-2 pt-1">
        <FileUpload label="Agregar documento" tipos={TIPOS_MOVARA} compacto {...archivo.campo} />
        {archivo.archivos.length > 0 && (
          <div className="flex flex-col sm:flex-row gap-2 sm:items-center">
            {seccion.permiteDescripcion && (
              <input
                className="text-sm rounded-lg border border-[#E5E5E5] px-3 py-2 flex-1 min-w-0"
                placeholder="Descripción (opcional)"
                aria-label="Descripción (opcional)"
                value={descripcion}
                disabled={archivo.subiendo}
                onChange={(e) => setDescripcion(e.target.value)}
              />
            )}
            <button
              type="submit"
              disabled={archivo.subiendo}
              className="px-4 py-2 bg-sage-500 hover:bg-sage-600 disabled:opacity-60 text-[#2F2F2F] font-bold text-sm rounded-lg transition-colors whitespace-nowrap"
            >
              {archivo.subiendo ? "Subiendo…" : "Subir archivo"}
            </button>
          </div>
        )}
      </form>
      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  );
}
