"use client";

import { useId, useRef, useState } from "react";
import { CircleCheck, CloudUpload, FileSpreadsheet, FileText, Image as ImageIcon } from "lucide-react";
import { claseDeArchivo, errorDeArchivo, formatearMB, type TiposArchivo } from "@/lib/admin/tipos-archivo";

/** Campo de subida de archivos del admin: zona para elegir o arrastrar,
 * tarjeta del archivo elegido (nombre completo, tamaño, miniatura si es
 * imagen, "Quitar"), validación de tipo y tamaño antes de subir y barra de
 * progreso. Es controlado: el formulario que lo usa guarda los archivos y
 * hace la subida (ver useSubidaArchivos). */
export default function FileUpload({
  id,
  label,
  tipos,
  archivos,
  onChange,
  multiple = false,
  progreso = null,
  mensajeExito = null,
  disabled = false,
  compacto = false,
  extra,
}: {
  id?: string;
  /** Título del campo (también es la etiqueta accesible del input). */
  label: string;
  tipos: TiposArchivo;
  archivos: File[];
  onChange: (archivos: File[]) => void;
  multiple?: boolean;
  /** 0 a 100 mientras sube; null si no está subiendo. */
  progreso?: number | null;
  /** "Archivo subido": se muestra cuando terminó y el campo quedó vacío. */
  mensajeExito?: string | null;
  disabled?: boolean;
  /** Zona más baja, para formularios con varios campos de archivo. */
  compacto?: boolean;
  /** Algo para mostrar junto al título (ej. "Ver archivo actual"). */
  extra?: React.ReactNode;
}) {
  const idAuto = useId();
  const inputId = id ?? `archivo-${idAuto}`;
  const inputRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [arrastrando, setArrastrando] = useState(false);
  const subiendo = progreso !== null;
  const bloqueado = disabled || subiendo;

  function agregar(lista: FileList | File[]) {
    const nuevos = Array.from(lista);
    if (nuevos.length === 0) return;
    const elegidos = multiple ? nuevos : nuevos.slice(0, 1);
    const errores: string[] = [];
    const validos: File[] = [];
    for (const f of elegidos) {
      const problema = errorDeArchivo(f, tipos);
      if (problema) errores.push(problema);
      else validos.push(f);
    }
    setError(errores.length ? errores.join(" ") : null);
    if (multiple) {
      const clave = (f: File) => `${f.name}|${f.size}|${f.lastModified}`;
      const ya = new Set(archivos.map(clave));
      onChange([...archivos, ...validos.filter((f) => !ya.has(clave(f)))]);
    } else {
      // Un archivo inválido no reemplaza silenciosamente al anterior: el
      // campo queda vacío y el error explica por qué.
      onChange(validos);
    }
  }

  function quitar(indice: number) {
    setError(null);
    onChange(archivos.filter((_, i) => i !== indice));
  }

  return (
    <div className="space-y-2 min-w-0">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <label htmlFor={inputId} className="text-xs font-medium text-stone-500">
          {label}
        </label>
        {extra}
      </div>

      <input
        ref={inputRef}
        id={inputId}
        type="file"
        className="sr-only"
        tabIndex={-1}
        accept={[...tipos.mimes, ...tipos.extensiones].join(",")}
        multiple={multiple}
        disabled={bloqueado}
        onChange={(e) => {
          if (e.target.files) agregar(e.target.files);
          // Permite volver a elegir el mismo archivo después de quitarlo.
          e.target.value = "";
        }}
      />

      {(multiple || archivos.length === 0) && (
        <div
          data-testid="zona-subida"
          onDragOver={(e) => {
            e.preventDefault();
            if (!bloqueado) setArrastrando(true);
          }}
          onDragLeave={() => setArrastrando(false)}
          onDrop={(e) => {
            e.preventDefault();
            setArrastrando(false);
            if (!bloqueado) agregar(e.dataTransfer.files);
          }}
          className={`rounded-xl border-2 border-dashed text-center transition-colors ${
            compacto ? "px-3 py-3" : "px-4 py-5"
          } ${arrastrando ? "border-sage-500 bg-sage-50" : error ? "border-red-300 bg-red-50/40" : "border-[#E5E5E5] bg-[#FCFCFA]"} ${
            bloqueado ? "opacity-60" : ""
          }`}
        >
          <div className={`flex items-center justify-center gap-x-3 gap-y-2 flex-wrap ${compacto ? "" : "flex-col"}`}>
            <CloudUpload aria-hidden="true" className={`text-sage-500 ${compacto ? "w-5 h-5" : "w-7 h-7"}`} />
            <button
              type="button"
              disabled={bloqueado}
              onClick={() => inputRef.current?.click()}
              className="px-4 py-2 border border-sage-500 text-sage-600 font-bold text-sm rounded-xl bg-white hover:bg-sage-50 disabled:cursor-not-allowed transition-colors"
            >
              {multiple && archivos.length > 0 ? "Agregar otro archivo" : "Seleccionar archivo"}
            </button>
            <span className="text-sm text-stone-500">o arrastralo acá</span>
          </div>
          <p className="mt-2 text-[11px] text-stone-400">
            {tipos.etiqueta} · hasta {formatearMB(tipos.maxBytes)}
          </p>
        </div>
      )}

      {archivos.length > 0 && (
        <ul className="space-y-2">
          {archivos.map((f, i) => (
            <TarjetaArchivo key={`${f.name}-${f.size}-${f.lastModified}-${i}`} archivo={f} onQuitar={() => quitar(i)} bloqueado={bloqueado} />
          ))}
        </ul>
      )}

      {subiendo && (
        <div className="space-y-1">
          <div
            role="progressbar"
            aria-label="Progreso de la subida"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={progreso}
            className="h-2 w-full rounded-full bg-stone-100 overflow-hidden"
          >
            <div className="h-full bg-sage-500 transition-[width] duration-200" style={{ width: `${progreso}%` }} />
          </div>
          <p className="text-xs text-stone-500">Subiendo… {progreso}%</p>
        </div>
      )}

      {error && (
        <p role="alert" className="text-xs text-red-600">
          {error}
        </p>
      )}

      {!subiendo && mensajeExito && archivos.length === 0 && !error && (
        <p role="status" className="flex items-center gap-1.5 text-xs font-medium text-emerald-700">
          <CircleCheck aria-hidden="true" className="w-4 h-4" />
          {mensajeExito}
        </p>
      )}
    </div>
  );
}

function TarjetaArchivo({ archivo, onQuitar, bloqueado }: { archivo: File; onQuitar: () => void; bloqueado: boolean }) {
  const clase = claseDeArchivo(archivo);
  const conMiniatura = clase === "imagen" && typeof URL.createObjectURL === "function";

  const Icono = clase === "pdf" ? FileText : clase === "imagen" ? ImageIcon : FileSpreadsheet;

  return (
    <li className="flex items-start gap-3 rounded-xl border border-[#E5E5E5] bg-white p-3">
      {conMiniatura ? (
        // eslint-disable-next-line @next/next/no-img-element -- miniatura local (blob:), no pasa por next/image
        <img
          alt=""
          // La URL local se crea al montar la imagen y se libera al quitarla.
          ref={(img) => {
            if (!img) return;
            const url = URL.createObjectURL(archivo);
            img.src = url;
            return () => URL.revokeObjectURL(url);
          }}
          className="w-10 h-10 rounded-lg object-cover flex-shrink-0 border border-[#E5E5E5]"
        />
      ) : (
        <span
          aria-hidden="true"
          data-clase={clase}
          className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${
            clase === "pdf" ? "bg-red-50 text-red-600" : clase === "imagen" ? "bg-sky-50 text-sky-600" : "bg-emerald-50 text-emerald-700"
          }`}
        >
          <Icono className="w-5 h-5" />
        </span>
      )}
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium text-[#2F2F2F] break-words [overflow-wrap:anywhere]">{archivo.name}</p>
        <p className="text-xs text-stone-400">{formatearMB(archivo.size)}</p>
      </div>
      <button
        type="button"
        onClick={onQuitar}
        disabled={bloqueado}
        aria-label={`Quitar ${archivo.name}`}
        className="text-xs font-medium text-stone-500 hover:text-red-600 disabled:opacity-50 disabled:cursor-not-allowed px-2 py-1 -mr-1 rounded-lg flex-shrink-0"
      >
        Quitar
      </button>
    </li>
  );
}
