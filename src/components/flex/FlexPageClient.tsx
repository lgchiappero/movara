"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown, ShieldCheck } from "lucide-react";
import HeroGaleria from "@/components/flex/HeroGaleria";
import EspecificacionesCompletas from "@/components/producto/EspecificacionesCompletas";
import VirtualTour from "@/components/VirtualTour";
import { getWhatsAppUrl } from "@/lib/whatsapp";

type SanityAsset = { _ref: string; _type: string };

export type FlexPageData = {
  hero?: {
    title?: string | null;
    ctaPrimario?: string | null;
  } | null;
  galeria?: { asset?: SanityAsset; hotspot?: unknown; crop?: unknown; label?: string }[] | null;
  galeriaVideos?: { url: string; titulo?: string | null }[] | null;
  descripcion?: string | null;
  precioPorM2?: number | null;
  precioNota?: string | null;
  specsClave?: string[] | null;
  extrasDisponibles?: string[] | null;
};

const TITLE_DEFAULT = "MOVARA Flex";
const CTA_PRIMARIO_DEFAULT = "Quiero este modelo";

const DESCRIPCION_DEFAULT =
  "El MOVARA Flex es una unidad plegable y expandible que se transporta cerrada y se despliega en destino. Vivienda, inversión turística u oficina rural: llega en 90 días en adelante desde el anticipo y se despliega en destino, sin meses de obra.";

const PRECIO_POR_M2_DEFAULT = 594;
const PRECIO_NOTA_DEFAULT =
  "El precio final depende de la configuración, los extras y la zona de instalación. Consultanos para tu presupuesto.";

const SPECS_CLAVE_DEFAULT = [
  "Estructura de acero galvanizado — no se oxida ni corroe",
  "Paredes de lana de roca 75mm — incombustible, alta aislación térmica",
  "Techo panel sándwich de poliuretano — sin goteras, aislación superior",
  "Piso impermeable — resistente a la humedad y a termitas",
  "Ventanas DVH con rotura de puente térmico — sin condensación",
  "Instalación eléctrica lista para la red argentina",
  "Baño y cocina completos, instalados y listos para usar",
  "Calefón eléctrico incluido de fábrica",
];

const EXTRAS_DEFAULT = [
  "Color exterior",
  "Distribución de ambientes",
  "Tipo de piso",
  "Balcón o galería exterior",
  "Sobretecho",
  "Material labrado exterior",
  "Nivel de aislación según zona climática",
  "Kit solar",
];

export default function FlexPageClient({
  data,
  waNumber,
}: {
  data?: FlexPageData | null;
  waNumber?: string | null;
}) {
  const title = data?.hero?.title ?? TITLE_DEFAULT;
  const ctaPrimario = data?.hero?.ctaPrimario ?? CTA_PRIMARIO_DEFAULT;
  const descripcion = data?.descripcion ?? DESCRIPCION_DEFAULT;
  const precioPorM2 = data?.precioPorM2 ?? PRECIO_POR_M2_DEFAULT;
  const precioNota = data?.precioNota ?? PRECIO_NOTA_DEFAULT;
  const specsClave = data?.specsClave && data.specsClave.length > 0 ? data.specsClave : SPECS_CLAVE_DEFAULT;
  const extras =
    data?.extrasDisponibles && data.extrasDisponibles.length > 0 ? data.extrasDisponibles : EXTRAS_DEFAULT;

  const waHref = getWhatsAppUrl(`Hola MOVARA! Quiero más información sobre el ${title}.`, waNumber);

  const [showEspecificaciones, setShowEspecificaciones] = useState(false);

  return (
    <>
      {/* Hero — galería interactiva full-bleed, pegada bajo el navbar fijo */}
      <div className="pt-16">
        <h1 className="sr-only">{title}</h1>
        <HeroGaleria
          title={title}
          ctaLabel={ctaPrimario}
          ctaHref={waHref}
          images={data?.galeria}
          videos={data?.galeriaVideos}
        />
      </div>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-16">
        {/* Precio por m² */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="pt-10"
        >
          <p className="text-2xl font-bold text-stone-900">
            desde USD {precioPorM2.toLocaleString("es-AR")} / m²
          </p>
          <p className="text-xs text-stone-500 mt-1 max-w-md">{precioNota}</p>
        </motion.div>

        {/* Descripción corta */}
        <motion.p
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="mt-6 text-stone-600 leading-relaxed text-lg max-w-3xl"
        >
          {descripcion}
        </motion.p>

        {/* Specs técnicas clave — fila horizontal con íconos */}
        <motion.section
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="mt-12"
        >
          <h2 className="text-xl font-bold text-stone-900 pb-3 border-b border-stone-100">Specs técnicas</h2>
          <div className="mt-5 grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {specsClave.map((s) => (
              <div
                key={s}
                className="bg-stone-50 border border-stone-100 rounded-xl p-4 flex items-start gap-3"
              >
                <ShieldCheck className="w-5 h-5 text-sage-600 mt-0.5 shrink-0" />
                <span className="text-sm text-stone-700 leading-snug">{s}</span>
              </div>
            ))}
          </div>

          {/* Especificaciones técnicas completas — desplegable, misma página */}
          <div className="mt-6">
            <button
              type="button"
              onClick={() => setShowEspecificaciones((v) => !v)}
              className="w-full flex items-center justify-between gap-4 px-5 py-4 text-left bg-stone-50 hover:bg-stone-100 rounded-2xl border border-stone-200 transition-colors"
              aria-expanded={showEspecificaciones}
            >
              <span className="text-sm font-bold text-stone-900">Ver especificaciones técnicas completas</span>
              <ChevronDown
                size={20}
                className={`shrink-0 text-stone-500 transition-transform duration-200 ${
                  showEspecificaciones ? "rotate-180" : ""
                }`}
              />
            </button>
            <AnimatePresence initial={false}>
              {showEspecificaciones && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.3, ease: "easeInOut" }}
                  className="overflow-hidden"
                >
                  <div className="mt-4">
                    <EspecificacionesCompletas />
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </motion.section>

        {/* Extras disponibles — lista corta */}
        <motion.section
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="mt-12"
        >
          <h2 className="text-xl font-bold text-stone-900 pb-3 border-b border-stone-100">Extras disponibles</h2>
          <ul className="mt-5 grid sm:grid-cols-2 lg:grid-cols-3 gap-x-8 gap-y-2.5">
            {extras.map((e) => (
              <li key={e} className="flex items-center gap-2.5 text-sm text-stone-600">
                <span className="w-1.5 h-1.5 rounded-full bg-sage-400 shrink-0" />
                {e}
              </li>
            ))}
          </ul>
        </motion.section>

        {/* Tour interactivo */}
        <motion.section
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="mt-12"
        >
          <VirtualTour modelName={title} />
        </motion.section>

        {/* Botón → WhatsApp (desktop, inline) */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="hidden sm:block mt-14"
        >
          <a
            href={waHref}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-3 w-full py-5 bg-sage-600 hover:bg-sage-700 text-white font-bold text-lg rounded-2xl transition-all duration-200 hover:shadow-xl hover:shadow-sage-600/25 hover:-translate-y-0.5"
          >
            <WhatsAppIcon className="w-6 h-6" />
            {ctaPrimario}
          </a>
        </motion.div>
      </main>
    </>
  );
}

function WhatsAppIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="currentColor" viewBox="0 0 24 24">
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
    </svg>
  );
}
