import type { Metadata } from "next";
import ConfiguradorMovara from "@/components/configurador/ConfiguradorMovara";

export const metadata: Metadata = {
  title: "Configurador — MOVARA",
  description:
    "Diseñá tu módulo MOVARA en 3 pasos: elegí el tamaño, el uso y la ubicación. Recibí un presupuesto personalizado al instante por WhatsApp.",
};

export default function ConfiguradorPage() {
  return <ConfiguradorMovara />;
}
