type Props = {
  className?: string;
};

const AISLACION_ROWS = [
  {
    label: "Material",
    value: "Lana de roca 75 mm",
    detail: "Paredes, techo y particiones interiores",
  },
  {
    label: "Valor R",
    value: "2.1 m²K/W",
    comparison: "60% menos transferencia de calor vs sin aislación",
    highlight: true,
  },
  {
    label: "Aislación acústica",
    value: "Absorción 0.70–0.75",
    comparison: "vs poliuretano estándar 0.40",
    highlight: true,
  },
  {
    label: "Resistencia al fuego",
    value: "Certificada",
    detail: "Lana de roca no propaga llama",
  },
];

const ABERTURAS_ROWS = [
  {
    label: "Tipo",
    value: "DVH con rotura de puente térmico",
    detail: "Aluminio de alta prestación",
  },
  {
    label: "Transmitancia",
    value: "K = 2.82 W/m²K",
    comparison: "vs vidrio simple K = 5.90 — 52% menos pérdida",
    highlight: true,
  },
  {
    label: "Reducción de ruido",
    value: "30 a 50 dB",
    detail: "Equivalent a pasar de calle intensa a silencio interior",
  },
  {
    label: "Mosquitero",
    value: "Incluido en todas",
    detail: "Sin costo adicional",
  },
  {
    label: "Condensación",
    value: "Sin condensación interior",
    detail: "Gracias al puente térmico roto",
  },
];

export default function EspecificacionesEstandar({ className = "" }: Props) {
  return (
    <div className={className}>
      <div className="flex items-center gap-3 mb-6">
        <h2 className="text-xl font-bold text-stone-900">Estándar MOVARA</h2>
        <span className="px-2.5 py-1 bg-sage-100 border border-sage-200 text-sage-700 text-xs font-semibold rounded-full">
          Incluido en todos los modelos
        </span>
      </div>

      <div className="grid md:grid-cols-2 gap-5">
        {/* Aislación */}
        <div className="rounded-2xl border border-[#E5E5E5] overflow-hidden">
          <div className="bg-stone-50 border-b border-[#E5E5E5] px-5 py-3 flex items-center gap-2">
            <span className="text-lg">🧱</span>
            <span className="text-sm font-bold text-stone-800">Aislación</span>
          </div>
          <div className="divide-y divide-stone-50">
            {AISLACION_ROWS.map((row) => (
              <div key={row.label} className="px-5 py-3.5">
                <div className="flex items-start justify-between gap-4">
                  <span className="text-xs font-semibold text-stone-400 uppercase tracking-wide min-w-[90px] mt-0.5">
                    {row.label}
                  </span>
                  <div className="text-right">
                    <span className={`text-sm font-bold ${row.highlight ? "text-sage-700" : "text-stone-700"}`}>
                      {row.value}
                    </span>
                    {row.comparison && (
                      <p className="text-[11px] text-stone-400 mt-0.5 leading-snug">{row.comparison}</p>
                    )}
                    {row.detail && !row.comparison && (
                      <p className="text-[11px] text-stone-400 mt-0.5">{row.detail}</p>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Aberturas */}
        <div className="rounded-2xl border border-[#E5E5E5] overflow-hidden">
          <div className="bg-stone-50 border-b border-[#E5E5E5] px-5 py-3 flex items-center gap-2">
            <span className="text-lg">🪟</span>
            <span className="text-sm font-bold text-stone-800">Aberturas</span>
          </div>
          <div className="divide-y divide-stone-50">
            {ABERTURAS_ROWS.map((row) => (
              <div key={row.label} className="px-5 py-3.5">
                <div className="flex items-start justify-between gap-4">
                  <span className="text-xs font-semibold text-stone-400 uppercase tracking-wide min-w-[100px] mt-0.5">
                    {row.label}
                  </span>
                  <div className="text-right">
                    <span className={`text-sm font-bold ${row.highlight ? "text-sage-700" : "text-stone-700"}`}>
                      {row.value}
                    </span>
                    {row.comparison && (
                      <p className="text-[11px] text-stone-400 mt-0.5 leading-snug">{row.comparison}</p>
                    )}
                    {row.detail && !row.comparison && (
                      <p className="text-[11px] text-stone-400 mt-0.5">{row.detail}</p>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
