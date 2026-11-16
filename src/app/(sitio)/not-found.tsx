import type { Metadata } from "next";
import NoEncontrado from "@/components/layout/NoEncontrado";

export const metadata: Metadata = {
  title: "Página no encontrada — MOVARA",
  robots: { index: false, follow: false },
};

/** notFound() dentro de una página del sitio: el header y el footer ya los
 * pone app/(sitio)/layout.tsx, acá va solo el contenido. */
export default function NotFoundSitio() {
  return <NoEncontrado />;
}
