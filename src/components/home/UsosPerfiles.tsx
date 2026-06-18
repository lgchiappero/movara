import Link from "next/link";

const FALLBACK_USOS = [
  {
    emoji: "🏠",
    category: "Vivienda familiar",
    title: "Tu espacio propio, sin años de espera.",
    description:
      "Dejá de alquilar. En 60 días podés tener tu casa en el terreno que ya tenés. Sin obra tradicional, sin imprevistos.",
    href: "/modelos?tipo=familiar",
    statValue: "60 días",
    statLabel: "entrega promedio",
  },
  {
    emoji: "🌊",
    category: "Alquiler turístico",
    title: "Invertí hoy, rentá desde la primera temporada.",
    description:
      "Un Studio 35 en la costa puede generar hasta el 35% de retorno en la primera temporada. Capital en ladrillo con retorno acelerado.",
    href: "/modelos?tipo=turistico",
    statValue: "35%",
    statLabel: "retorno promedio año 1",
  },
  {
    emoji: "💼",
    category: "Oficina en casa",
    title: "Separación total hogar-trabajo, sin salir de tu terreno.",
    description:
      "Tu espacio profesional, silencioso y equipado. Recibí clientes con dignidad. Deducís el costo impositivo.",
    href: "/modelos?tipo=oficina",
    statValue: "45 m²",
    statLabel: "mayor modelo disponible",
  },
  {
    emoji: "📈",
    category: "Inversión",
    title: "Capital en ladrillo, retorno real.",
    description:
      "Una casa modular se valoriza con el terreno y genera ingresos mientras tanto. Una de las inversiones más sólidas en pesos.",
    href: "/modelos",
    statValue: "+8 años",
    statLabel: "de experiencia",
  },
];

type UsoItem = {
  _key?: string;
  emoji?: string | null;
  category?: string | null;
  title?: string | null;
  description?: string | null;
  href?: string | null;
  statValue?: string | null;
  statLabel?: string | null;
};

type UsosData = {
  title?: string | null;
  subtitle?: string | null;
  items?: UsoItem[] | null;
};

export default function UsosPerfiles({ data }: { data?: UsosData | null }) {
  const title = data?.title ?? "Una solución para cada proyecto";
  const subtitle =
    data?.subtitle ?? "Nuestros modelos se adaptan a distintos objetivos. ¿En cuál te ves?";

  const usos = data?.items?.length
    ? data.items.map((item) => ({
        emoji: item.emoji ?? "🏠",
        category: item.category ?? "",
        title: item.title ?? "",
        description: item.description ?? "",
        href: item.href ?? "/modelos",
        statValue: item.statValue ?? "",
        statLabel: item.statLabel ?? "",
      }))
    : FALLBACK_USOS;

  return (
    <section className="bg-[#F2F2F2] py-24">
      <div className="max-w-7xl mx-auto px-6 lg:px-8">
        <div className="text-center mb-14">
          <span className="text-sage-500 text-sm font-semibold uppercase tracking-widest">
            Para quién
          </span>
          <h2 className="mt-3 text-4xl font-bold text-[#2F2F2F] tracking-tight">
            {title}
          </h2>
          <p className="mt-4 text-stone-500 max-w-xl mx-auto">
            {subtitle}
          </p>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {usos.map(({ emoji, category, title: usoTitle, description, href, statValue, statLabel }) => (
            <Link
              key={category}
              href={href}
              className="group flex flex-col bg-white hover:bg-sage-50 border border-[#E5E5E5] hover:border-sage-300 rounded-2xl p-7 transition-all duration-300 hover:shadow-lg hover:shadow-sage-900/5"
            >
              <span className="text-3xl mb-4">{emoji}</span>

              <span className="text-sage-500 text-xs font-semibold uppercase tracking-widest mb-2">
                {category}
              </span>

              <h3 className="text-[#2F2F2F] font-bold text-lg leading-snug mb-3">
                {usoTitle}
              </h3>

              <p className="text-stone-500 text-sm leading-relaxed flex-1">
                {description}
              </p>

              <div className="mt-6 pt-5 border-t border-[#E5E5E5] flex items-end justify-between">
                <div>
                  <p className="text-2xl font-bold text-sage-500">{statValue}</p>
                  <p className="text-stone-400 text-xs mt-0.5">{statLabel}</p>
                </div>
                <span className="text-sage-400 group-hover:text-sage-600 transition-colors text-sm font-semibold">
                  Ver modelos →
                </span>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
