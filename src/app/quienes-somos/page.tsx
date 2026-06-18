import type { Metadata } from "next";
import Image from "next/image";
import { PortableText } from "@portabletext/react";
import { client } from "@/sanity/lib/client";
import { QUIENES_SOMOS_QUERY } from "@/sanity/lib/queries";
import { urlFor } from "@/sanity/lib/image";
import Navbar from "@/components/home/Navbar";
import Footer from "@/components/home/Footer";

export const revalidate = 3600;

export const metadata: Metadata = {
  title: "Quiénes somos — MOVARA",
  description:
    "Conocé el equipo y la historia detrás de MOVARA, empresa argentina de casas modulares.",
};

type TeamMember = {
  _key: string;
  name?: string | null;
  role?: string | null;
  bio?: string | null;
  photo?: { asset?: { _ref?: string; _id?: string; url?: string }; hotspot?: unknown; crop?: unknown } | null;
};

type Valor = {
  _key: string;
  icon?: string | null;
  title?: string | null;
  description?: string | null;
};

type QuienesSomosData = {
  hero?: {
    title?: string | null;
    subtitle?: string | null;
    backgroundImage?: {
      asset?: { _id?: string; url?: string };
      hotspot?: unknown;
      crop?: unknown;
    } | null;
  } | null;
  historia?: { title?: string | null; content?: unknown[] | null } | null;
  mision?: { title?: string | null; text?: string | null } | null;
  vision?: { title?: string | null; text?: string | null } | null;
  valores?: Valor[] | null;
  equipo?: TeamMember[] | null;
};

async function getData(): Promise<QuienesSomosData | null> {
  try {
    return await client.fetch<QuienesSomosData>(QUIENES_SOMOS_QUERY);
  } catch {
    return null;
  }
}

export default async function QuienesSomosPage() {
  const data = await getData();

  const heroTitle = data?.hero?.title ?? "Construimos hogares, no solo estructuras.";
  const heroSubtitle =
    data?.hero?.subtitle ??
    "Somos un equipo apasionado por la arquitectura modular y el acceso a la vivienda digna. Más de 8 años transformando terrenos vacíos en hogares.";
  const heroImage = data?.hero?.backgroundImage;

  const historiaTitle = data?.historia?.title ?? "Nuestra historia";
  const historiaContent = data?.historia?.content;

  const visionTitle = data?.vision?.title ?? "Visión";
  const misionTitle = data?.mision?.title ?? "Misión";

  return (
    <>
      <Navbar />
      <main>
        {/* Hero */}
        <section className="relative bg-sage-950 pt-32 pb-20 px-6 lg:px-8 overflow-hidden">
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
              Quiénes somos
            </span>
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-white leading-[1.1] tracking-tight">
              {heroTitle}
            </h1>
            <p className="mt-6 text-lg text-stone-400 max-w-2xl mx-auto leading-relaxed">
              {heroSubtitle}
            </p>
          </div>
        </section>

        <div className="max-w-4xl mx-auto px-6 lg:px-8 py-20 space-y-20">
          {/* Historia */}
          {historiaContent && Array.isArray(historiaContent) && historiaContent.length > 0 && (
            <section>
              <h2 className="text-2xl font-bold text-stone-900 mb-6 pb-4 border-b border-stone-100">
                {historiaTitle}
              </h2>
              <div className="prose prose-stone max-w-none prose-p:text-stone-600 prose-headings:text-stone-900">
                <PortableText value={historiaContent as Parameters<typeof PortableText>[0]["value"]} />
              </div>
            </section>
          )}

          {/* Visión y Misión */}
          {(data?.vision?.text || data?.mision?.text) && (
            <section className="grid sm:grid-cols-2 gap-8">
              {data.vision?.text && (
                <div className="bg-sage-50 border border-sage-100 rounded-2xl p-8">
                  <h2 className="text-lg font-bold text-stone-900 mb-3 flex items-center gap-2">
                    <span className="w-6 h-6 rounded-full bg-sage-600 text-white text-xs flex items-center justify-center font-bold">
                      V
                    </span>
                    {visionTitle}
                  </h2>
                  <p className="text-stone-600 leading-relaxed">{data.vision.text}</p>
                </div>
              )}
              {data.mision?.text && (
                <div className="bg-stone-50 border border-stone-100 rounded-2xl p-8">
                  <h2 className="text-lg font-bold text-stone-900 mb-3 flex items-center gap-2">
                    <span className="w-6 h-6 rounded-full bg-stone-700 text-white text-xs flex items-center justify-center font-bold">
                      M
                    </span>
                    {misionTitle}
                  </h2>
                  <p className="text-stone-600 leading-relaxed">{data.mision.text}</p>
                </div>
              )}
            </section>
          )}

          {/* Valores */}
          {data?.valores && data.valores.length > 0 && (
            <section>
              <h2 className="text-2xl font-bold text-stone-900 mb-8 pb-4 border-b border-stone-100">
                Nuestros valores
              </h2>
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {data.valores.map((valor, i) => (
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
          )}

          {/* Equipo */}
          {data?.equipo && data.equipo.length > 0 && (
            <section>
              <h2 className="text-2xl font-bold text-stone-900 mb-8 pb-4 border-b border-stone-100">
                El equipo
              </h2>
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-8">
                {data.equipo.map((member) => (
                  <div key={member._key} className="flex flex-col items-center text-center">
                    {member.photo?.asset ? (
                      <div className="relative w-24 h-24 rounded-full overflow-hidden mb-4 bg-stone-100">
                        <Image
                          src={urlFor(member.photo).width(192).height(192).fit("crop").auto("format").url()}
                          alt={member.name ?? ""}
                          fill
                          className="object-cover"
                          sizes="96px"
                        />
                      </div>
                    ) : (
                      <div className="w-24 h-24 rounded-full bg-sage-100 flex items-center justify-center mb-4 text-sage-600 text-2xl font-bold">
                        {member.name?.[0] ?? "?"}
                      </div>
                    )}
                    <h3 className="font-bold text-stone-900">{member.name}</h3>
                    {member.role && (
                      <p className="text-sage-600 text-sm font-medium mt-0.5">{member.role}</p>
                    )}
                    {member.bio && (
                      <p className="mt-3 text-stone-500 text-sm leading-relaxed">{member.bio}</p>
                    )}
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Fallback si no hay data de Sanity */}
          {!data && (
            <section className="text-center py-12">
              <p className="text-stone-400">
                El contenido de esta página se configura desde Sanity Studio.
              </p>
            </section>
          )}
        </div>
      </main>
      <Footer />
    </>
  );
}
