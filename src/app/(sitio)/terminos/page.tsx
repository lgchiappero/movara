import type { Metadata } from "next";
import PaginaLegal from "@/components/legal/PaginaLegal";
import { TERMINOS_CONDICIONES } from "@/data/legal/terminos";

export const metadata: Metadata = {
  title: "Términos y Condiciones — MOVARA",
  description: "Condiciones de uso del sitio de MOVARA.",
};

export default function TerminosPage() {
  return <PaginaLegal doc={TERMINOS_CONDICIONES} otro={{ href: "/privacidad", label: "Política de Privacidad" }} />;
}
