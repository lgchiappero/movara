"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { PRODUCTO_EXTRAS } from "@/data/producto";
import { getWhatsAppUrl } from "@/lib/whatsapp";
import EspecificacionesCompletas from "@/components/producto/EspecificacionesCompletas";

export default function ProductoPageClient() {
  const waHref = getWhatsAppUrl(
    "Hola MOVARA! Quiero más información sobre las especificaciones técnicas del MOVARA Flex.",
  );

  return (
    <div className="bg-[#1C1C1C] text-stone-300" style={{ fontFamily: "var(--font-montserrat)" }}>
      {/* Hero */}
      <section className="pt-28 pb-16 px-4 sm:px-6 lg:px-8 border-b border-white/10">
        <div className="max-w-4xl mx-auto text-center">
          <motion.p
            initial={{ opacity: 0, y: 12 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="text-xs font-semibold uppercase tracking-widest text-[#D4B36A] mb-4"
          >
            Ficha técnica
          </motion.p>
          <motion.h1
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.05 }}
            className="text-4xl lg:text-5xl font-bold text-white tracking-tight"
          >
            MOVARA Flex — Especificaciones técnicas
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="mt-4 text-lg text-stone-400 max-w-2xl mx-auto"
          >
            Datos técnicos reales, verificados por ingeniería. Cada material, cada capa, cada certificación — sin letra chica.
          </motion.p>
        </div>
      </section>

      {/* Secciones */}
      <EspecificacionesCompletas dark className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* 10. Extras y personalización */}
        <motion.section
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.5 }}
          className="py-12 border-t border-white/10"
        >
          <div className="flex items-start gap-5">
            <span className="shrink-0 w-12 h-12 rounded-xl bg-[#D4B36A]/10 border border-[#D4B36A]/30 flex items-center justify-center text-[#D4B36A] font-bold text-sm">
              10
            </span>
            <div className="flex-1 min-w-0">
              <h2 className="text-2xl font-bold text-white">Extras y personalización</h2>
              <p className="mt-3 text-stone-400 leading-relaxed">
                Configurá tu MOVARA según tu proyecto y tu presupuesto.
              </p>
              <div className="mt-6 grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {PRODUCTO_EXTRAS.map((e) => (
                  <div
                    key={e.texto}
                    className="flex items-center justify-between gap-4 py-3.5 px-4 border border-white/10 rounded-xl"
                  >
                    <span className="text-sm text-stone-200">{e.texto}</span>
                    <span className="text-sm font-bold text-[#D4B36A] whitespace-nowrap">{e.precio}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </motion.section>
      </div>

      {/* CTA final */}
      <motion.section
        initial={{ opacity: 0, y: 24 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-80px" }}
        transition={{ duration: 0.5 }}
        className="border-t border-white/10 py-20 px-4 sm:px-6 lg:px-8"
      >
        <div className="max-w-2xl mx-auto text-center">
          <h2 className="text-3xl font-bold text-white">¿Querés ver todo esto en persona?</h2>
          <p className="mt-4 text-stone-400 leading-relaxed">
            Nuestro showroom está en camino en Sunchales, Santa Fe. Mientras tanto, configurá tu MOVARA o
            consultanos directamente.
          </p>
          <div className="mt-8 flex flex-col sm:flex-row gap-3 justify-center">
            <Link
              href="/configurador"
              className="px-8 py-3.5 bg-[#D4B36A] hover:bg-[#BF9D52] text-[#1C1C1C] font-bold rounded-xl transition-all duration-200 hover:shadow-lg hover:shadow-[#D4B36A]/25 hover:-translate-y-0.5"
            >
              Configurar mi MOVARA
            </Link>
            <a
              href={waHref}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-2 px-8 py-3.5 border border-white/20 hover:border-white/40 text-white font-semibold rounded-xl transition-colors"
            >
              <WhatsAppIcon className="w-5 h-5 text-green-500" />
              Consultar por WhatsApp
            </a>
          </div>
        </div>
      </motion.section>
    </div>
  );
}

function WhatsAppIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="currentColor" viewBox="0 0 24 24">
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
    </svg>
  );
}
