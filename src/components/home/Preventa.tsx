"use client";

import { motion } from "framer-motion";
import { Shield, Layers, Thermometer, Eye } from "lucide-react";
import CuposBar from "@/components/ui/CuposBar";

type Beneficio = { _key?: string; titulo: string; descripcion: string };

type PreventaContent = {
  badgeEscasez?: string;
  titulo?: string;
  subtitulo?: string;
  totalUnidades?: number;
  unidadesReservadas?: number;
  textoCierre?: string;
  beneficios?: Beneficio[];
};

const DEFAULT_BENEFICIOS: Beneficio[] = [
  { titulo: "Precio de lanzamiento", descripcion: "Bloqueás el precio actual antes de cualquier ajuste de mercado." },
  { titulo: "Prioridad de producción", descripcion: "Tu unidad entra primero en la línea de fabricación." },
  { titulo: "Asesoramiento privado", descripcion: "Acceso a equipo técnico dedicado y dossier completo exclusivo." },
];

const CERT_CARDS = [
  {
    icon: Shield,
    titulo: "Certificación CE",
    descripcion: "Estándar europeo de conformidad",
  },
  {
    icon: Layers,
    titulo: "Estructura Q235B",
    descripcion: "Acero grado industrial",
  },
  {
    icon: Thermometer,
    titulo: "Lana de roca 75mm",
    descripcion: "Aislación térmica y acústica superior",
  },
  {
    icon: Eye,
    titulo: "DVH con RPT",
    descripcion: "Aberturas de aluminio con DVH (doble vidriado hermético) y RPT (rotura de puente térmico)",
  },
];

export default function Preventa({ content }: { content?: PreventaContent | null }) {
  const TOTAL = content?.totalUnidades ?? 20;
  const RESERVADAS = content?.unidadesReservadas ?? 7;

  return (
    <section id="preventa" className="py-32 bg-[#1A1A1A]">
      <div className="max-w-4xl mx-auto px-6 lg:px-8 text-center">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
        >
          <h2 className="text-4xl sm:text-5xl font-bold text-white leading-tight mb-6">
            {content?.titulo ? (
              content.titulo
            ) : (
              <>Primeras {TOTAL} unidades<br />en condiciones de lanzamiento.</>
            )}
          </h2>

          <p className="text-stone-400 text-lg max-w-xl mx-auto mb-4 leading-relaxed">
            {content?.subtitulo ??
              "Nuestro modelo siempre opera en preventa — hoy con precio especial de lanzamiento para los primeros clientes."}
          </p>
          <p className="text-stone-600 text-sm max-w-sm mx-auto mb-10 leading-relaxed">
            Una vez agotadas las condiciones de lanzamiento, el precio y los tiempos de entrega pasan al estándar de mercado abierto.
          </p>

          {/* Progress */}
          <div className="mb-10">
            <CuposBar total={TOTAL} reservadas={RESERVADAS} />
          </div>

          {/* Benefits */}
          <div className="grid sm:grid-cols-3 gap-4 mb-10 text-left">
            {(content?.beneficios?.length ? content.beneficios : DEFAULT_BENEFICIOS).map((b) => (
              <div key={b._key ?? b.titulo} className="bg-white/5 rounded-xl p-6 border border-white/10 text-left">
                <div className="w-6 h-6 rounded-full bg-[#D4B06A]/20 flex items-center justify-center mb-4">
                  <span className="text-[#D4B06A] text-xs font-bold">✓</span>
                </div>
                <p className="text-white text-sm font-semibold mb-1.5">{b.titulo}</p>
                <p className="text-stone-500 text-xs leading-relaxed">{b.descripcion}</p>
              </div>
            ))}
          </div>

          {/* Certification cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-14">
            {CERT_CARDS.map(({ icon: Icon, titulo, descripcion }, i) => (
              <motion.div
                key={titulo}
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.4, delay: i * 0.07 }}
                className="bg-[#2F2F2F] border border-[#D4B06A]/20 rounded-2xl p-5 text-left hover:border-[#D4B06A]/40 hover:bg-[#353535] transition-all duration-200"
              >
                <Icon size={48} className="text-[#D4B06A] mb-4" strokeWidth={1.25} />
                <p className="text-white font-bold text-sm mb-1 leading-snug">{titulo}</p>
                <p className="text-stone-500 text-xs leading-relaxed">{descripcion}</p>
              </motion.div>
            ))}
          </div>

          <a
            href="#dossier"
            className="inline-flex items-center gap-2 px-9 py-4 bg-[#D4B06A] hover:bg-[#BF9A52] text-[#1A1A1A] font-bold rounded-xl transition-all duration-200 hover:shadow-2xl hover:shadow-[#D4B06A]/20 hover:-translate-y-0.5 text-sm tracking-wide"
          >
            {content?.textoCierre ?? "Quiero mi precio de lanzamiento"}
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
            </svg>
          </a>
        </motion.div>
      </div>
    </section>
  );
}
