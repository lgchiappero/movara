import { REGIONAL_MODELS } from "@/data/regional-models";

type RegionalBannerData = {
  title?: string | null;
  subtitle?: string | null;
};

const MODELS = Object.values(REGIONAL_MODELS);

// Full class strings required — Tailwind JIT can't resolve dynamic values
const STYLES: Record<string, { bg: string; border: string; accent: string }> = {
  iguazu:       { bg: "from-emerald-900 via-stone-900 to-stone-950", border: "border-emerald-800/30", accent: "text-emerald-400" },
  impenetrable: { bg: "from-orange-900 via-stone-900 to-stone-950",  border: "border-orange-800/30",  accent: "text-orange-400" },
  pampa:        { bg: "from-amber-900 via-stone-900 to-stone-950",   border: "border-amber-800/30",   accent: "text-amber-400" },
  zonda:        { bg: "from-orange-800 via-stone-900 to-stone-950",  border: "border-orange-700/30",  accent: "text-orange-300" },
  kolla:        { bg: "from-purple-900 via-stone-900 to-stone-950",  border: "border-purple-800/30",  accent: "text-purple-400" },
  tehuelche:    { bg: "from-blue-900 via-stone-900 to-stone-950",    border: "border-blue-800/30",    accent: "text-blue-400" },
  pehuen:       { bg: "from-sky-900 via-stone-900 to-stone-950",     border: "border-sky-800/30",     accent: "text-sky-400" },
  yagan:        { bg: "from-indigo-900 via-stone-900 to-stone-950",  border: "border-indigo-800/30",  accent: "text-indigo-400" },
};

export default function RegionalBanner({ data }: { data?: RegionalBannerData | null }) {
  const title = data?.title ?? 'Una solución para cada zona del país';
  const subtitle = data?.subtitle ?? 'Cada región tiene su propio clima. Cada modelo, sus especificaciones únicas.';

  return (
    <section className="py-20 bg-stone-950 overflow-hidden">
      {/* Header */}
      <div className="max-w-7xl mx-auto px-6 lg:px-8 mb-12">
        <p className="text-xs font-semibold uppercase tracking-widest text-sage-500 mb-3">
          8 modelos regionales
        </p>
        <h2 className="text-3xl sm:text-4xl font-bold text-white leading-tight">
          {title}
        </h2>
        <p className="mt-4 text-stone-400 text-base max-w-md leading-relaxed">
          {subtitle}
        </p>
      </div>

      {/* Marquee track — 8 cards × 2 for seamless loop */}
      <div
        className="flex animate-marquee"
        style={{ width: "max-content" }}
      >
        {[...MODELS, ...MODELS].map((m, i) => {
          const s = STYLES[m.key] ?? STYLES.pampa;
          return (
            <div
              key={`${m.key}-${i}`}
              className={`
                shrink-0 w-72 h-52 rounded-2xl mx-2.5
                bg-gradient-to-br ${s.bg}
                border ${s.border}
                p-6 flex flex-col justify-between
                relative overflow-hidden
              `}
            >
              {/* Dot texture */}
              <div
                className="absolute inset-0 opacity-[0.04] pointer-events-none"
                style={{
                  backgroundImage: "radial-gradient(circle, #ffffff 1px, transparent 1px)",
                  backgroundSize: "28px 28px",
                }}
              />

              <span className="relative text-3xl select-none">{m.icon}</span>

              <div className="relative">
                <p className="text-xl font-bold text-white leading-tight">{m.nombre}</p>
                <div className="flex items-center justify-between mt-1.5 gap-3">
                  <p className={`text-sm font-medium ${s.accent}`}>{m.region}</p>
                  <p className="text-xs text-stone-400 font-semibold shrink-0">
                    USD {m.precioMin.toLocaleString("es-AR")}+
                  </p>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
