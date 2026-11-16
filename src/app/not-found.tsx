import type { Metadata } from "next";
import LayoutSitio from "@/components/layout/LayoutSitio";
import NoEncontrado from "@/components/layout/NoEncontrado";

export const metadata: Metadata = {
  title: "Página no encontrada — MOVARA",
  robots: { index: false, follow: false },
};

/** 404 de las URLs que no existen. Se renderiza bajo el layout raíz (fuera
 * de app/(sitio)), así que arma el marco con LayoutSitio. El notFound() de
 * las páginas del sitio lo atiende app/(sitio)/not-found.tsx, que ya está
 * dentro del marco: si usara este, el header y el footer saldrían dobles. */
export default function NotFound() {
  return (
    <LayoutSitio>
      <NoEncontrado />
    </LayoutSitio>
  );
}
