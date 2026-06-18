import { REGIONAL_MODELS } from "@/data/regional-models";

type RegionalBannerData = {
  title?: string | null;
  subtitle?: string | null;
};

const MODELS = Object.values(REGIONAL_MODELS);

export default function RegionalBanner({ data }: { data?: RegionalBannerData | null }) {
  const title = data?.title ?? 'Una solución para cada zona del país';
  const subtitle = data?.subtitle ?? 'Cada región tiene su propio clima. Cada modelo, sus especificaciones únicas.';

  return (
    <section className="py-20 bg-[#2F2F2F] overflow-hidden">
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
        {[...MODELS, ...MODELS].map((m, i) => (
          <div
            key={`${m.key}-${i}`}
            className="shrink-0 w-72 h-52 rounded-2xl mx-2.5 bg-[#3A3A3A] border border-sage-800/40 p-6 flex flex-col justify-between relative overflow-hidden"
          >
            {/* Subtle dot texture */}
            <div
              className="absolute inset-0 opacity-[0.03] pointer-events-none"
              style={{
                backgroundImage: "radial-gradient(circle, #D4B06A 1px, transparent 1px)",
                backgroundSize: "28px 28px",
              }}
            />

            <div className="relative flex items-center justify-between">
              <span className="text-3xl select-none">{m.icon}</span>
              <span className="text-[10px] font-bold uppercase tracking-widest text-sage-600 border border-sage-800 rounded-full px-2.5 py-0.5">
                Regional
              </span>
            </div>

            <div className="relative">
              <p className="text-xl font-bold text-white leading-tight">{m.nombre}</p>
              <div className="flex items-center justify-between mt-1.5 gap-3">
                <p className="text-sm font-medium text-sage-500">{m.region}</p>
                <p className="text-xs text-stone-400 font-semibold shrink-0">
                  USD {m.precioMin.toLocaleString("es-AR")}+
                </p>
              </div>
              {/* Gold accent bar */}
              <div className="mt-3 h-px bg-gradient-to-r from-sage-600 to-transparent" />
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
