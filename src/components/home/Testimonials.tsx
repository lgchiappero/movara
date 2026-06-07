import { client } from "@/sanity/lib/client";
import { TESTIMONIOS_QUERY } from "@/sanity/lib/queries";

type Testimonio = {
  _id: string;
  quote: string;
  nombre: string;
  rol: string;
  ciudad: string;
  isFeatured: boolean;
};

// Static fallback — shown until content is added in Sanity Studio
const STATIC_TESTIMONIOS: Testimonio[] = [
  {
    _id: "static-1",
    quote:
      "Compramos el Studio 35 para alquilar en Pinamar. En la primera temporada recuperamos el 38% de la inversión. El proceso fue mucho más simple de lo que imaginábamos y la calidad superó todas las expectativas.",
    nombre: "María G.",
    rol: "Inversora · Alquiler turístico",
    ciudad: "Buenos Aires",
    isFeatured: true,
  },
  {
    _id: "static-2",
    quote:
      "Creíamos que iba a ser una odisea como todas las obras. A los 78 días nos dieron las llaves. No lo podíamos creer.",
    nombre: "Familia Rodríguez",
    rol: "Vivienda familiar",
    ciudad: "Córdoba",
    isFeatured: false,
  },
  {
    _id: "static-3",
    quote:
      "Mi oficina en el jardín cambió mi forma de trabajar. Recibo clientes, me concentro mejor y el espacio es mío. Ya lo amortizé.",
    nombre: "Hernán M.",
    rol: "Diseñador freelance · Oficina en casa",
    ciudad: "Buenos Aires",
    isFeatured: false,
  },
];

async function getTestimonios(): Promise<Testimonio[]> {
  try {
    const data = await client.fetch<Testimonio[]>(TESTIMONIOS_QUERY);
    if (Array.isArray(data) && data.length > 0) return data;
  } catch {
    // Sanity unavailable — use static fallback
  }
  return STATIC_TESTIMONIOS;
}

export default async function Testimonials() {
  const testimonios = await getTestimonios();

  const featured = testimonios.find((t) => t.isFeatured) ?? testimonios[0];
  const rest = testimonios.filter((t) => t._id !== featured._id).slice(0, 2);

  return (
    <section className="bg-sage-50 py-24">
      <div className="max-w-7xl mx-auto px-6 lg:px-8">
        <div className="text-center mb-14">
          <span className="text-sage-600 text-sm font-semibold uppercase tracking-widest">
            Testimonios
          </span>
          <h2 className="mt-3 text-4xl font-bold text-stone-900 tracking-tight">
            Lo que dicen nuestros clientes
          </h2>
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Featured */}
          <div className="lg:col-span-2 bg-sage-950 rounded-2xl p-8 lg:p-10 flex flex-col justify-between">
            <div>
              <QuoteIcon className="w-8 h-8 text-sage-400 mb-6 opacity-70" />
              <blockquote className="text-xl text-white leading-relaxed font-medium">
                &ldquo;{featured.quote}&rdquo;
              </blockquote>
            </div>
            <div className="flex items-center gap-4 mt-8 pt-8 border-t border-sage-800">
              <div className="w-11 h-11 rounded-full bg-sage-600 flex items-center justify-center text-white text-sm font-bold shrink-0">
                {initials(featured.nombre)}
              </div>
              <div>
                <p className="text-white font-semibold">{featured.nombre}</p>
                <p className="text-stone-400 text-sm">
                  {featured.rol}
                  {featured.ciudad ? ` · ${featured.ciudad}` : ""}
                </p>
              </div>
              <div className="ml-auto flex gap-0.5">
                {Array.from({ length: 5 }).map((_, i) => (
                  <StarIcon key={i} className="w-4 h-4 text-sage-400" />
                ))}
              </div>
            </div>
          </div>

          {/* Secondary */}
          <div className="flex flex-col gap-5">
            {rest.map((t) => (
              <div
                key={t._id}
                className="bg-white rounded-2xl p-6 border border-sage-100 flex-1"
              >
                <QuoteIcon className="w-6 h-6 text-sage-400 mb-4 opacity-60" />
                <blockquote className="text-stone-600 text-sm leading-relaxed">
                  &ldquo;{t.quote}&rdquo;
                </blockquote>
                <div className="flex items-center gap-3 mt-5 pt-4 border-t border-stone-100">
                  <div className="w-8 h-8 rounded-full bg-sage-100 flex items-center justify-center text-sage-700 text-xs font-bold shrink-0">
                    {initials(t.nombre)}
                  </div>
                  <div>
                    <p className="text-stone-900 text-sm font-semibold">{t.nombre}</p>
                    <p className="text-stone-400 text-xs">
                      {t.rol}
                      {t.ciudad ? ` · ${t.ciudad}` : ""}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

function initials(name: string): string {
  return name
    .split(/\s+/)
    .map((w) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

function QuoteIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="currentColor" viewBox="0 0 24 24">
      <path d="M14.017 21v-7.391c0-5.704 3.731-9.57 8.983-10.609l.995 2.151c-2.432.917-3.995 3.638-3.995 5.849h4v10h-9.983zm-14.017 0v-7.391c0-5.704 3.748-9.57 9-10.609l.996 2.151c-2.433.917-3.996 3.638-3.996 5.849h3.983v10h-9.983z" />
    </svg>
  );
}

function StarIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 20 20" fill="currentColor">
      <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
    </svg>
  );
}
