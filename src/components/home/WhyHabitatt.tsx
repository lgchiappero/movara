const FALLBACK_PILLARS = [
  {
    icon: <StructureIcon />,
    title: "Calidad constructiva",
    description:
      "Steel frame galvanizado, panel SIP y materiales con certificación A3. Cada módulo pasa por control de calidad en planta antes de salir.",
  },
  {
    icon: <ClockIcon />,
    title: "Entrega en plazo",
    description:
      "60 a 90 días desde la aprobación del diseño. Sin excusas, sin sorpresas. Lo prometemos en el contrato.",
  },
  {
    icon: <CreditIcon />,
    title: "Financiación propia",
    description:
      "Planes en pesos y dólares, adaptados a tu posibilidad. Sin bancos intermediarios. Hablamos con vos directamente.",
  },
  {
    icon: <ShieldIcon />,
    title: "Soporte post-venta",
    description:
      "5 años de garantía estructural. Atención permanente para consultas, reparaciones o ampliaciones.",
  },
];

const ICONS = [<StructureIcon key="0" />, <ClockIcon key="1" />, <CreditIcon key="2" />, <ShieldIcon key="3" />];

type PillarData = { _key?: string; title: string; description: string };
type WhyHabitattData = {
  title?: string | null;
  subtitle?: string | null;
  pillars?: PillarData[] | null;
};

export default function WhyHabitatt({ data }: { data?: WhyHabitattData | null }) {
  const title = data?.title ?? "4 pilares que nos diferencian";
  const subtitle =
    data?.subtitle ??
    "Más de 8 años construyendo casas modulares nos enseñaron que la confianza se gana con hechos, no con promesas.";

  const pillars =
    data?.pillars?.length
      ? data.pillars.map((p, i) => ({
          icon: ICONS[i] ?? ICONS[0],
          title: p.title,
          description: p.description,
        }))
      : FALLBACK_PILLARS;

  return (
    <section className="bg-sage-50 py-24">
      <div className="max-w-7xl mx-auto px-6 lg:px-8">
        <div className="text-center mb-14">
          <span className="text-sage-600 text-sm font-semibold uppercase tracking-widest">
            Por qué elegirnos
          </span>
          <h2 className="mt-3 text-4xl font-bold text-stone-900 tracking-tight">
            {title}
          </h2>
          <p className="mt-4 text-stone-500 max-w-xl mx-auto">
            {subtitle}
          </p>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {pillars.map(({ icon, title: pillarTitle, description }) => (
            <div
              key={pillarTitle}
              className="bg-white rounded-2xl p-7 border border-sage-100 hover:border-sage-200 hover:shadow-xl hover:shadow-sage-900/5 transition-all duration-300 group"
            >
              <div className="w-12 h-12 rounded-xl bg-sage-100 flex items-center justify-center text-sage-600 mb-5 group-hover:bg-sage-600 group-hover:text-white transition-colors duration-300">
                {icon}
              </div>
              <h3 className="font-bold text-stone-900 mb-2">{pillarTitle}</h3>
              <p className="text-sm text-stone-500 leading-relaxed">{description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function StructureIcon() {
  return (
    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
    </svg>
  );
}

function ClockIcon() {
  return (
    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  );
}

function CreditIcon() {
  return (
    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
    </svg>
  );
}

function ShieldIcon() {
  return (
    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
    </svg>
  );
}
