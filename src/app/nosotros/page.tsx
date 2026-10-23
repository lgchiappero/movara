import type { Metadata } from "next";
import Image from "next/image";
import { PortableText } from "@portabletext/react";
import { client } from "@/sanity/lib/client";
import { QUIENES_SOMOS_QUERY } from "@/sanity/lib/queries";
import { urlFor } from "@/sanity/lib/image";
import { resolverQuienesSomos, type QuienesSomosSanity } from "@/data/quienes-somos";
import Navbar from "@/components/home/Navbar";
import Footer from "@/components/home/Footer";

export const revalidate = 3600;

export const metadata: Metadata = {
  title: "Nosotros — MOVARA",
  description:
    "MOVARA nace en Sunchales para repensar la forma de habitar: casas modulares de diseño, llave en mano, con entrega en toda la Argentina.",
};

type ImagenSanity = { asset?: { _id?: string; url?: string }; hotspot?: unknown; crop?: unknown };

async function getData(): Promise<QuienesSomosSanity | null> {
  try {
    return await client.fetch<QuienesSomosSanity>(QUIENES_SOMOS_QUERY);
  } catch {
    return null;
  }
}

export default async function QuienesSomosPage() {
  // Lo cargado en Sanity gana; lo vacío cae a los textos por defecto.
  const { hero, historia, presencia, mision, vision, valores } = resolverQuienesSomos(await getData());
  const heroImage = hero.backgroundImage as ImagenSanity | null;

  return (
    <>
      <Navbar />
      <main>
        {/* Hero */}
        <section className="relative bg-sage-950 pt-32 pb-20 px-4 sm:px-6 lg:px-8 overflow-hidden">
          {/* Background image */}
          {heroImage?.asset && (
            <div className="absolute inset-0">
              <Image
                src={urlFor(heroImage).width(1600).height(600).fit("crop").auto("format").url()}
                alt=""
                fill
                className="object-cover opacity-20"
                priority
                sizes="100vw"
              />
            </div>
          )}
          <div className="relative max-w-4xl mx-auto text-center">
            <span className="inline-block text-sage-400 text-sm font-semibold uppercase tracking-widest mb-5">
              Nosotros
            </span>
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-white leading-[1.1] tracking-tight">
              {hero.title}
            </h1>
            <p className="mt-6 text-lg text-stone-400 max-w-2xl mx-auto leading-relaxed">{hero.subtitle}</p>
          </div>
        </section>

        {/* Historia — texto largo, ancho de lectura acotado a propósito */}
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
          <h2 className="text-2xl font-bold text-stone-900 mb-6 pb-4 border-b border-stone-100">{historia.title}</h2>
          {/* Sin plugin de typography: el espaciado entre párrafos va explícito. */}
          <div className="max-w-3xl space-y-5 text-lg text-stone-600 leading-relaxed">

            <PortableText value={historia.content as Parameters<typeof PortableText>[0]["value"]} />
          </div>
        </section>

        {/* Presencia — banda oscura de ancho completo */}
        <section aria-labelledby="presencia-titulo" className="bg-[#1A1A1A] py-20">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <h2
              id="presencia-titulo"
              className="font-playfair font-medium text-3xl lg:text-4xl text-white text-center mb-12 lg:mb-14"
            >
              {presencia.title}
            </h2>
            <div className="grid gap-10 md:grid-cols-3 md:gap-8 lg:gap-12">
              {presencia.bloques.map((bloque) => (
                <div key={bloque._key} className="border-t border-[#D4B36A]/30 pt-6">
                  <h3 className="text-[#D4B36A] text-sm font-semibold uppercase tracking-widest mb-4">
                    {bloque.subtitulo}
                  </h3>
                  <p className="text-stone-300 leading-relaxed">{bloque.texto}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 space-y-20">
          {/* Misión y Visión */}
          <section className="grid sm:grid-cols-2 gap-8">
            <div className="bg-stone-50 border border-stone-100 rounded-2xl p-8">
              <h2 className="text-lg font-bold text-stone-900 mb-3 flex items-center gap-2">
                <span className="w-6 h-6 rounded-full bg-stone-700 text-white text-xs flex items-center justify-center font-bold">
                  M
                </span>
                {mision.title}
              </h2>
              <p className="text-stone-600 leading-relaxed">{mision.text}</p>
            </div>
            <div className="bg-sage-50 border border-sage-100 rounded-2xl p-8">
              <h2 className="text-lg font-bold text-stone-900 mb-3 flex items-center gap-2">
                <span className="w-6 h-6 rounded-full bg-sage-600 text-white text-xs flex items-center justify-center font-bold">
                  V
                </span>
                {vision.title}
              </h2>
              <p className="text-stone-600 leading-relaxed">{vision.text}</p>
            </div>
          </section>

          {/* Valores */}
          <section>
            <h2 className="text-2xl font-bold text-stone-900 mb-8 pb-4 border-b border-stone-100">
              Nuestros valores
            </h2>
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {valores.map((valor, i) => (
                <div
                  key={valor._key}
                  className="bg-white border border-stone-100 rounded-2xl p-6 hover:shadow-lg transition-shadow"
                >
                  {valor.icon ? (
                    <span className="text-3xl">{valor.icon}</span>
                  ) : (
                    <span className="text-sage-400 text-xs font-bold tracking-widest uppercase">
                      {String(i + 1).padStart(2, "0")}
                    </span>
                  )}
                  <h3 className="mt-3 font-bold text-stone-900 mb-2">{valor.title}</h3>
                  <p className="text-sm text-stone-500 leading-relaxed">{valor.description}</p>
                </div>
              ))}
            </div>
          </section>
        </div>
      </main>
      <Footer />
    </>
  );
}
