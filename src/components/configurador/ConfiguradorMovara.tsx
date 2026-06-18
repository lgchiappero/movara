"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import { REGIONAL_MODELS, PROVINCIA_A_MODELO, PROVINCIAS_AR, getModeloKey } from "@/data/regional-models";

// ─────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────

const MOVARA_MODELS = [
  {
    key: "10ft" as const,
    nombre: "MOVARA 10ft",
    superficie: 18,
    tagline: "Studio, espacio mínimo o módulo independiente",
    precio: { min: 15_000, max: 20_000 },
    maxHab: 1,
  },
  {
    key: "20ft" as const,
    nombre: "MOVARA 20ft",
    superficie: 37,
    tagline: "El más versátil — 1 o 2 ambientes",
    precio: { min: 22_000, max: 30_000 },
    maxHab: 2,
    badge: "Más elegido",
  },
  {
    key: "40ft" as const,
    nombre: "MOVARA 40ft",
    superficie: 74,
    tagline: "Máximo espacio — familia o inversión grande",
    precio: { min: 35_000, max: 50_000 },
    maxHab: 3,
  },
] as const;

const FINALIDADES = [
  { key: "inversor", emoji: "💰", label: "Inversor", desc: "Transformá capital en renta en semanas", subdesc: "Airbnb, renta, glamping" },
  { key: "agro", emoji: "🌾", label: "Agro / Campo", desc: "Infraestructura lista para tu campo, sin meses de obra", subdesc: "Vivienda o infraestructura rural" },
  { key: "vivienda", emoji: "🏠", label: "Primera vivienda", desc: "Una nueva forma de habitar", subdesc: "Tu hogar propio" },
  { key: "turismo", emoji: "🏕️", label: "Turismo y hospitalidad", desc: "Eco resort, glamping o expansión rápida", subdesc: "Eco resort, glamping" },
  { key: "empresa", emoji: "💼", label: "Empresa / B2B", desc: "Oficinas, campamentos o infraestructura corporativa", subdesc: "Corporativo o industrial" },
  { key: "sector-publico", emoji: "🏛️", label: "Sector público", desc: "Vivienda social o infraestructura municipal", subdesc: "Municipal o social" },
] as const;

type Upgrade = { key: string; icon: string; nombre: string; descripcion: string; recomendado?: boolean; soloModelos?: string[] };

const UNIVERSAL_UPGRADES: Upgrade[] = [
  {
    key: "panel-100",
    icon: "🧱",
    nombre: "Panel lana de roca 100mm",
    descripcion: "Valor R: 2.8 m²K/W — 33% más que el estándar 75mm. Mantiene temperatura interior estable hasta −15°C exterior. Recomendado para Patagonia, Cordillera, NOA y TDF.",
  },
  {
    key: "triple-vidrio",
    icon: "🪟",
    nombre: "Triple vidrio (TDH)",
    descripcion: "Transmitancia: 0.5–0.7 W/m²K vs DVH estándar 1.0–1.2 W/m²K — 50% más eficiente. Elimina condensación incluso en invierno extremo.",
  },
  {
    key: "balcon-delantero",
    icon: "🏗️",
    nombre: "Balcón delantero",
    descripcion: "Amplía el espacio exterior habitable. Disponible para todos los modelos. Ideal para uso turístico y vivienda.",
  },
  {
    key: "balcon-lateral",
    icon: "🏗️",
    nombre: "Balcón lateral",
    descripcion: "Espacio exterior de acceso lateral. Solo disponible para modelos 20ft y 40ft (superficie mayor a 18m²).",
    soloModelos: ["20ft", "40ft"],
  },
  {
    key: "kit-solar",
    icon: "⚡",
    nombre: "Kit solar básico",
    descripcion: "2 paneles 400W + inversor. Reducción estimada de factura eléctrica: 40–60%. Disponible para todos los modelos.",
  },
];

const UPGRADES_BY_REGION: Record<string, Upgrade[]> = {
  pampa: [
    { key: "pu75", icon: "🧱", nombre: "Panel PU 75mm", descripcion: "Mejor aislación térmica para los inviernos y veranos de la llanura pampeana", recomendado: true },
    { key: "dvh", icon: "🪟", nombre: "DVH doble vidrio", descripcion: "Reduce pérdida de calor en 50% y elimina condensación en ventanas", recomendado: true },
    { key: "split", icon: "❄️", nombre: "Split inverter frío/calor", descripcion: "Climatización eficiente para las 4 estaciones de la zona pampeana" },
  ],
  impenetrable: [
    { key: "techo-ventilado", icon: "☀️", nombre: "Techo ventilado reflectivo", descripcion: "Reduce hasta 12°C la temperatura interior en los veranos extremos del Chaco", recomendado: true },
    { key: "pintura-termo", icon: "🎨", nombre: "Pintura termorreflejante", descripcion: "Refleja la radiación solar y reduce el consumo de aire acondicionado", recomendado: true },
    { key: "solar", icon: "⚡", nombre: "Paneles solares", descripcion: "Aprovechá la alta irradiación solar del norte con generación propia" },
    { key: "filtros", icon: "🌫️", nombre: "Filtros anti-polvo", descripcion: "Protección para ventilación y equipment en zonas con vientos de tierra" },
  ],
  iguazu: [
    { key: "vmc", icon: "💨", nombre: "VMC — Ventilación mecánica", descripcion: "Controla humedad y evita condensación en el clima húmedo de Mesopotamia", recomendado: true },
    { key: "barrera-vapor", icon: "💧", nombre: "Barrera de vapor reforzada", descripcion: "Protege la estructura de la humedad extrema del litoral", recomendado: true },
    { key: "pintura-anti", icon: "🛡️", nombre: "Pintura anticorrosiva", descripcion: "Protección extra para estructuras metálicas en ambientes húmedos" },
  ],
  zonda: [
    { key: "anclaje", icon: "⚓", nombre: "Anclaje anti-vuelco M16", descripcion: "Anclaje reforzado para resistir el viento Zonda de hasta 180 km/h", recomendado: true },
    { key: "epdm", icon: "🔒", nombre: "Sellado EPDM perimetral", descripcion: "Sello especial anti-polvo y anti-viento para los vientos áridos de Cuyo" },
    { key: "solar-cuyo", icon: "⚡", nombre: "Paneles solares", descripcion: "Alta irradiación solar en Cuyo: ideal para generación fotovoltaica propia", recomendado: true },
  ],
  kolla: [
    { key: "pu100-noa", icon: "🧱", nombre: "Panel PU 100mm", descripcion: "Aislación superior para la gran amplitud térmica diaria del NOA andino", recomendado: true },
    { key: "aluminio", icon: "✨", nombre: "Aluminio anodizado", descripcion: "Protección contra la radiación UV intensa de la altura y el clima seco" },
    { key: "solar-off-grid", icon: "🔋", nombre: "Sistema solar off-grid completo", descripcion: "Autonomía energética para zonas con provisión eléctrica irregular", recomendado: true },
  ],
  tehuelche: [
    { key: "pu100-pat", icon: "🧱", nombre: "Panel PU 100mm", descripcion: "Aislación reforzada para los inviernos fríos de la estepa patagónica", recomendado: true },
    { key: "triple-teh", icon: "🪟", nombre: "Triple vidrio", descripcion: "Aislación térmica máxima para temperaturas bajo cero y vientos intensos", recomendado: true },
    { key: "anclaje-pat", icon: "⚓", nombre: "Anclaje reforzado", descripcion: "Estructura preparada para ráfagas de hasta 180 km/h en la Patagonia" },
  ],
  pehuen: [
    { key: "techo-aguas", icon: "🏔️", nombre: "Techo a dos aguas", descripcion: "Pendiente 45° para evacuación eficiente de nieve — imprescindible en cordillera", recomendado: true },
    { key: "madera", icon: "🌲", nombre: "Revestimiento en madera", descripcion: "Estética andina y aislación natural extra para el clima cordillerano" },
    { key: "triple-peh", icon: "🪟", nombre: "Triple vidrio PVC", descripcion: "Máxima aislación para los inviernos más fríos y nevosos de los Andes", recomendado: true },
  ],
  yagan: [
    { key: "pu120", icon: "🧱", nombre: "Panel PU 120mm", descripcion: "La mayor aislación disponible — imprescindible para Tierra del Fuego", recomendado: true },
    { key: "triple-yag", icon: "🪟", nombre: "Triple vidrio hermético", descripcion: "Elimina pérdidas de calor y condensación en temperaturas extremas", recomendado: true },
    { key: "calefaccion", icon: "🔥", nombre: "Calefacción central", descripcion: "Sistema de calefacción de alto rendimiento para inviernos bajo cero" },
  ],
};

type ModeloKey = (typeof MOVARA_MODELS)[number]["key"];
type FinalidadKey = (typeof FINALIDADES)[number]["key"];
type TipoCocina = "electrico" | "gas";
type TipoAgua = "calefon-electrico" | "termotanque-gas";
type TipoLavarropas = "sin" | "bano" | "cocina" | "externo";
type TipoCliente = "particular" | "empresa";

type ConfiguradorPageData = {
  paso1?: { title?: string | null; subtitle?: string | null; modelo10ft?: string | null; modelo20ft?: string | null; modelo40ft?: string | null } | null;
  paso2?: { title?: string | null; subtitle?: string | null; descInversor?: string | null; descAgro?: string | null; descVivienda?: string | null; descTurismo?: string | null; descEmpresa?: string | null; descSectorPublico?: string | null } | null;
  paso3?: { title?: string | null; subtitle?: string | null; localidadLabel?: string | null; provinciaLabel?: string | null } | null;
  resultado?: { title?: string | null; waButtonText?: string | null; trustText?: string | null } | null;
};

// ─────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────

const LABELS_AGUA: Record<TipoAgua, string> = {
  "calefon-electrico": "calefón eléctrico",
  "termotanque-gas": "espacio termotanque a gas",
};

const LABELS_LAVA: Record<TipoLavarropas, string> = {
  sin: "sin espacio para lavarropas",
  bano: "lavarropas en baño",
  cocina: "lavarropas en cocina",
  externo: "espacio externo con desagüe",
};

function isValidEmail(e: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e.trim());
}

function buildWAMessage(params: {
  modelo: ModeloKey;
  finalidad: FinalidadKey;
  localidad: string;
  provincia: string;
  habitaciones: number;
  incluyeCocina: boolean;
  tipoCocina: TipoCocina;
  incluyeBano: boolean;
  tipoAgua: TipoAgua;
  lavarropas: TipoLavarropas;
  upgradesSeleccionados: string[];
  regionalKey: string;
  tipoCliente: TipoCliente;
  nombre: string;
  razonSocial: string;
  nombreContacto: string;
  telefono: string;
  email: string;
}): string {
  const m = MOVARA_MODELS.find((x) => x.key === params.modelo)!;
  const f = FINALIDADES.find((x) => x.key === params.finalidad)!;
  const loc = [params.localidad.trim(), params.provincia].filter(Boolean).join(", ");

  const cocinaTxt = params.incluyeCocina
    ? `cocina con ${params.tipoCocina === "electrico" ? "anafe eléctrico" : "preparación gas"}`
    : "sin cocina";
  const banoTxt = params.incluyeBano ? `baño con ${LABELS_AGUA[params.tipoAgua]}` : "sin baño";
  const lavaTxt = LABELS_LAVA[params.lavarropas];

  const regional = REGIONAL_MODELS[params.regionalKey];
  const allUpgrades = [...UNIVERSAL_UPGRADES, ...(UPGRADES_BY_REGION[params.regionalKey] ?? [])];
  const selectedUpgradeNames = params.upgradesSeleccionados
    .map((k) => allUpgrades.find((u) => u.key === k)?.nombre)
    .filter(Boolean);

  const clienteNombre = params.tipoCliente === "particular" ? params.nombre : params.razonSocial;

  return (
    `Hola MOVARA! 👋\n\n` +
    `👤 Cliente: ${clienteNombre}\n` +
    (params.tipoCliente === "empresa" ? `🏢 Contacto: ${params.nombreContacto}\n` : "") +
    `📞 Teléfono: ${params.telefono}\n` +
    `📧 Email: ${params.email}\n\n` +
    `📦 Modelo: ${m.nombre} — ${m.superficie}m²\n` +
    `🎯 Uso: ${f.label}\n` +
    `📍 Ubicación: ${loc || "(no especificada)"}\n` +
    `🏠 Configuración: ${params.habitaciones} hab., ${cocinaTxt}, ${banoTxt}, ${lavaTxt}\n` +
    (selectedUpgradeNames.length
      ? `⚙️ Mejoras a cotizar: ${selectedUpgradeNames.join(", ")}\n`
      : `⚙️ Zona climática: ${regional?.region ?? params.regionalKey}\n`) +
    `💰 Precio base estimado: USD ${m.precio.min.toLocaleString("es-AR")} – ${m.precio.max.toLocaleString("es-AR")}\n\n` +
    `Quedo a la espera de su presupuesto. Gracias!`
  );
}

// ─────────────────────────────────────────────────────────
// Main component
// ─────────────────────────────────────────────────────────

const STEP_LABELS = ["Modelo", "Finalidad", "Ubicación", "Configuración", "Mejoras", "Datos", "Resultado"] as const;
const VALID_MODELO_KEYS = new Set(MOVARA_MODELS.map((m) => m.key));

export default function ConfiguradorMovara({
  data,
  preselectedModelo,
}: {
  data?: ConfiguradorPageData | null;
  preselectedModelo?: string;
}) {
  const validPreselected =
    preselectedModelo && VALID_MODELO_KEYS.has(preselectedModelo as ModeloKey)
      ? (preselectedModelo as ModeloKey)
      : null;

  const cms = {
    paso1: {
      title: data?.paso1?.title ?? "¿Qué tamaño necesitás?",
      subtitle: data?.paso1?.subtitle ?? "Cada módulo es un contenedor de alta prestación. Elegí según tu proyecto.",
      taglines: { "10ft": data?.paso1?.modelo10ft ?? null, "20ft": data?.paso1?.modelo20ft ?? null, "40ft": data?.paso1?.modelo40ft ?? null } as Record<string, string | null>,
    },
    paso2: {
      title: data?.paso2?.title ?? "¿Para qué lo vas a usar?",
      subtitle: data?.paso2?.subtitle ?? "El uso define la configuración interior y el tipo de asesoramiento que te damos.",
      descs: { inversor: data?.paso2?.descInversor ?? null, agro: data?.paso2?.descAgro ?? null, vivienda: data?.paso2?.descVivienda ?? null, turismo: data?.paso2?.descTurismo ?? null, empresa: data?.paso2?.descEmpresa ?? null, "sector-publico": data?.paso2?.descSectorPublico ?? null } as Record<string, string | null>,
    },
    paso3: {
      title: data?.paso3?.title ?? "¿Dónde lo instalás?",
      subtitle: data?.paso3?.subtitle ?? "Cada zona del país tiene requerimientos técnicos distintos. Los calculamos automáticamente.",
      localidadLabel: data?.paso3?.localidadLabel ?? "Localidad",
      provinciaLabel: data?.paso3?.provinciaLabel ?? "Provincia",
    },
    resultado: {
      title: data?.resultado?.title ?? "Listo. Así queda tu MOVARA.",
      waButtonText: data?.resultado?.waButtonText ?? "Enviar por WhatsApp",
      trustText: data?.resultado?.trustText ?? "Sin cargo. Respondemos en menos de 2 horas.",
    },
  };

  // Paso 1–6
  const [step, setStep] = useState<1 | 2 | 3 | 4 | 5 | 6>(1);
  const [slideDir, setSlideDir] = useState<1 | -1>(1);
  const [modelo, setModelo] = useState<ModeloKey | null>(validPreselected);
  const [finalidad, setFinalidad] = useState<FinalidadKey | null>(null);
  const [localidad, setLocalidad] = useState("");
  const [provincia, setProvincia] = useState("");

  // Paso 4
  const [habitaciones, setHabitaciones] = useState<1 | 2 | 3>(1);
  const [incluyeCocina, setIncluyeCocina] = useState(true);
  const [tipoCocina, setTipoCocina] = useState<TipoCocina>("electrico");
  const [incluyeBano, setIncluyeBano] = useState(true);
  const [tipoAgua, setTipoAgua] = useState<TipoAgua>("calefon-electrico");
  const [lavarropas, setLavarropas] = useState<TipoLavarropas>("sin");

  // Paso 5
  const [upgradesSeleccionados, setUpgradesSeleccionados] = useState<Set<string>>(new Set());

  // Paso 6
  const [tipoCliente, setTipoCliente] = useState<TipoCliente>("particular");
  const [nombre, setNombre] = useState("");
  const [razonSocial, setRazonSocial] = useState("");
  const [nombreContacto, setNombreContacto] = useState("");
  const [telefono, setTelefono] = useState("");
  const [email, setEmail] = useState("");

  // Result
  const [showResult, setShowResult] = useState(false);
  const [waMessage, setWaMessage] = useState("");

  const maxHab = modelo ? MOVARA_MODELS.find((m) => m.key === modelo)!.maxHab : 3;

  const regionalKey = getModeloKey(provincia, localidad);
  const regional = REGIONAL_MODELS[regionalKey] ?? null;

  const step6Valid =
    tipoCliente === "particular"
      ? nombre.trim() !== "" && telefono.trim() !== "" && isValidEmail(email)
      : razonSocial.trim() !== "" && nombreContacto.trim() !== "" && telefono.trim() !== "" && isValidEmail(email);

  const canNext =
    (step === 1 && modelo !== null) ||
    (step === 2 && finalidad !== null) ||
    (step === 3 && provincia !== "") ||
    step === 4 ||
    step === 5 ||
    (step === 6 && step6Valid);

  function goNext() {
    if (step < 6) {
      setSlideDir(1);
      setStep((s) => (s + 1) as 2 | 3 | 4 | 5 | 6);
    } else {
      const msg = buildWAMessage({
        modelo: modelo!,
        finalidad: finalidad!,
        localidad,
        provincia,
        habitaciones,
        incluyeCocina,
        tipoCocina,
        incluyeBano,
        tipoAgua,
        lavarropas,
        upgradesSeleccionados: Array.from(upgradesSeleccionados),
        regionalKey,
        tipoCliente,
        nombre,
        razonSocial,
        nombreContacto,
        telefono,
        email,
      });
      setWaMessage(msg);
      setShowResult(true);
    }
  }

  function goBack() {
    if (showResult) {
      setShowResult(false);
    } else if (step > 1) {
      setSlideDir(-1);
      setStep((s) => (s - 1) as 1 | 2 | 3 | 4 | 5 | 6);
    }
  }

  function handleSendWA() {
    const number = process.env.NEXT_PUBLIC_WHATSAPP_NUMBER ?? "5491100000000";
    window.open(`https://wa.me/${number}?text=${encodeURIComponent(waMessage)}`, "_blank", "noopener,noreferrer");
  }

  function toggleUpgrade(key: string) {
    setUpgradesSeleccionados((prev) => {
      const next = new Set(prev);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });
  }

  if (showResult) {
    return (
      <main className="min-h-screen bg-stone-50 pt-16">
        <div className="bg-[#2F2F2F] px-6 pt-14 pb-10 text-center">
          <span className="text-sage-400 text-xs font-semibold uppercase tracking-[0.2em]">Paso 7 de 7 — Tu configuración</span>
          <h1 className="text-3xl font-bold text-white mt-2">{cms.resultado.title}</h1>
          <p className="text-stone-400 mt-2 text-sm">Revisá el mensaje y enviánoslo por WhatsApp para arrancar.</p>
        </div>
        <div className="max-w-2xl mx-auto px-6 py-10">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
            <ResultScreen
              modelo={modelo!}
              finalidad={finalidad!}
              localidad={localidad}
              provincia={provincia}
              regional={regional}
              habitaciones={habitaciones}
              incluyeCocina={incluyeCocina}
              tipoCocina={tipoCocina}
              incluyeBano={incluyeBano}
              tipoAgua={tipoAgua}
              lavarropas={lavarropas}
              upgradesSeleccionados={Array.from(upgradesSeleccionados)}
              regionalKey={regionalKey}
              waMessage={waMessage}
              setWaMessage={setWaMessage}
              onBack={goBack}
              onSend={handleSendWA}
              waButtonText={cms.resultado.waButtonText}
              trustText={cms.resultado.trustText}
            />
          </motion.div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-stone-50 pt-16">
      <div className="bg-[#2F2F2F] px-6 pt-14 pb-10 text-center">
        <span className="text-sage-400 text-xs font-semibold uppercase tracking-[0.2em]">Configurador</span>
        <h1 className="text-3xl sm:text-4xl font-bold text-white mt-2 tracking-tight">Diseñá tu MOVARA</h1>
        <p className="text-stone-400 mt-2 text-sm">7 pasos para encontrar el módulo ideal y recibir un presupuesto por WhatsApp.</p>
      </div>

      <div className="max-w-2xl mx-auto px-6 py-10">
        {/* Progress */}
        <div className="mb-10">
          <div className="flex gap-1.5 mb-3">
            {([1, 2, 3, 4, 5, 6, 7] as const).map((n) => (
              <div key={n} className="flex-1 h-1.5 rounded-full bg-stone-200 overflow-hidden">
                <div className="h-full rounded-full bg-sage-500 transition-all duration-500" style={{ width: n <= step ? "100%" : "0%" }} />
              </div>
            ))}
          </div>
          <div className="flex justify-between">
            {STEP_LABELS.map((label, i) => (
              <span key={label} className={`text-[10px] font-semibold transition-colors ${i + 1 <= step ? "text-sage-500" : "text-stone-400"}`}>
                {label}
              </span>
            ))}
          </div>
        </div>

        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={step}
            initial={{ opacity: 0, x: slideDir * 30 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: slideDir * -30 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
          >
            {step === 1 && <StepModelo modelo={modelo} onSelect={setModelo} title={cms.paso1.title} subtitle={cms.paso1.subtitle} taglines={cms.paso1.taglines} />}
            {step === 2 && <StepFinalidad finalidad={finalidad} onSelect={setFinalidad} title={cms.paso2.title} subtitle={cms.paso2.subtitle} descs={cms.paso2.descs} />}
            {step === 3 && <StepUbicacion localidad={localidad} setLocalidad={setLocalidad} provincia={provincia} setProvincia={setProvincia} regional={regional} title={cms.paso3.title} subtitle={cms.paso3.subtitle} localidadLabel={cms.paso3.localidadLabel} provinciaLabel={cms.paso3.provinciaLabel} />}
            {step === 4 && <StepConfiguracion modelo={modelo} habitaciones={habitaciones} setHabitaciones={setHabitaciones} maxHab={maxHab} incluyeCocina={incluyeCocina} setIncluyeCocina={setIncluyeCocina} tipoCocina={tipoCocina} setTipoCocina={setTipoCocina} incluyeBano={incluyeBano} setIncluyeBano={setIncluyeBano} tipoAgua={tipoAgua} setTipoAgua={setTipoAgua} lavarropas={lavarropas} setLavarropas={setLavarropas} />}
            {step === 5 && <StepMejoras regionalKey={regionalKey} regional={regional} modelo={modelo} upgradesSeleccionados={upgradesSeleccionados} onToggle={toggleUpgrade} />}
            {step === 6 && <StepDatos tipoCliente={tipoCliente} setTipoCliente={setTipoCliente} nombre={nombre} setNombre={setNombre} razonSocial={razonSocial} setRazonSocial={setRazonSocial} nombreContacto={nombreContacto} setNombreContacto={setNombreContacto} telefono={telefono} setTelefono={setTelefono} email={email} setEmail={setEmail} />}
          </motion.div>
        </AnimatePresence>

        {/* Navigation */}
        <div className="flex items-center justify-between mt-10 pt-6 border-t border-stone-200">
          {step > 1 ? (
            <button type="button" onClick={goBack} className="flex items-center gap-1.5 px-4 py-2.5 text-stone-500 hover:text-stone-800 text-sm font-semibold transition-colors">
              <ChevronLeftIcon /> Atrás
            </button>
          ) : (
            <Link href="/" className="flex items-center gap-1.5 px-4 py-2.5 text-stone-400 hover:text-stone-600 text-sm font-semibold transition-colors">
              <ChevronLeftIcon /> Inicio
            </Link>
          )}
          <button
            type="button"
            onClick={goNext}
            disabled={!canNext}
            className="flex items-center gap-2 px-8 py-3 bg-sage-500 hover:bg-sage-600 disabled:opacity-35 disabled:cursor-not-allowed text-white text-sm font-bold rounded-full transition-all duration-200 hover:shadow-lg hover:shadow-sage-500/25 hover:-translate-y-px"
          >
            {step === 6 ? "Ver mi configuración" : "Siguiente"}
            <ChevronRightIcon />
          </button>
        </div>
      </div>
    </main>
  );
}

// ─────────────────────────────────────────────────────────
// Step 1 — Modelo + carrusel placeholder
// ─────────────────────────────────────────────────────────

function PhotoCarousel({ slides }: { slides: number }) {
  const [current, setCurrent] = useState(0);
  return (
    <div className="mt-3 rounded-xl overflow-hidden border border-stone-100">
      <div className="relative bg-stone-100 h-36 flex items-center justify-center">
        <div className="flex flex-col items-center gap-2 text-stone-400">
          <CameraIcon />
          <span className="text-xs font-medium">Foto próximamente</span>
          <span className="text-[10px] text-stone-300">{current + 1} / {slides}</span>
        </div>
        {slides > 1 && (
          <>
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); setCurrent((c) => (c - 1 + slides) % slides); }}
              className="absolute left-2 top-1/2 -translate-y-1/2 w-7 h-7 rounded-full bg-white/80 hover:bg-white flex items-center justify-center shadow-sm transition-colors"
            >
              <ChevronLeftIcon />
            </button>
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); setCurrent((c) => (c + 1) % slides); }}
              className="absolute right-2 top-1/2 -translate-y-1/2 w-7 h-7 rounded-full bg-white/80 hover:bg-white flex items-center justify-center shadow-sm transition-colors"
            >
              <ChevronRightIcon />
            </button>
          </>
        )}
      </div>
      <div className="flex justify-center gap-1.5 py-2 bg-white">
        {Array.from({ length: slides }).map((_, i) => (
          <button key={i} type="button" onClick={(e) => { e.stopPropagation(); setCurrent(i); }} className={`w-1.5 h-1.5 rounded-full transition-colors ${i === current ? "bg-sage-500" : "bg-stone-300"}`} />
        ))}
      </div>
    </div>
  );
}

function StepModelo({ modelo, onSelect, title, subtitle, taglines }: {
  modelo: ModeloKey | null;
  onSelect: (k: ModeloKey) => void;
  title: string;
  subtitle: string;
  taglines: Record<string, string | null>;
}) {
  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-widest text-sage-500 mb-2">Paso 1 de 7</p>
      <h2 className="text-2xl font-bold text-stone-900 mb-1">{title}</h2>
      <p className="text-stone-500 text-sm mb-8">{subtitle}</p>
      <div className="space-y-4">
        {MOVARA_MODELS.map((m) => {
          const selected = modelo === m.key;
          return (
            <div key={m.key} className={`rounded-2xl border-2 transition-all duration-200 overflow-hidden ${selected ? "border-sage-500 shadow-md shadow-sage-500/10" : "border-stone-200 bg-white hover:border-sage-300 hover:shadow-sm"}`}>
              <button type="button" onClick={() => onSelect(m.key)} className="w-full text-left p-5 cursor-pointer">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2.5 mb-1">
                      <span className={`text-xl font-bold tracking-tight ${selected ? "text-sage-800" : "text-stone-900"}`}>{m.nombre}</span>
                      {"badge" in m && <span className="px-2 py-0.5 bg-sage-500 text-white text-[10px] font-bold uppercase tracking-wide rounded-full">{m.badge}</span>}
                    </div>
                    <p className={`text-sm ${selected ? "text-stone-600" : "text-stone-500"}`}>{taglines[m.key] ?? m.tagline}</p>
                  </div>
                  <div className={`shrink-0 flex flex-col items-center justify-center rounded-xl w-20 py-3 transition-colors ${selected ? "bg-sage-100" : "bg-stone-100"}`}>
                    <ModuleIcon size={m.key} selected={selected} />
                    <span className={`text-lg font-bold mt-1 ${selected ? "text-sage-700" : "text-stone-700"}`}>{m.superficie}m²</span>
                  </div>
                </div>
                <div className="mt-4 flex items-center justify-between">
                  <span className={`text-xs font-semibold ${selected ? "text-sage-500" : "text-stone-400"}`}>
                    USD {m.precio.min.toLocaleString("es-AR")} – {m.precio.max.toLocaleString("es-AR")}
                  </span>
                  {selected && <span className="w-5 h-5 rounded-full bg-sage-500 flex items-center justify-center"><CheckIcon className="w-3 h-3 text-white" /></span>}
                </div>
              </button>
              <div className="px-5 pb-5">
                <PhotoCarousel slides={3} />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────
// Step 2 — Finalidad
// ─────────────────────────────────────────────────────────

function StepFinalidad({ finalidad, onSelect, title, subtitle, descs }: {
  finalidad: FinalidadKey | null;
  onSelect: (k: FinalidadKey) => void;
  title: string;
  subtitle: string;
  descs: Record<string, string | null>;
}) {
  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-widest text-sage-500 mb-2">Paso 2 de 7</p>
      <h2 className="text-2xl font-bold text-stone-900 mb-1">{title}</h2>
      <p className="text-stone-500 text-sm mb-8">{subtitle}</p>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {FINALIDADES.map((f) => {
          const selected = finalidad === f.key;
          return (
            <button key={f.key} type="button" onClick={() => onSelect(f.key)} className={`text-left rounded-xl border-2 p-4 transition-all duration-200 cursor-pointer ${selected ? "border-sage-500 bg-sage-50 shadow-md shadow-sage-500/10" : "border-stone-200 bg-white hover:border-sage-300 hover:shadow-sm"}`}>
              <span className="text-3xl block mb-3">{f.emoji}</span>
              <p className={`text-sm font-bold leading-tight ${selected ? "text-sage-800" : "text-stone-800"}`}>{f.label}</p>
              <p className={`text-xs mt-1 leading-snug ${selected ? "text-stone-600" : "text-stone-400"}`}>{descs[f.key] ?? f.desc}</p>
              {selected && <span className="mt-2 inline-flex w-4 h-4 rounded-full bg-sage-500 items-center justify-center"><CheckIcon className="w-2.5 h-2.5 text-white" /></span>}
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────
// Step 3 — Ubicación
// ─────────────────────────────────────────────────────────

function StepUbicacion({ localidad, setLocalidad, provincia, setProvincia, regional, title, subtitle, localidadLabel, provinciaLabel }: {
  localidad: string;
  setLocalidad: (v: string) => void;
  provincia: string;
  setProvincia: (v: string) => void;
  regional: (typeof REGIONAL_MODELS)[string] | null;
  title: string;
  subtitle: string;
  localidadLabel: string;
  provinciaLabel: string;
}) {
  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-widest text-sage-500 mb-2">Paso 3 de 7</p>
      <h2 className="text-2xl font-bold text-stone-900 mb-1">{title}</h2>
      <p className="text-stone-500 text-sm mb-8">{subtitle}</p>
      <div className="space-y-5">
        <div>
          <label htmlFor="cfg-localidad" className="block text-sm font-semibold text-stone-700 mb-1.5">{localidadLabel}</label>
          <input id="cfg-localidad" type="text" value={localidad} onChange={(e) => setLocalidad(e.target.value)} placeholder="Ej: Rosario, Mendoza, Bariloche…" maxLength={100} className="w-full px-4 py-3 rounded-xl border border-stone-200 hover:border-stone-300 focus:border-sage-400 focus:ring-2 focus:ring-sage-400/20 outline-none text-stone-900 text-sm placeholder:text-stone-400 transition-colors bg-white" />
        </div>
        <div>
          <label htmlFor="cfg-provincia" className="block text-sm font-semibold text-stone-700 mb-1.5">{provinciaLabel} <span className="text-sage-500">*</span></label>
          <select id="cfg-provincia" value={provincia} onChange={(e) => setProvincia(e.target.value)} className="w-full px-4 py-3 rounded-xl border border-stone-200 hover:border-stone-300 focus:border-sage-400 focus:ring-2 focus:ring-sage-400/20 outline-none text-stone-900 text-sm transition-colors bg-white">
            <option value="">Seleccioná una provincia</option>
            {PROVINCIAS_AR.map((p) => <option key={p} value={p}>{p}</option>)}
          </select>
        </div>
        <AnimatePresence initial={false}>
          {regional && (
            <motion.div key={regional.key} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }} transition={{ duration: 0.2 }} className="rounded-xl border border-sage-200 bg-sage-50 p-4">
              <div className="flex items-start gap-3">
                <span className="text-2xl shrink-0">{regional.icon}</span>
                <div>
                  <p className="text-sm font-semibold text-stone-800">Zona climática: {regional.region}</p>
                  <p className="text-xs text-stone-500 mt-0.5 leading-relaxed">{regional.tagline}</p>
                  <div className="mt-2 space-y-1">
                    {regional.extras.slice(0, 3).map((extra) => (
                      <div key={extra} className="flex items-center gap-1.5 text-xs text-stone-600">
                        <span className="w-3.5 h-3.5 rounded-full bg-sage-200 text-sage-700 flex items-center justify-center text-[9px] font-bold shrink-0">✓</span>
                        {extra}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────
// Step 4 — Configuración del espacio
// ─────────────────────────────────────────────────────────

function ToggleGroup<T extends string>({ value, onChange, options }: { value: T; onChange: (v: T) => void; options: { value: T; label: string }[] }) {
  return (
    <div className="flex gap-2 flex-wrap">
      {options.map((opt) => (
        <button key={opt.value} type="button" onClick={() => onChange(opt.value)} className={`px-4 py-2 rounded-lg text-sm font-semibold border-2 transition-all ${value === opt.value ? "border-sage-500 bg-sage-50 text-sage-800" : "border-stone-200 bg-white text-stone-600 hover:border-sage-300"}`}>
          {opt.label}
        </button>
      ))}
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-2xl border border-[#E5E5E5] p-5">
      <p className="text-xs font-bold uppercase tracking-widest text-stone-400 mb-4">{title}</p>
      <div className="space-y-4">{children}</div>
    </div>
  );
}

function Field({ label, children }: { label: React.ReactNode; children: React.ReactNode }) {
  return (
    <div>
      <p className="text-sm font-semibold text-stone-700 mb-2">{label}</p>
      {children}
    </div>
  );
}

function StepConfiguracion({ modelo, habitaciones, setHabitaciones, maxHab, incluyeCocina, setIncluyeCocina, tipoCocina, setTipoCocina, incluyeBano, setIncluyeBano, tipoAgua, setTipoAgua, lavarropas, setLavarropas }: {
  modelo: ModeloKey | null;
  habitaciones: 1 | 2 | 3;
  setHabitaciones: (v: 1 | 2 | 3) => void;
  maxHab: number;
  incluyeCocina: boolean;
  setIncluyeCocina: (v: boolean) => void;
  tipoCocina: TipoCocina;
  setTipoCocina: (v: TipoCocina) => void;
  incluyeBano: boolean;
  setIncluyeBano: (v: boolean) => void;
  tipoAgua: TipoAgua;
  setTipoAgua: (v: TipoAgua) => void;
  lavarropas: TipoLavarropas;
  setLavarropas: (v: TipoLavarropas) => void;
}) {
  const habOpts = ([1, 2, 3] as const).filter((n) => n <= maxHab).map((n) => ({ value: String(n), label: `${n} hab.` }));

  const preview = [
    modelo ? `Módulo ${modelo}` : null,
    `${habitaciones} habitación${habitaciones > 1 ? "es" : ""}`,
    incluyeCocina ? `cocina con ${tipoCocina === "electrico" ? "anafe eléctrico" : "preparación gas"}` : "sin cocina",
    incluyeBano ? `baño con ${LABELS_AGUA[tipoAgua]}` : "sin baño",
    LABELS_LAVA[lavarropas],
  ].filter(Boolean).join(", ");

  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-widest text-sage-500 mb-2">Paso 4 de 7</p>
      <h2 className="text-2xl font-bold text-stone-900 mb-1">Configurá tu espacio</h2>
      <p className="text-stone-500 text-sm mb-6">Personalizá el interior de tu módulo según tus necesidades.</p>

      <div className="space-y-4">
        <Section title="Ambientes">
          <Field label="Cantidad de habitaciones">
            <ToggleGroup value={String(habitaciones)} onChange={(v) => setHabitaciones(Number(v) as 1 | 2 | 3)} options={habOpts} />
          </Field>
          <Field label="¿Incluye cocina?">
            <ToggleGroup value={incluyeCocina ? "si" : "no"} onChange={(v) => setIncluyeCocina(v === "si")} options={[{ value: "si", label: "Sí" }, { value: "no", label: "No" }]} />
          </Field>
          <Field label="¿Incluye baño?">
            <ToggleGroup value={incluyeBano ? "si" : "no"} onChange={(v) => setIncluyeBano(v === "si")} options={[{ value: "si", label: "Sí" }, { value: "no", label: "No" }]} />
          </Field>
        </Section>

        {incluyeCocina && (
          <Section title="Cocina">
            <Field label="Tipo de cocina">
              <ToggleGroup value={tipoCocina} onChange={setTipoCocina} options={[{ value: "electrico", label: "Anafe eléctrico" }, { value: "gas", label: "Preparación gas" }]} />
              <p className="text-xs text-stone-400 mt-1.5">{tipoCocina === "gas" ? "El cliente instala su propia cocina a gas." : "Anafe de inducción incluido en el módulo."}</p>
            </Field>
          </Section>
        )}

        <Section title="Agua caliente">
          <Field label="Sistema de agua caliente">
            <ToggleGroup value={tipoAgua} onChange={setTipoAgua} options={[{ value: "calefon-electrico", label: "Calefón eléctrico" }, { value: "termotanque-gas", label: "Espacio termotanque gas" }]} />
          </Field>
        </Section>

        <Section title="Lavarropas">
          <Field label="Instalación">
            <div className="grid grid-cols-2 gap-2">
              {([
                { value: "sin" as TipoLavarropas, label: "Sin espacio" },
                { value: "bano" as TipoLavarropas, label: "En el baño" },
                { value: "cocina" as TipoLavarropas, label: "En la cocina" },
                { value: "externo" as TipoLavarropas, label: "Espacio externo" },
              ]).map((opt) => (
                <button key={opt.value} type="button" onClick={() => setLavarropas(opt.value)} className={`px-3 py-2.5 rounded-lg text-sm font-semibold border-2 text-left transition-all ${lavarropas === opt.value ? "border-sage-500 bg-sage-50 text-sage-800" : "border-stone-200 bg-white text-stone-600 hover:border-sage-300"}`}>
                  {opt.label}
                </button>
              ))}
            </div>
            {lavarropas === "externo" && <p className="text-xs text-stone-400 mt-1.5">Incluye desagüe y conexión eléctrica en espacio cubierto.</p>}
          </Field>
        </Section>

        {/* Live preview */}
        <div className="bg-sage-50 border border-sage-200 rounded-xl p-4">
          <p className="text-[10px] font-bold uppercase tracking-widest text-sage-600 mb-1">Vista previa</p>
          <p className="text-sm text-stone-700 leading-relaxed">{preview}</p>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────
// Step 5 — Mejoras por región
// ─────────────────────────────────────────────────────────

function UpgradeCard({ upgrade, selected, onToggle }: { upgrade: Upgrade; selected: boolean; onToggle: () => void }) {
  return (
    <div className={`rounded-2xl border-2 transition-all duration-200 overflow-hidden ${selected ? "border-sage-500 shadow-sm shadow-sage-500/10" : "border-[#E5E5E5] bg-white hover:border-sage-300"}`}>
      <button type="button" onClick={onToggle} className="w-full text-left p-5 cursor-pointer">
        <div className="flex items-start gap-4">
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 text-xl transition-colors ${selected ? "bg-sage-100" : "bg-stone-100"}`}>
            {upgrade.icon}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className={`text-sm font-bold ${selected ? "text-sage-800" : "text-stone-800"}`}>{upgrade.nombre}</span>
              {upgrade.recomendado && <span className="px-2 py-0.5 bg-sage-500 text-white text-[10px] font-bold uppercase tracking-wide rounded-full">Recomendado</span>}
            </div>
            <p className="text-xs text-stone-500 mt-0.5 leading-relaxed">{upgrade.descripcion}</p>
          </div>
          <div className={`w-5 h-5 rounded-md border-2 shrink-0 flex items-center justify-center transition-all mt-0.5 ${selected ? "bg-sage-500 border-sage-500" : "border-stone-300 bg-white"}`}>
            {selected && <CheckIcon className="w-3 h-3 text-white" />}
          </div>
        </div>
      </button>
      <div className="px-5 pb-5">
        <PhotoCarousel slides={2} />
      </div>
    </div>
  );
}

function StepMejoras({ regionalKey, regional, modelo, upgradesSeleccionados, onToggle }: {
  regionalKey: string;
  regional: (typeof REGIONAL_MODELS)[string] | null;
  modelo: ModeloKey | null;
  upgradesSeleccionados: Set<string>;
  onToggle: (key: string) => void;
}) {
  const regionalUpgrades = UPGRADES_BY_REGION[regionalKey] ?? [];
  const universalFiltered = UNIVERSAL_UPGRADES.filter(
    (u) => !u.soloModelos || (modelo && u.soloModelos.includes(modelo))
  );

  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-widest text-sage-500 mb-2">Paso 5 de 7</p>
      <h2 className="text-2xl font-bold text-stone-900 mb-1">Mejoras recomendadas para tu zona</h2>
      <p className="text-stone-500 text-sm mb-6">Seleccioná las que querés cotizar — no son obligatorias.</p>

      {/* Universal upgrades */}
      <div className="mb-2">
        <p className="text-xs font-bold uppercase tracking-widest text-stone-400 mb-3">Disponibles para todos los modelos</p>
        <div className="space-y-3">
          {universalFiltered.map((upgrade) => (
            <UpgradeCard key={upgrade.key} upgrade={upgrade} selected={upgradesSeleccionados.has(upgrade.key)} onToggle={() => onToggle(upgrade.key)} />
          ))}
        </div>
      </div>

      {/* Regional upgrades */}
      {regional && regionalUpgrades.length > 0 && (
        <div className="mt-6">
          <div className="flex items-center gap-2 mb-3">
            <p className="text-xs font-bold uppercase tracking-widest text-stone-400">Específicas para tu zona</p>
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-sage-50 border border-sage-200 rounded-full">
              <span className="text-sm">{regional.icon}</span>
              <span className="text-xs font-semibold text-sage-700">{regional.region}</span>
            </div>
          </div>
          <div className="space-y-3">
            {regionalUpgrades.map((upgrade) => (
              <UpgradeCard key={upgrade.key} upgrade={upgrade} selected={upgradesSeleccionados.has(upgrade.key)} onToggle={() => onToggle(upgrade.key)} />
            ))}
          </div>
        </div>
      )}

      {!regional && (
        <div className="mt-4 bg-stone-50 border border-stone-200 rounded-xl p-4 text-center">
          <p className="text-stone-400 text-sm">Completá tu provincia en el paso anterior para ver también las mejoras específicas de tu zona climática.</p>
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────
// Step 6 — Tus datos
// ─────────────────────────────────────────────────────────

const INPUT_CLS = "w-full px-4 py-3 rounded-xl border border-stone-200 hover:border-stone-300 focus:border-sage-400 focus:ring-2 focus:ring-sage-400/20 outline-none text-stone-900 text-sm placeholder:text-stone-400 transition-colors bg-white";

function StepDatos({
  tipoCliente, setTipoCliente,
  nombre, setNombre,
  razonSocial, setRazonSocial,
  nombreContacto, setNombreContacto,
  telefono, setTelefono,
  email, setEmail,
}: {
  tipoCliente: TipoCliente;
  setTipoCliente: (v: TipoCliente) => void;
  nombre: string; setNombre: (v: string) => void;
  razonSocial: string; setRazonSocial: (v: string) => void;
  nombreContacto: string; setNombreContacto: (v: string) => void;
  telefono: string; setTelefono: (v: string) => void;
  email: string; setEmail: (v: string) => void;
}) {
  const emailTouched = email.length > 0;
  const emailValid = isValidEmail(email);

  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-widest text-sage-500 mb-2">Paso 6 de 7</p>
      <h2 className="text-2xl font-bold text-stone-900 mb-1">Tus datos</h2>
      <p className="text-stone-500 text-sm mb-6">Completá tus datos para que podamos preparar tu presupuesto personalizado.</p>

      <div className="space-y-4">
        {/* Tipo de cliente */}
        <Section title="Tipo de cliente">
          <Field label="¿Cómo consultás?">
            <ToggleGroup<TipoCliente>
              value={tipoCliente}
              onChange={setTipoCliente}
              options={[
                { value: "particular", label: "Particular" },
                { value: "empresa", label: "Empresa" },
              ]}
            />
          </Field>
        </Section>

        {/* Campos según tipo */}
        {tipoCliente === "particular" ? (
          <Section title="Datos personales">
            <Field label={<>Nombre y apellido <span className="text-sage-500">*</span></>}>
              <input
                type="text"
                value={nombre}
                onChange={(e) => setNombre(e.target.value)}
                placeholder="Ej: Juan García"
                maxLength={100}
                className={INPUT_CLS}
              />
            </Field>
            <Field label={<>Teléfono de contacto <span className="text-sage-500">*</span></>}>
              <input
                type="tel"
                value={telefono}
                onChange={(e) => setTelefono(e.target.value)}
                placeholder="Ej: +54 9 11 1234-5678"
                maxLength={30}
                className={INPUT_CLS}
              />
            </Field>
            <Field label={<>Email <span className="text-sage-500">*</span></>}>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="tu@email.com"
                maxLength={150}
                className={`${INPUT_CLS} ${emailTouched && !emailValid ? "border-red-300 focus:border-red-400 focus:ring-red-400/20" : ""}`}
              />
              {emailTouched && !emailValid && (
                <p className="text-xs text-red-500 mt-1">Ingresá un email válido</p>
              )}
            </Field>
          </Section>
        ) : (
          <Section title="Datos de la empresa">
            <Field label={<>Razón social <span className="text-sage-500">*</span></>}>
              <input
                type="text"
                value={razonSocial}
                onChange={(e) => setRazonSocial(e.target.value)}
                placeholder="Ej: Constructora Ejemplo S.A."
                maxLength={150}
                className={INPUT_CLS}
              />
            </Field>
            <Field label={<>Nombre de contacto <span className="text-sage-500">*</span></>}>
              <input
                type="text"
                value={nombreContacto}
                onChange={(e) => setNombreContacto(e.target.value)}
                placeholder="Ej: María López"
                maxLength={100}
                className={INPUT_CLS}
              />
            </Field>
            <Field label={<>Teléfono de contacto <span className="text-sage-500">*</span></>}>
              <input
                type="tel"
                value={telefono}
                onChange={(e) => setTelefono(e.target.value)}
                placeholder="Ej: +54 9 11 1234-5678"
                maxLength={30}
                className={INPUT_CLS}
              />
            </Field>
            <Field label={<>Email <span className="text-sage-500">*</span></>}>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="contacto@empresa.com"
                maxLength={150}
                className={`${INPUT_CLS} ${emailTouched && !emailValid ? "border-red-300 focus:border-red-400 focus:ring-red-400/20" : ""}`}
              />
              {emailTouched && !emailValid && (
                <p className="text-xs text-red-500 mt-1">Ingresá un email válido</p>
              )}
            </Field>
          </Section>
        )}

        <p className="text-xs text-stone-400 text-center">
          Campos con <span className="text-sage-500 font-semibold">*</span> son obligatorios. Tus datos solo se usan para preparar tu presupuesto.
        </p>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────
// Result screen — Paso 7
// ─────────────────────────────────────────────────────────

function ResultScreen({ modelo, finalidad, localidad, provincia, regional, habitaciones, incluyeCocina, tipoCocina, incluyeBano, tipoAgua, lavarropas, upgradesSeleccionados, regionalKey, waMessage, setWaMessage, onBack, onSend, waButtonText, trustText }: {
  modelo: ModeloKey;
  finalidad: FinalidadKey;
  localidad: string;
  provincia: string;
  regional: (typeof REGIONAL_MODELS)[string] | null;
  habitaciones: number;
  incluyeCocina: boolean;
  tipoCocina: TipoCocina;
  incluyeBano: boolean;
  tipoAgua: TipoAgua;
  lavarropas: TipoLavarropas;
  upgradesSeleccionados: string[];
  regionalKey: string;
  waMessage: string;
  setWaMessage: (v: string) => void;
  onBack: () => void;
  onSend: () => void;
  waButtonText: string;
  trustText: string;
}) {
  const m = MOVARA_MODELS.find((x) => x.key === modelo)!;
  const f = FINALIDADES.find((x) => x.key === finalidad)!;
  const loc = [localidad.trim(), provincia].filter(Boolean).join(", ");
  const allUpgrades = [...UNIVERSAL_UPGRADES, ...(UPGRADES_BY_REGION[regionalKey] ?? [])];
  const selectedUpgrades = upgradesSeleccionados.map((k) => allUpgrades.find((u) => u.key === k)).filter(Boolean) as Upgrade[];

  return (
    <div className="space-y-6">
      {/* Summary chips */}
      <div className="flex flex-wrap gap-2">
        <Chip icon="📦" text={`${m.nombre} — ${m.superficie}m²`} />
        <Chip icon={f.emoji} text={f.label} />
        {loc && <Chip icon="📍" text={loc} />}
        {regional && <Chip icon={regional.icon} text={regional.region} />}
      </div>

      {/* Configuration summary */}
      <div className="bg-white rounded-2xl border border-[#E5E5E5] p-5 space-y-3">
        <p className="text-xs font-bold uppercase tracking-widest text-stone-400">Configuración del espacio</p>
        <div className="grid grid-cols-2 gap-y-2 text-sm">
          <span className="text-stone-400">Habitaciones</span><span className="text-stone-800 font-semibold">{habitaciones}</span>
          <span className="text-stone-400">Cocina</span><span className="text-stone-800 font-semibold">{incluyeCocina ? (tipoCocina === "electrico" ? "Anafe eléctrico" : "Preparación gas") : "No incluye"}</span>
          <span className="text-stone-400">Baño</span><span className="text-stone-800 font-semibold">{incluyeBano ? "Incluido" : "No incluye"}</span>
          <span className="text-stone-400">Agua caliente</span><span className="text-stone-800 font-semibold">{incluyeBano ? LABELS_AGUA[tipoAgua] : "—"}</span>
          <span className="text-stone-400">Lavarropas</span><span className="text-stone-800 font-semibold capitalize">{LABELS_LAVA[lavarropas]}</span>
        </div>
      </div>

      {/* Selected upgrades */}
      {selectedUpgrades.length > 0 && (
        <div className="bg-white rounded-2xl border border-[#E5E5E5] p-5">
          <p className="text-xs font-bold uppercase tracking-widest text-stone-400 mb-3">Mejoras seleccionadas</p>
          <div className="space-y-2">
            {selectedUpgrades.map((u) => (
              <div key={u.key} className="flex items-center gap-3 text-sm">
                <span>{u.icon}</span>
                <span className="text-stone-800 font-medium">{u.nombre}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Price */}
      <div className="bg-[#2F2F2F] rounded-2xl p-6 text-center">
        <p className="text-xs uppercase tracking-widest text-stone-500 mb-2">Precio base estimado</p>
        <p className="text-3xl font-bold text-white">
          USD {m.precio.min.toLocaleString("es-AR")}
          <span className="text-stone-400 text-xl font-normal mx-2">–</span>
          {m.precio.max.toLocaleString("es-AR")}
        </p>
        <p className="text-xs text-stone-500 mt-2">Incluye fabricación, transporte e instalación estándar</p>
      </div>

      {/* WA message editor */}
      <div>
        <label className="block text-sm font-semibold text-stone-700 mb-1.5">Vista previa del mensaje de WhatsApp</label>
        <p className="text-xs text-stone-400 mb-2">Podés editarlo antes de enviar.</p>
        <textarea value={waMessage} onChange={(e) => setWaMessage(e.target.value)} rows={10} className="w-full px-4 py-3 rounded-xl border border-stone-200 focus:border-sage-400 focus:ring-2 focus:ring-sage-400/20 outline-none text-stone-800 text-sm font-mono leading-relaxed resize-none transition-colors bg-stone-50" />
      </div>

      {/* CTAs */}
      <div className="space-y-3 pb-4">
        <button type="button" onClick={onSend} className="w-full flex items-center justify-center gap-2.5 py-4 bg-[#25D366] hover:bg-[#1fba58] text-white font-bold text-sm rounded-xl transition-all duration-200 hover:shadow-xl hover:shadow-green-500/25 hover:-translate-y-0.5">
          <WhatsAppIcon className="w-5 h-5" />
          {waButtonText}
        </button>
        <p className="text-center text-xs text-stone-400">{trustText}</p>
        <button type="button" onClick={onBack} className="w-full py-3 border border-stone-200 hover:border-stone-300 text-stone-500 hover:text-stone-700 text-sm font-semibold rounded-xl transition-colors">
          Modificar configuración
        </button>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────
// Micro components
// ─────────────────────────────────────────────────────────

function Chip({ icon, text }: { icon: string; text: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-stone-200 rounded-full text-xs font-semibold text-stone-700">
      <span>{icon}</span>{text}
    </span>
  );
}

function ModuleIcon({ size, selected }: { size: ModeloKey; selected: boolean }) {
  const color = selected ? "#BF9A52" : "#a8a29e";
  const widths: Record<ModeloKey, number> = { "10ft": 28, "20ft": 44, "40ft": 60 };
  const w = widths[size];
  return (
    <svg width={w} height={28} viewBox={`0 0 ${w} 28`} fill="none">
      <rect x="1" y="6" width={w - 2} height="21" rx="2" stroke={color} strokeWidth="1.5" />
      <polyline points={`1,6 ${w / 2},1 ${w - 1},6`} stroke={color} strokeWidth="1.5" strokeLinejoin="round" />
      {size !== "10ft" && <line x1={w / 2} y1="6" x2={w / 2} y2="27" stroke={color} strokeWidth="1" />}
    </svg>
  );
}

function CameraIcon() {
  return (
    <svg className="w-8 h-8 text-stone-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M6.827 6.175A2.31 2.31 0 015.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 00-1.134-.175 2.31 2.31 0 01-1.64-1.055l-.822-1.316a2.192 2.192 0 00-1.736-1.039 48.774 48.774 0 00-5.232 0 2.192 2.192 0 00-1.736 1.039l-.821 1.316z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 12.75a4.5 4.5 0 11-9 0 4.5 4.5 0 019 0zM18.75 10.5h.008v.008h-.008V10.5z" />
    </svg>
  );
}

function CheckIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
    </svg>
  );
}

function ChevronLeftIcon() {
  return (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
    </svg>
  );
}

function ChevronRightIcon() {
  return (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
    </svg>
  );
}

function WhatsAppIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="currentColor" viewBox="0 0 24 24">
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
    </svg>
  );
}
