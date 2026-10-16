"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { enviarFormularioConArchivos, mensajeDeError } from "@/lib/admin/subida-cliente";
import { TIPOS_PEDIDOS } from "@/lib/admin/tipos-archivo";
import FileUpload from "@/components/admin/ui/FileUpload";
import { useSubidaArchivos } from "@/components/admin/ui/useSubidaArchivos";
import EliminarDocumentoButton from "@/components/admin/EliminarDocumentoButton";
import { tipoDocumentoOptions, tipoDocumentoLabels, type TipoDocumento } from "@/lib/validators/documentos";

const inputClass =
  "w-full rounded-lg border border-[#E5E5E5] px-3 py-2 text-sm text-[#1a1a1a] bg-white focus:outline-none focus:ring-2 focus:ring-sage-500";

export type DocumentoConUrl = {
  id: string;
  tipo: string;
  nombre: string;
  notas: string | null;
  subidoPor: string;
  createdAt: string;
  signedUrl: string | null;
};

export default function DocumentosPedidoSection({
  pedidoId,
  documentos,
  puedeEliminar = false,
}: {
  pedidoId: string;
  documentos: DocumentoConUrl[];
  /** Solo rol admin: muestra "Eliminar" en cada documento. */
  puedeEliminar?: boolean;
}) {
  const router = useRouter();
  const archivo = useSubidaArchivos();
  const [tipo, setTipo] = useState<TipoDocumento>("otro");
  const [nombre, setNombre] = useState("");
  const [notas, setNotas] = useState("");
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
      form.append("tipo", tipo);
      if (nombre.trim()) form.append("nombre", nombre.trim());
      if (notas.trim()) form.append("notas", notas.trim());
      const res = await enviarFormularioConArchivos({
        url: `/api/admin/configuraciones/${pedidoId}/documentos`,
        form,
        archivos: [{ campo: "file", file }],
        destino: "pedidos",
        entidadId: pedidoId,
        alProgresar: archivo.alProgresar,
      });
      if (!res.ok) {
        setError(res.json.error ?? "No pudimos subir el documento.");
        return;
      }
      ok = true;
      setNombre("");
      setNotas("");
      router.refresh();
    } catch (err) {
      setError(mensajeDeError(err, "No pudimos subir el documento. Probá de nuevo."));
    } finally {
      archivo.terminar(ok);
    }
  }

  return (
    <div className="bg-white rounded-2xl border border-[#E5E5E5] p-5 space-y-4">
      <h2 className="text-sm font-bold uppercase tracking-widest text-sage-600">
        Documentos del pedido
      </h2>

      {documentos.length === 0 ? (
        <p className="text-sm text-stone-400">Todavía no se subió ningún documento.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[#F0F0F0] text-left text-stone-400 text-xs uppercase tracking-wide">
                <th className="py-2 pr-3 font-medium">Nombre</th>
                <th className="py-2 pr-3 font-medium">Tipo</th>
                <th className="py-2 pr-3 font-medium">Fecha</th>
                <th className="py-2 pr-3 font-medium">Subido por</th>
                <th className="py-2 pr-3 font-medium"></th>
                {puedeEliminar && <th className="py-2 pr-3 font-medium"></th>}
              </tr>
            </thead>
            <tbody>
              {documentos.map((d) => (
                <tr key={d.id} className="border-b border-[#F5F5F5] last:border-0">
                  <td className="py-2 pr-3 text-[#2F2F2F] font-medium">{d.nombre}</td>
                  <td className="py-2 pr-3 text-stone-600">
                    {tipoDocumentoLabels[d.tipo as TipoDocumento] ?? d.tipo}
                  </td>
                  <td className="py-2 pr-3 text-stone-500">
                    {new Date(d.createdAt).toLocaleDateString("es-AR")}
                  </td>
                  <td className="py-2 pr-3 text-stone-500">{d.subidoPor}</td>
                  <td className="py-2 pr-3">
                    {d.signedUrl ? (
                      <a
                        href={d.signedUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sage-600 font-medium hover:underline"
                      >
                        Ver / descargar
                      </a>
                    ) : (
                      <span className="text-stone-300">No disponible</span>
                    )}
                  </td>
                  {puedeEliminar && (
                    <td className="py-2 pr-3">
                      <EliminarDocumentoButton url={`/api/admin/configuraciones/${pedidoId}/documentos/${d.id}`} nombre={d.nombre} />
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <form onSubmit={handleUpload} className="border-t border-[#F0F0F0] pt-4 space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <label className="block space-y-1.5">
            <span className="text-xs font-medium text-stone-500">Tipo</span>
            <select
              className={inputClass}
              value={tipo}
              onChange={(e) => setTipo(e.target.value as TipoDocumento)}
            >
              {tipoDocumentoOptions.map((t) => (
                <option key={t} value={t}>
                  {tipoDocumentoLabels[t]}
                </option>
              ))}
            </select>
          </label>
          <label className="block space-y-1.5">
            <span className="text-xs font-medium text-stone-500">Nombre (opcional)</span>
            <input
              className={inputClass}
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              placeholder="Ej: Factura proforma #1234"
            />
          </label>
        </div>
        <label className="block space-y-1.5">
          <span className="text-xs font-medium text-stone-500">Notas (opcional)</span>
          <input className={inputClass} value={notas} onChange={(e) => setNotas(e.target.value)} />
        </label>
        <FileUpload label="Archivo" tipos={TIPOS_PEDIDOS} {...archivo.campo} />
        <button
          type="submit"
          disabled={archivo.subiendo || archivo.archivos.length === 0}
          className="w-full sm:w-auto px-4 py-2 bg-sage-500 hover:bg-sage-600 disabled:opacity-60 text-[#2F2F2F] font-bold text-sm rounded-xl transition-colors"
        >
          {archivo.subiendo ? "Subiendo…" : "Subir documento"}
        </button>
        {error && <p className="text-xs text-red-600">{error}</p>}
      </form>
    </div>
  );
}
