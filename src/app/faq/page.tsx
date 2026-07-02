import type { Metadata } from "next";
import Link from "next/link";
import { client } from "@/sanity/lib/client";
import { FAQ_PAGE_QUERY } from "@/sanity/lib/queries";
import { FAQ_CATEGORIES, type FaqCategory } from "@/data/faq";
import Navbar from "@/components/home/Navbar";
import Footer from "@/components/home/Footer";
import FaqSearch from "@/components/faq/FaqSearch";

export const revalidate = 3600;

export const metadata: Metadata = {
  title: "Preguntas frecuentes — MOVARA",
  description:
    "Resolvé tus dudas sobre las unidades MOVARA: producto, instalación, precios, gas y servicios, y permisos.",
};

async function getData(): Promise<FaqCategory[]> {
  try {
    const data = await client.fetch<{ categorias?: FaqCategory[] } | null>(FAQ_PAGE_QUERY);
    return data?.categorias?.length ? data.categorias : FAQ_CATEGORIES;
  } catch {
    return FAQ_CATEGORIES;
  }
}

export default async function FaqPage() {
  const categorias = await getData();

  return (
    <>
      <Navbar />
      <main>
        <section className="bg-sage-950 pt-32 pb-16 px-6 lg:px-8">
          <div className="max-w-4xl mx-auto text-center">
            <span className="inline-block text-sage-400 text-sm font-semibold uppercase tracking-widest mb-5">
              Preguntas frecuentes
            </span>
            <h1 className="text-4xl sm:text-5xl font-bold text-white leading-[1.1] tracking-tight">
              ¿En qué te podemos ayudar?
            </h1>
            <p className="mt-6 text-lg text-stone-400 max-w-2xl mx-auto leading-relaxed">
              Todo lo que necesitás saber sobre las unidades MOVARA, antes de reservar la tuya.
            </p>
          </div>
        </section>

        <section className="py-20 px-6 lg:px-8">
          <div className="max-w-3xl mx-auto">
            <FaqSearch categorias={categorias} />
          </div>
        </section>

        <section className="py-20 px-6 lg:px-8 bg-[#F2F2F2]">
          <div className="max-w-2xl mx-auto text-center">
            <h2 className="text-2xl sm:text-3xl font-bold text-[#2F2F2F] mb-4">
              ¿No encontraste lo que buscabas?
            </h2>
            <p className="text-stone-500 mb-8">
              Consultanos y te ayudamos a armar la configuración que necesitás.
            </p>
            <Link
              href="/configurador"
              className="inline-flex items-center gap-2 px-8 py-4 bg-sage-500 hover:bg-sage-600 text-white font-semibold rounded-xl transition-all duration-200 hover:shadow-xl hover:shadow-sage-500/25 hover:-translate-y-0.5"
            >
              Consultanos
            </Link>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
