"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import type { ComponentProps, MouseEvent } from "react";
import { analizarHref, scrollArriba, scrollASeccion } from "@/lib/scroll";

type Props = Omit<ComponentProps<typeof Link>, "href"> & { href: string };

/** Link que además resuelve los casos que Link solo no cubre bien:
 * - "/" estando en la home: sube al principio (Link no hace nada).
 * - "/#seccion": baja a la sección compensando el header fijo, desde la home
 *   o desde otra página (en ese caso navega sin scroll y HomeHashScroll baja
 *   cuando la home termina de montar). */
export default function LinkInterno({ href, onClick, ...props }: Props) {
  const pathname = usePathname();
  const router = useRouter();

  function manejarClick(e: MouseEvent<HTMLAnchorElement>) {
    onClick?.(e);
    if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    const destino = analizarHref(href);
    if (!destino) return;

    if (destino.tipo === "inicio") {
      if (pathname !== "/") return;
      e.preventDefault();
      if (window.location.hash) window.history.replaceState(null, "", "/");
      scrollArriba();
      return;
    }

    e.preventDefault();
    if (pathname === "/") {
      window.history.pushState(null, "", href);
      scrollASeccion(destino.id);
    } else {
      router.push(href, { scroll: false });
    }
  }

  return <Link href={href} onClick={manejarClick} {...props} />;
}
