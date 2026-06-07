import Link from "next/link";

const USOS = [
  {
    emoji: "🏠",
    category: "Vivienda familiar",
    title: "Tu espacio propio, sin años de espera.",
    description:
      "Dejá de alquilar. En 60 días podés tener tu casa en el terreno que ya tenés. Sin obra tradicional, sin imprevistos.",
    href: "/modelos?tipo=familiar",
    stat: { value: "60 días", label: "entrega promedio" },
  },
  {
    emoji: "🌊",
    category: "Alquiler turístico",
    title: "Invertí hoy, rentá desde la primera temporada.",
    description:
      "Un Studio 35 en la costa puede generar hasta el 35% de retorno en la primera temporada. Capital en ladrillo con retorno acelerado.",
    href: "/modelos?tipo=turistico",
    stat: { value: "35%", label: "retorno promedio año 1" },
  },
  {
    emoji: "💼",
    category: "Oficina en casa",
    title: "Separación total hogar-trabajo, sin salir de tu terreno.",
    description:
      "Tu espacio profesional, silencioso y equipado. Recibí clientes con dignidad. Deducís el costo impositivo.",
    href: "/modelos?tipo=oficina",
    stat: { value: "45 m²", label: "mayor modelo disponible" },
  },
  {
    emoji: "📈",
    category: "Inversión",
    title: "Capital en ladrillo, retorno real.",
    description:
      "Una casa modular se valoriza con el terreno y genera ingresos mientras tanto. Una de las inversiones más sólidas en pesos.",
    href: "/modelos",
    stat: { value: "+8 años", label: "de experiencia" },
  },
];

export default function UsosPerfiles() {
  return (
    <section className="bg-sage-950 py-24">
      <div className="max-w-7xl mx-auto px-6 lg:px-8">
        <div className="text-center mb-14">
          <span className="text-sage-400 text-sm font-semibold uppercase tracking-widest">
            Para quién
          </span>
          <h2 className="mt-3 text-4xl font-bold text-white tracking-tight">
            Una solución para cada proyecto
          </h2>
          <p className="mt-4 text-stone-400 max-w-xl mx-auto">
            Nuestros modelos se adaptan a distintos objetivos. ¿En cuál te ves?
          </p>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {USOS.map(({ emoji, category, title, description, href, stat }) => (
            <Link
              key={category}
              href={href}
              className="group flex flex-col bg-sage-900/40 hover:bg-sage-800/40 border border-sage-800/60 hover:border-sage-700/60 rounded-2xl p-7 transition-all duration-300"
            >
              <span className="text-3xl mb-4">{emoji}</span>

              <span className="text-sage-400 text-xs font-semibold uppercase tracking-widest mb-2">
                {category}
              </span>

              <h3 className="text-white font-bold text-lg leading-snug mb-3">
                {title}
              </h3>

              <p className="text-stone-400 text-sm leading-relaxed flex-1">
                {description}
              </p>

              <div className="mt-6 pt-5 border-t border-sage-800/60 flex items-end justify-between">
                <div>
                  <p className="text-2xl font-bold text-sage-400">{stat.value}</p>
                  <p className="text-stone-500 text-xs mt-0.5">{stat.label}</p>
                </div>
                <span className="text-sage-500 group-hover:text-sage-300 transition-colors text-sm font-semibold">
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
