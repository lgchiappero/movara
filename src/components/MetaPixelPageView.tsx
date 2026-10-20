"use client";

import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";
import { trackPageView } from "@/lib/meta-pixel";

/** PageView en cada navegación del lado del cliente. El de la carga inicial
 * lo manda el script del píxel (layout.tsx), así que se mide solo cuando la
 * ruta cambia respecto de la última medida — comparar rutas y no "primer
 * render" evita un PageView doble cuando React corre el efecto dos veces
 * (StrictMode en desarrollo). */
export function MetaPixelPageView() {
  const pathname = usePathname();
  const ultimaMedida = useRef(pathname);

  useEffect(() => {
    if (ultimaMedida.current === pathname) return;
    ultimaMedida.current = pathname;
    trackPageView();
  }, [pathname]);

  return null;
}
