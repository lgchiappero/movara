import type { Metadata } from "next";
import ConfiguradorMovara from "@/components/configurador/ConfiguradorMovara";
import { client } from "@/sanity/lib/client";
import { CONFIGURADOR_PAGE_QUERY } from "@/sanity/lib/queries";

export const metadata: Metadata = {
  title: "Configurador — MOVARA",
  description:
    "Diseñá tu módulo MOVARA en 3 pasos: elegí el tamaño, el uso y la ubicación. Recibí un presupuesto personalizado al instante por WhatsApp.",
};

async function getConfiguradorData() {
  try {
    return await client.fetch(CONFIGURADOR_PAGE_QUERY);
  } catch {
    return null;
  }
}

type Props = { searchParams: Promise<{ modelo?: string }> };

export default async function ConfiguradorPage({ searchParams }: Props) {
  const [data, { modelo }] = await Promise.all([
    getConfiguradorData(),
    searchParams,
  ]);
  return <ConfiguradorMovara data={data} preselectedModelo={modelo} />;
}
