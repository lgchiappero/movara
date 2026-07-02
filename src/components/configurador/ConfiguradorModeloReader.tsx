"use client";

import { useSearchParams } from "next/navigation";
import ConfiguradorMovara, { type ConfiguradorPageData } from "@/components/configurador/ConfiguradorMovara";

/**
 * Lee `?modelo=` en el cliente para no forzar SSR dinámico en toda la
 * página del configurador. Debe montarse dentro de un <Suspense>.
 */
export default function ConfiguradorModeloReader({ data }: { data?: ConfiguradorPageData | null }) {
  const searchParams = useSearchParams();
  return <ConfiguradorMovara data={data} preselectedModelo={searchParams.get("modelo") ?? undefined} />;
}
