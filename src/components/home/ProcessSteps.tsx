const FALLBACK_STEPS = [
  {
    number: "01",
    icon: <HouseIcon />,
    title: "Elegís tu modelo",
    description:
      "Explorá el catálogo, filtrá por tipo de uso y elegí el modelo que más se adapta a tu proyecto y presupuesto.",
  },
  {
    number: "02",
    icon: <SlidersIcon />,
    title: "Configurás los detalles",
    description:
      "Cantidad de habitaciones, cocina, baño, terminaciones y colores. Nuestro equipo te asesora en cada decisión.",
  },
  {
    number: "03",
    icon: <TruckIcon />,
    title: "Coordinamos la instalación",
    description:
      "Fabricamos en planta, coordinamos el transporte y gestionamos todos los trámites de habilitación municipal.",
  },
  {
    number: "04",
    icon: <KeyIcon />,
    title: "Recibís tu casa",
    description:
      "Llave en mano, lista para usar. Con planos aprobados, instalaciones funcionando y garantía escrita.",
  },
];

const STEP_ICONS = [<HouseIcon key="0" />, <SlidersIcon key="1" />, <TruckIcon key="2" />, <KeyIcon key="3" />];

type StepData = { _key?: string; title: string; description: string };
type ProcessData = {
  title?: string | null;
  subtitle?: string | null;
  steps?: StepData[] | null;
};

export default function ProcessSteps({ data }: { data?: ProcessData | null }) {
  const title = data?.title ?? "Simple. Transparente. Sin sorpresas.";
  const subtitle =
    data?.subtitle ??
    "Cuatro pasos desde que elegís hasta que recibís las llaves. En promedio, 60 a 90 días corridos.";

  const steps =
    data?.steps?.length
      ? data.steps.map((s, i) => ({
          number: String(i + 1).padStart(2, "0"),
          icon: STEP_ICONS[i] ?? STEP_ICONS[0],
          title: s.title,
          description: s.description,
        }))
      : FALLBACK_STEPS;

  return (
    <section id="proceso" className="bg-white py-24">
      <div className="max-w-7xl mx-auto px-6 lg:px-8">
        <div className="text-center mb-16">
          <span className="text-sage-600 text-sm font-semibold uppercase tracking-widest">
            El proceso
          </span>
          <h2 className="mt-3 text-4xl font-bold text-stone-900 tracking-tight">
            {title}
          </h2>
          <p className="mt-4 text-stone-500 max-w-lg mx-auto">
            {subtitle}
          </p>
        </div>

        {/* Steps grid */}
        <div className="relative">
          {/* Connector line desktop */}
          <div className="hidden lg:block absolute top-7 left-[calc(12.5%+2rem)] right-[calc(12.5%+2rem)] h-px bg-gradient-to-r from-sage-200 via-sage-300 to-sage-200" />

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-10 lg:gap-6">
            {steps.map(({ number, icon, title: stepTitle, description }) => (
              <div key={number} className="flex flex-col items-center text-center">
                {/* Step circle */}
                <div className="relative z-10 w-14 h-14 rounded-full bg-sage-600 flex items-center justify-center text-white mb-6 shrink-0 shadow-lg shadow-sage-600/20">
                  {icon}
                </div>

                <span className="text-sage-400 text-xs font-bold tracking-widest uppercase mb-2">
                  Paso {number}
                </span>
                <h3 className="text-lg font-bold text-stone-900 mb-3">{stepTitle}</h3>
                <p className="text-sm text-stone-500 leading-relaxed max-w-xs">
                  {description}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* Timeline badge */}
        <div className="mt-14 flex justify-center">
          <div className="inline-flex items-center gap-3 bg-sage-50 border border-sage-200 rounded-full px-6 py-3 text-sm text-stone-600">
            <span className="w-2 h-2 rounded-full bg-sage-500 shrink-0" />
            Tiempo total estimado:
            <strong className="text-stone-900">60 a 90 días corridos</strong>
          </div>
        </div>
      </div>
    </section>
  );
}

function HouseIcon() {
  return (
    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
    </svg>
  );
}

function SlidersIcon() {
  return (
    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
    </svg>
  );
}

function TruckIcon() {
  return (
    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path d="M9 17a2 2 0 11-4 0 2 2 0 014 0zM19 17a2 2 0 11-4 0 2 2 0 014 0z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M13 16V6a1 1 0 00-1-1H4a1 1 0 00-1 1v10l2 0M13 16l2 0m0 0l0-5 3 3 2 0 0 2M3 16h2" />
    </svg>
  );
}

function KeyIcon() {
  return (
    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
    </svg>
  );
}
