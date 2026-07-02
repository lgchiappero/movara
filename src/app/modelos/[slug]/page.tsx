import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { MODELS, getModel, type ProductModel } from "@/data/models";
import { client } from "@/sanity/lib/client";
import { MODELO_BY_SLUG_QUERY, MODELO_SLUGS_QUERY } from "@/sanity/lib/queries";
import { getWhatsAppUrl } from "@/lib/whatsapp";
import ImageGallery from "@/components/detail/ImageGallery";
import FloorPlan from "@/components/detail/FloorPlan";
import ConsultarButton from "@/components/detail/ConsultarButton";
import VirtualTour from "@/components/detail/VirtualTour";
import EspecificacionesEstandar from "@/components/EspecificacionesEstandar";

const FINALIDAD_LABELS: Record<string, string> = {
  inversor: "💰 Inversión / Renta",
  agro: "🌾 Agro / Campo",
  vivienda: "🏠 Primera vivienda",
  turismo: "🏕️ Turismo",
  empresa: "💼 Empresa / B2B",
  "sector-publico": "🏛️ Sector público",
};

export const revalidate = 3600;

type Props = { params: Promise<{ slug: string }> };

async function getModeloBySlug(slug: string): Promise<ProductModel | undefined> {
  try {
    const data = await client.fetch<ProductModel | null>(MODELO_BY_SLUG_QUERY, { slug });
    if (data) return data;
  } catch {
    // Sanity unavailable
  }
  return getModel(slug);
}

export async function generateStaticParams() {
  try {
    const slugs = await client.fetch<{ slug: string }[]>(MODELO_SLUGS_QUERY);
    const all = new Set([...MODELS.map((m) => m.slug), ...slugs.map((s) => s.slug)]);
    return [...all].map((slug) => ({ slug }));
  } catch {
    return MODELS.map((m) => ({ slug: m.slug }));
  }
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const model = await getModeloBySlug(slug);
  if (!model) return {};
  return {
    title: `${model.name} — MOVARA`,
    description: model.tagline ?? undefined,
  };
}

export default async function ModelDetailPage({ params }: Props) {
  const { slug } = await params;
  const model = await getModeloBySlug(slug);
  if (!model) notFound();

  const waHref = getWhatsAppUrl(`Hola, me interesa el modelo ${model.name}. ¿Podrían enviarme más información?`);

  // Prefer flexible especificaciones array; fall back to legacy specs object
  const specRows: { key: string; val: string }[] =
    model.especificaciones && model.especificaciones.length > 0
      ? model.especificaciones.map((e) => ({ key: e.clave, val: e.valor }))
      : model.specs
        ? [
            { key: "Estructura", val: model.specs.estructura },
            { key: "Cubierta", val: model.specs.cubierta },
            { key: "Cerramiento", val: model.specs.cerramiento },
            { key: "Aislación", val: model.specs.aislacion },
            { key: "Instalaciones", val: model.specs.instalaciones },
            { key: "Terminaciones", val: model.specs.terminaciones },
            { key: "Tiempo de obra", val: model.specs.tiempo },
            { key: "Garantía", val: model.specs.garantia },
          ].filter((r) => r.val)
        : [];

  const configuradorHref = model.tamano
    ? `/configurador?modelo=${model.tamano}`
    : "/configurador";

  return (
    <>
      {/* Breadcrumb */}
      <div className="bg-stone-50 border-b border-stone-100 pt-20">
        <div className="max-w-7xl mx-auto px-6 lg:px-8 py-4 flex items-center gap-2 text-sm text-stone-400">
          <Link href="/" className="hover:text-stone-600 transition-colors">Inicio</Link>
          <span>/</span>
          <Link href="/modelos" className="hover:text-stone-600 transition-colors">Modelos</Link>
          <span>/</span>
          <span className="text-stone-700 font-medium">{model.name}</span>
        </div>
      </div>

      <main className="max-w-7xl mx-auto px-6 lg:px-8 py-12">
        {/* Top grid: gallery + info */}
        <div className="grid lg:grid-cols-5 gap-10 lg:gap-14">

          {/* Gallery */}
          <div className="lg:col-span-3">
            <ImageGallery images={model.images} modelName={model.name} video={model.video} videos={model.videos} />
          </div>

          {/* Info sidebar */}
          <div className="lg:col-span-2 flex flex-col gap-6">
            <div>
              {model.tag && (
                <span className="inline-block text-xs font-bold uppercase tracking-widest text-white bg-sage-600 px-3 py-1 rounded-full mb-3">
                  {model.tag}
                </span>
              )}
              <h1 className="text-3xl lg:text-4xl font-bold text-stone-900 tracking-tight">
                {model.name}
              </h1>
              {model.tagline && (
                <p className="mt-2 text-stone-500 text-lg">{model.tagline}</p>
              )}
            </div>

            {/* Quick specs */}
            <div className="grid grid-cols-3 gap-3">
              {[
                { value: model.size != null ? `${model.size} m²` : null, label: "Superficie" },
                {
                  value: model.rooms != null
                    ? model.rooms === 1 ? "1 amb." : `${model.rooms} amb.`
                    : null,
                  label: "Ambientes",
                },
                {
                  value: model.baths != null
                    ? model.baths === 1 ? "1 baño" : `${model.baths} baños`
                    : null,
                  label: "Baños",
                },
              ]
                .filter((s) => s.value)
                .map(({ value, label }) => (
                  <div key={label} className="bg-stone-50 rounded-xl p-3.5 text-center border border-stone-100">
                    <p className="text-lg font-bold text-stone-900">{value}</p>
                    <p className="text-xs text-stone-500 mt-0.5">{label}</p>
                  </div>
                ))}
            </div>

            {/* Price */}
            {model.priceUSD != null && (
              <div className="bg-sage-50 border border-sage-100 rounded-2xl p-5">
                <p className="text-xs font-semibold uppercase tracking-widest text-sage-700">
                  {model.precioHasta ? "Precio estimado" : "Precio desde"}
                </p>
                <p className="text-4xl font-bold text-stone-900 mt-1">
                  USD {model.priceUSD.toLocaleString("es-AR")}
                  {model.precioHasta && (
                    <span className="text-stone-400 text-2xl font-normal">
                      {" – "}{model.precioHasta.toLocaleString("es-AR")}
                    </span>
                  )}
                </p>
                <p className="text-xs text-stone-500 mt-1">
                  Incluye fabricación, transporte e instalación
                </p>
              </div>
            )}

            {/* Delivery time */}
            {model.specs?.tiempo && (
              <div className="flex items-center gap-3 text-sm text-stone-600 bg-stone-50 border border-stone-100 rounded-xl px-4 py-3">
                <ClockIcon className="w-5 h-5 text-sage-600 shrink-0" />
                <span>
                  Entrega en <strong className="text-stone-900">{model.specs.tiempo}</strong>
                </span>
              </div>
            )}

            {/* Finalidades */}
            {model.finalidades && model.finalidades.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {model.finalidades.map((f) => (
                  <span
                    key={f}
                    className="px-2.5 py-1 bg-sage-50 border border-sage-100 text-sage-700 text-xs font-medium rounded-full"
                  >
                    {FINALIDAD_LABELS[f] ?? f}
                  </span>
                ))}
              </div>
            )}

            {/* CTA buttons */}
            <div className="flex flex-col gap-3">
              <Link
                href={configuradorHref}
                className="block w-full text-center py-3.5 bg-sage-600 hover:bg-sage-700 text-white font-bold rounded-xl transition-all duration-200 hover:shadow-lg hover:shadow-sage-600/25 hover:-translate-y-0.5"
              >
                Diseñar mi MOVARA
              </Link>
              <a
                href={waHref}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-2 py-3.5 border border-stone-200 hover:border-stone-300 text-stone-700 hover:text-stone-900 font-semibold rounded-xl transition-colors"
              >
                <WhatsAppIcon className="w-5 h-5 text-green-500" />
                Consultar por WhatsApp
              </a>
            </div>
          </div>
        </div>

        {/* Content below gallery */}
        <div className="mt-14 grid lg:grid-cols-3 gap-10 lg:gap-14">
          <div className="lg:col-span-2 space-y-12">

            {/* Description */}
            {(model.description || (model.features && model.features.length > 0)) && (
              <section>
                <SectionTitle>Descripción</SectionTitle>
                {model.description && (
                  <p className="text-stone-600 leading-relaxed mt-4">{model.description}</p>
                )}
                {model.features && model.features.length > 0 && (
                  <ul className="mt-6 grid sm:grid-cols-2 gap-x-6 gap-y-3">
                    {model.features.map((f) => (
                      <li key={f} className="flex items-start gap-2.5 text-sm text-stone-600">
                        <CheckIcon className="w-4 h-4 text-sage-600 mt-0.5 shrink-0" />
                        {f}
                      </li>
                    ))}
                  </ul>
                )}
              </section>
            )}

            {/* Specs — only show if at least one spec field is populated */}
            {specRows.length > 0 && (
              <section>
                <SectionTitle>Especificaciones técnicas</SectionTitle>
                <div className="mt-4 border border-stone-100 rounded-2xl overflow-hidden">
                  <table className="w-full text-sm">
                    <tbody>
                      {specRows.map(({ key, val }, i) => (
                        <tr key={key} className={i % 2 === 0 ? "bg-stone-50" : "bg-white"}>
                          <td className="py-3.5 px-5 font-semibold text-stone-700 w-2/5 align-top">
                            {key}
                          </td>
                          <td className="py-3.5 px-5 text-stone-500">{val}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </section>
            )}

            {/* MOVARA standard specs */}
            <section>
              <EspecificacionesEstandar />
            </section>

            {/* Floor plan */}
            <section>
              <SectionTitle>Plano de planta</SectionTitle>
              <p className="text-sm text-stone-500 mt-1 mb-4">
                Plano esquemático referencial. La distribución es personalizable.
              </p>
              <FloorPlan size={model.floorPlanSize ?? "medium"} />
            </section>

            {/* Virtual tour — only when URL is set */}
            {model.virtualTour && (
              <VirtualTour url={model.virtualTour} modelName={model.name} />
            )}
          </div>

          {/* Sidebar */}
          <aside className="space-y-6">
            <div className="bg-stone-50 border border-stone-100 rounded-2xl p-6 space-y-4">
              <h3 className="font-bold text-stone-900">Incluido en el precio</h3>
              {[
                "Fabricación en planta controlada",
                "Transporte hasta tu terreno",
                "Instalación y nivelación",
                "Conexiones de servicios",
                "Planos aprobados",
                "Garantía escrita",
              ].map((item) => (
                <div key={item} className="flex items-center gap-2.5 text-sm text-stone-600">
                  <CheckIcon className="w-4 h-4 text-green-500 shrink-0" />
                  {item}
                </div>
              ))}
            </div>

            <div className="bg-stone-900 rounded-2xl p-6 text-white">
              <p className="font-bold text-lg">¿Dudas sobre este modelo?</p>
              <p className="text-stone-400 text-sm mt-2">
                Hablá con uno de nuestros asesores y te orientamos sin compromiso.
              </p>
              <a
                href="tel:+5491100000000"
                className="flex items-center gap-2 mt-4 text-sage-400 font-semibold text-sm hover:text-sage-300"
              >
                <PhoneIcon className="w-4 h-4" />
                +54 9 11 0000-0000
              </a>
            </div>
          </aside>
        </div>

        {/* Configurador CTA banner */}
        <div className="mt-12 bg-sage-950 rounded-2xl p-8 flex flex-col sm:flex-row items-center justify-between gap-6">
          <div>
            <h2 className="text-xl font-bold text-white">¿Listo para personalizarlo?</h2>
            <p className="text-stone-400 text-sm mt-1">
              3 preguntas, 2 minutos. Recibís el presupuesto exacto por WhatsApp al instante.
            </p>
          </div>
          <Link
            href={configuradorHref}
            className="shrink-0 px-8 py-3.5 bg-sage-500 hover:bg-sage-400 text-white font-bold rounded-xl transition-all duration-200 hover:shadow-lg hover:shadow-sage-500/30 hover:-translate-y-0.5 text-sm"
          >
            Abrir configurador →
          </Link>
        </div>
      </main>
    </>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="text-xl font-bold text-stone-900 pb-3 border-b border-stone-100">
      {children}
    </h2>
  );
}

function CheckIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
    </svg>
  );
}

function ClockIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  );
}

function WhatsAppIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="currentColor" viewBox="0 0 24 24">
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
    </svg>
  );
}

function PhoneIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 8V5z" />
    </svg>
  );
}
