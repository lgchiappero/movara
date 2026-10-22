"use client";

import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";
import { configurarEntornoPixel, esLinkWhatsApp, trackContact, trackPageView } from "@/lib/meta-pixel";

/** Píxel de Meta. Va primero en el <body> para que su PageView salga antes
 * que los eventos de la página (los efectos corren en orden de árbol).
 * fbevents.js se inyecta recién con el primer evento permitido, así que en
 * localhost, previews, e2e o rutas excluidas no se carga nunca. */
export function MetaPixel({ vercelEnv }: { vercelEnv: string | undefined }) {
  // En el render, no en un efecto: los efectos de los hijos corren antes y
  // ya pueden mandar eventos.
  configurarEntornoPixel(vercelEnv);

  const pathname = usePathname();
  const ultimaRuta = useRef<string | null>(null);

  // Un PageView por ruta; comparar rutas evita el doble en StrictMode.
  useEffect(() => {
    if (ultimaRuta.current === pathname) return;
    ultimaRuta.current = pathname;
    trackPageView();
  }, [pathname]);

  // Contact para cualquier link a WhatsApp del sitio, presente o futuro.
  useEffect(() => {
    function onClick(e: MouseEvent) {
      const link = (e.target as Element | null)?.closest?.("a[href]");
      if (link && esLinkWhatsApp(link.getAttribute("href")!)) trackContact(window.location.pathname);
    }
    document.addEventListener("click", onClick, true);
    return () => document.removeEventListener("click", onClick, true);
  }, []);

  return null;
}
