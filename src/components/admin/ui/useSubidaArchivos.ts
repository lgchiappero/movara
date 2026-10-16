"use client";

import { useState } from "react";

/** Estado de un <FileUpload>: archivos elegidos, progreso y aviso de
 * "Archivo subido". El formulario llama a empezar() antes de subir, pasa
 * alProgresar a enviarFormularioConArchivos y termina con terminar(ok). */
export function useSubidaArchivos() {
  const [archivos, setArchivos] = useState<File[]>([]);
  const [progreso, setProgreso] = useState<number | null>(null);
  const [exito, setExito] = useState<string | null>(null);

  return {
    archivos,
    subiendo: progreso !== null,
    /** Props para <FileUpload {...campo} />. */
    campo: {
      archivos,
      onChange: (nuevos: File[]) => {
        setArchivos(nuevos);
        setExito(null);
      },
      progreso,
      mensajeExito: exito,
    },
    empezar: () => {
      setExito(null);
      setProgreso(0);
    },
    alProgresar: (porcentaje: number) => setProgreso(porcentaje),
    /** Si salió bien, el campo vuelve a cero y muestra el aviso. */
    terminar: (ok: boolean, mensaje = "Archivo subido") => {
      setProgreso(null);
      if (ok) {
        setArchivos([]);
        setExito(mensaje);
      }
    },
  };
}
