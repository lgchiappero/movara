import type { Metadata } from "next";
import PaginaLegal from "@/components/legal/PaginaLegal";
import { POLITICA_PRIVACIDAD } from "@/data/legal/privacidad";

export const metadata: Metadata = {
  title: "Política de Privacidad — MOVARA",
  description: "Qué datos personales recolecta MOVARA, para qué los usa y cómo ejercer tus derechos (Ley 25.326).",
};

export default function PrivacidadPage() {
  return <PaginaLegal doc={POLITICA_PRIVACIDAD} otro={{ href: "/terminos", label: "Términos y Condiciones" }} />;
}
