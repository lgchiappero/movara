"use client";

import { useCallback, useRef } from "react";
import { CAMPO_TRAMPA } from "@/lib/seguridad/campo-trampa";

/** Campo trampa (honeypot) de los formularios públicos. Las personas no lo
 * ven ni llegan con el teclado; los bots que completan todos los campos lo
 * llenan, y el servidor descarta ese envío (src/lib/seguridad/publico.ts).
 * No es display:none (algunos bots lo saltean): queda fuera de la pantalla. */
export default function CampoTrampa({ inputRef }: { inputRef: React.RefObject<HTMLInputElement | null> }) {
  return (
    <div aria-hidden="true" style={{ position: "absolute", left: "-10000px", top: "auto", width: 1, height: 1, overflow: "hidden" }}>
      <label>
        Empresa web
        <input ref={inputRef} type="text" name={CAMPO_TRAMPA} tabIndex={-1} autoComplete="off" defaultValue="" />
      </label>
    </div>
  );
}

/** Ref para <CampoTrampa> y el par { empresa_web: valor } para sumar al
 * JSON que se manda. */
export function useCampoTrampa() {
  const ref = useRef<HTMLInputElement>(null);
  const valor = useCallback(() => ({ [CAMPO_TRAMPA]: ref.current?.value ?? "" }), []);
  return { ref, valor };
}
