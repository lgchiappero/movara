import Image from "next/image";
import Link from "next/link";
import { urlFor } from "@/sanity/lib/image";
import { hrefModelo } from "@/lib/modelos/rutas";

type ImagenSanity = {
  asset?: { _ref: string; _type?: string } | null;
  hotspot?: unknown;
  crop?: unknown;
} | null;

/** Forma que devuelve MODELOS_CARD_QUERY (home y /modelos). */
export type ModeloCardData = {
  _id: string;
  nombre?: string | null;
  slug?: string | null;
  tagline?: string | null;
  imagen?: ImagenSanity;
  /** "Tamaños disponibles (m²)" — varios tamaños del mismo modelo. */
  tamanosDisponibles?: (number | null)[] | null;
  /** "Superficie total (m²)" — se usa si no hay tamaños disponibles. */
  superficie?: number | null;
  proximamente?: boolean | null;
};

export { hrefModelo };

/** "18 · 38 · 77 m²" — solo con los tamaños cargados en Sanity. */
export function lineaTamanos(tamanos?: (number | null)[] | null): string | null {
  const validos = (tamanos ?? []).filter((n): n is number => typeof n === "number" && n > 0);
  return validos.length ? `${validos.join(" · ")} m²` : null;
}

/** Línea de tamaños de la card: primero "Tamaños disponibles"; si está
 * vacío o falta, "Superficie total". */
export function tamanosDeCard(modelo: Pick<ModeloCardData, "tamanosDisponibles" | "superficie">): string | null {
  return lineaTamanos(modelo.tamanosDisponibles) ?? lineaTamanos([modelo.superficie ?? null]);
}

/** Card única de modelo — la misma en la home y en /modelos. La imagen se
 * muestra siempre completa (object-contain sobre fondo oscuro), nunca
 * recortada. */
export default function ModeloCard({
  modelo,
  ctaLabel = "Ver modelo",
  eager = false,
}: {
  modelo: ModeloCardData;
  ctaLabel?: string;
  /** Imagen visible al cargar la página (LCP): se carga sin lazy loading. */
  eager?: boolean;
}) {
  const nombre = modelo.nombre ?? "Modelo MOVARA";
  const proximamente = !!modelo.proximamente;
  const imagenUrl = modelo.imagen?.asset?._ref
    ? urlFor(modelo.imagen as Parameters<typeof urlFor>[0]).width(1200).fit("max").auto("format").url()
    : null;
  const tamanos = tamanosDeCard(modelo);

  const card = (
    <div
      data-modelo-card
      className={`group h-full flex flex-col rounded-2xl border border-white/10 bg-[#1E1E1E] overflow-hidden transition-colors duration-300 ${
        proximamente ? "" : "hover:border-[#D4B36A]/40"
      }`}
    >
      <div className="relative aspect-[4/3] bg-[#141414] overflow-hidden">
        {imagenUrl ? (
          <Image
            src={imagenUrl}
            alt={nombre}
            fill
            loading={eager ? "eager" : "lazy"}
            sizes="(max-width: 768px) 100vw, 600px"
            className={`object-contain p-6 sm:p-8 transition-transform duration-500 ${
              proximamente ? "opacity-60" : "group-hover:scale-[1.03]"
            }`}
          />
        ) : (
          <div data-testid="modelo-sin-imagen" className="absolute inset-0 flex items-center justify-center p-8">
            <span className="font-playfair font-medium text-2xl sm:text-3xl text-white/20 text-center">{nombre}</span>
          </div>
        )}
        {proximamente && (
          <span className="absolute top-4 left-4 text-[10px] font-semibold uppercase tracking-widest px-2.5 py-1 rounded-full bg-black/50 text-stone-300 border border-white/15">
            Próximamente
          </span>
        )}
      </div>

      <div className="p-6 sm:p-8 flex flex-col flex-1">
        <span aria-hidden="true" className="block w-8 h-px bg-[#D4B36A] mb-4" />
        <h3 className="font-playfair font-medium text-2xl sm:text-3xl text-white leading-tight">{nombre}</h3>
        {tamanos && <p className="mt-2 text-xs tracking-widest text-stone-500">{tamanos}</p>}
        {modelo.tagline && <p className="mt-3 text-sm text-stone-400 leading-relaxed">{modelo.tagline}</p>}
        {!proximamente && (
          <span className="mt-auto pt-6 inline-flex items-center gap-2 text-sm font-semibold text-[#D4B36A]">
            {ctaLabel}
            <span aria-hidden="true" className="transition-transform duration-300 group-hover:translate-x-1">
              →
            </span>
          </span>
        )}
      </div>
    </div>
  );

  if (proximamente) {
    return (
      <div aria-disabled="true" className="h-full">
        {card}
      </div>
    );
  }
  return (
    <Link href={hrefModelo(modelo.slug)} className="block h-full rounded-2xl focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#D4B36A]">
      {card}
    </Link>
  );
}
