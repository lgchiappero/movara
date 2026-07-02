import type { Metadata } from "next";
import { Suspense } from "react";
import ConfiguradorMovara from "@/components/configurador/ConfiguradorMovara";
import ConfiguradorModeloReader from "@/components/configurador/ConfiguradorModeloReader";
import { client } from "@/sanity/lib/client";
import { CONFIGURADOR_PAGE_QUERY } from "@/sanity/lib/queries";

// Contenido del CMS: cambia poco, se sirve estático y se revalida cada 1h.
// `force-static` es una barrera explícita: si alguien reintroduce una API
// dinámica (searchParams/cookies/headers) en esta página, el build falla
// en vez de degradar silenciosamente a SSR por request.
export const dynamic = "force-static";
export const revalidate = 3600;

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

export default async function ConfiguradorPage() {
  const data = await getConfiguradorData();

  // `?modelo=` solo afecta el estado inicial del cliente, no el render del
  // servidor: se lee con useSearchParams() dentro de un Suspense boundary
  // para que el resto de la página se genere estática. El fallback es el
  // mismo componente sin preselección, así no hay salto visual mientras
  // hidrata.
  return (
    <Suspense fallback={<ConfiguradorMovara data={data} />}>
      <ConfiguradorModeloReader data={data} />
    </Suspense>
  );
}
