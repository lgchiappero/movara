"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronUp } from "lucide-react";
import { usePathname } from "next/navigation";
import { scrollArriba } from "@/lib/scroll";

/** Separación entre el botón y lo que tenga abajo. */
const SEPARACION = 16;

/** Alto de la barra fija de abajo que esté visible (la de WhatsApp o la del
 * configurador en el celular), para no quedar tapado. Solo cuentan las que
 * están fijas: la navegación del configurador es estática desde sm.
 * offsetHeight ignora el scale con el que late el panel de precio. */
export function altoBarraInferior(): number {
  const barras = Array.from(document.querySelectorAll<HTMLElement>("[data-barra-inferior]")).filter(
    (b) => getComputedStyle(b).position === "fixed"
  );
  return Math.max(0, ...barras.map((b) => b.offsetHeight));
}

export default function BackToTop() {
  // En el celular el configurador tiene su barra fija con Atrás/Siguiente:
  // el botón quedaría encima de las opciones.
  const enConfigurador = usePathname()?.startsWith("/configurador") ?? false;
  const [visible, setVisible] = useState(false);
  const [bottom, setBottom] = useState(96);

  useEffect(() => {
    // El panel de precio del configurador cambia de alto según lo elegido:
    // además del scroll, se sigue el tamaño de cada barra.
    const observador = typeof ResizeObserver === "undefined" ? null : new ResizeObserver(() => actualizar());
    const actualizar = () => {
      setVisible(window.scrollY > 400);
      setBottom(altoBarraInferior() + SEPARACION);
      document.querySelectorAll("[data-barra-inferior]").forEach((b) => observador?.observe(b));
    };
    actualizar();
    window.addEventListener("scroll", actualizar, { passive: true });
    window.addEventListener("resize", actualizar);
    return () => {
      observador?.disconnect();
      window.removeEventListener("scroll", actualizar);
      window.removeEventListener("resize", actualizar);
    };
  }, []);

  return (
    <AnimatePresence>
      {visible && (
        <motion.button
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.8 }}
          transition={{ duration: 0.2 }}
          onClick={scrollArriba}
          style={{ bottom }}
          className={`${enConfigurador ? "max-sm:hidden " : ""}fixed right-4 sm:right-6 z-50 w-11 h-11 bg-[#2F2F2F] border border-[#D4B36A]/30 rounded-full flex items-center justify-center text-[#D4B36A] hover:bg-[#3A3A3A] hover:border-[#D4B36A]/60 transition-colors shadow-lg`}
          aria-label="Volver al inicio"
        >
          <ChevronUp size={20} strokeWidth={2.5} />
        </motion.button>
      )}
    </AnimatePresence>
  );
}
