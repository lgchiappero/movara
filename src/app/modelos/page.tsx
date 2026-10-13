import type { Metadata } from "next";
import { client } from "@/sanity/lib/client";
import { MODELOS_CARD_QUERY } from "@/sanity/lib/queries";
import ModelosGrid from "@/components/modelos/ModelosGrid";
import type { ModeloCardData } from "@/components/modelos/ModeloCard";

export const metadata: Metadata = {
  title: "Catálogo de Modelos — MOVARA",
  description:
    "Explorá nuestros modelos de casas modulares: vivienda familiar, alquiler turístico y oficinas. Precios, planos y especificaciones.",
};

export const revalidate = 3600;

// Sin fallback a datos hardcodeados: el catálogo muestra exactamente los
// modelos activos de Sanity, ordenados por "order" — con la misma card y la
// misma grilla que la home.
async function getModelos(): Promise<ModeloCardData[]> {
  try {
    const data = await client.fetch<ModeloCardData[]>(MODELOS_CARD_QUERY);
    return Array.isArray(data) ? data : [];
  } catch {
    return [];
  }
}

export default async function CatalogPage() {
  const modelos = await getModelos();

  return (
    <div className="bg-[#1A1A1A] min-h-screen">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pt-32 pb-24">
        <header className="text-center mb-14">
          <span className="text-xs font-semibold uppercase tracking-widest text-[#D4B06A] mb-4 block">Catálogo completo</span>
          <h1 className="font-playfair font-medium text-4xl lg:text-5xl text-white">Nuestros modelos</h1>
          <p className="mt-5 text-stone-300 text-lg font-medium max-w-2xl mx-auto leading-relaxed">
            Todos los modelos son personalizables en distribución, terminaciones y colores. Entregamos en toda la
            Argentina.
          </p>
        </header>
        <ModelosGrid modelos={modelos} eagerPrimeras />
      </div>
    </div>
  );
}
