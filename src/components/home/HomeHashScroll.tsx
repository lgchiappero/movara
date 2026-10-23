"use client";

import { useEffect } from "react";
import { scrollASeccion } from "@/lib/scroll";

/** Al entrar a la home con "#seccion" (link desde otra página o URL directa)
 * baja a esa sección compensando el header fijo. El salto nativo del
 * navegador no alcanza: no descuenta bien el header y toma la posición de
 * la sección mientras el Reveal todavía la tiene desplazada. */
export default function HomeHashScroll() {
  useEffect(() => {
    const irAlHash = () => {
      const id = decodeURIComponent(window.location.hash.slice(1));
      if (id) scrollASeccion(id);
    };
    const frame = requestAnimationFrame(irAlHash);
    window.addEventListener("hashchange", irAlHash);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("hashchange", irAlHash);
    };
  }, []);

  return null;
}
