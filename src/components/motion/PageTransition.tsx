"use client";

import { useEffect } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { usePathname } from "next/navigation";

// La primera carga no se anima: el HTML del server saldría con opacity 0
// hasta hidratar y empeoraría el LCP. Solo las navegaciones posteriores
// (template se remonta en cada una) hacen el fade. En el server nunca corre
// el effect, así que server y primer render del cliente coinciden.
let primeraCarga = true;

/** Rutas donde no animamos el cambio de página: herramientas internas, el
 * fade solo agrega latencia percibida. */
const SIN_TRANSICION = ["/admin", "/studio"];

/** Solo para tests: vuelve al estado de "primera carga". */
export function resetPrimeraCarga() {
  primeraCarga = true;
}

export function debeAnimar(pathname: string): boolean {
  return !SIN_TRANSICION.some((p) => pathname === p || pathname.startsWith(`${p}/`));
}

/** Fade suave entre páginas. Solo opacidad (sin transform): un transform en
 * el wrapper rompería los elementos `position: fixed` de adentro (Navbar).
 * Con prefers-reduced-motion, MotionProvider deja igual el fade de opacidad,
 * que no genera movimiento. */
export default function PageTransition({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const animarEntrada = !primeraCarga;
  useEffect(() => {
    primeraCarga = false;
  }, []);

  if (!debeAnimar(pathname)) return <>{children}</>;

  return (
    <AnimatePresence mode="wait" initial={animarEntrada}>
      <motion.div
        key={pathname}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.35, ease: "easeOut" }}
        className="flex-1 flex flex-col"
      >
        {children}
      </motion.div>
    </AnimatePresence>
  );
}
