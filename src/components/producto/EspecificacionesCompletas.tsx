"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Check, Plus } from "lucide-react";
import { PRODUCTO_SECCIONES, type ProductoGrupo, type ProductoResultado } from "@/data/producto";

const DORADO = "#D4B36A";

export default function EspecificacionesCompletas({
  className = "",
  dark = false,
}: {
  className?: string;
  /** Tema oscuro (#1C1C1C + dorado) usado en /producto. /modelos/flex usa el tema claro por defecto. */
  dark?: boolean;
}) {
  const [openSeccion, setOpenSeccion] = useState<string | null>(null);
  const [openGrupos, setOpenGrupos] = useState<Set<string>>(new Set());

  function toggleSeccion(numero: string) {
    setOpenSeccion((prev) => (prev === numero ? null : numero));
  }

  function toggleGrupo(key: string) {
    setOpenGrupos((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  const theme = dark
    ? {
        wrapper: "bg-[#1C1C1C] divide-y divide-white/10",
        button: "hover:bg-white/[0.03]",
        numero: "text-[#D4B36A]",
        titulo: "text-white",
        plusIdle: "border-[#D4B36A]/30 text-[#D4B36A]",
        plusOpen: "bg-[#D4B36A] border-[#D4B36A] text-[#1C1C1C]",
        descripcion: "text-stone-400",
        beneficio: "text-stone-200",
        check: "text-[#D4B36A]",
        divider: "border-white/10",
        grupoWrapper: "border-white/10",
        grupoButton: "hover:bg-white/[0.03]",
        grupoTitulo: "text-white",
        grupoPlusIdle: "border-white/20 text-stone-400",
        grupoPlusOpen: "bg-white/10 border-white/20 text-white",
        listItem: "text-stone-400",
        tablaHeader: "text-stone-300 border-white/10",
        tablaCell: "text-stone-400 border-white/10",
        barraTrack: "bg-white/10",
      }
    : {
        wrapper: "bg-white border border-stone-200 rounded-2xl divide-y divide-stone-200 overflow-hidden",
        button: "hover:bg-stone-50",
        numero: "text-sage-600",
        titulo: "text-stone-900",
        plusIdle: "border-sage-300 text-sage-600",
        plusOpen: "bg-sage-500 border-sage-500 text-white",
        descripcion: "text-stone-600",
        beneficio: "text-stone-700",
        check: "text-sage-600",
        divider: "border-stone-100",
        grupoWrapper: "border-stone-100",
        grupoButton: "hover:bg-stone-50",
        grupoTitulo: "text-stone-900",
        grupoPlusIdle: "border-stone-300 text-stone-500",
        grupoPlusOpen: "bg-stone-200 border-stone-300 text-stone-700",
        listItem: "text-stone-500",
        tablaHeader: "text-stone-600 border-stone-200",
        tablaCell: "text-stone-500 border-stone-100",
        barraTrack: "bg-stone-200",
      };

  return (
    <div className={`${theme.wrapper} ${className}`}>
      {PRODUCTO_SECCIONES.map((s) => {
        const isOpen = openSeccion === s.numero;
        return (
          <div key={s.numero}>
            <button
              type="button"
              onClick={() => toggleSeccion(s.numero)}
              className={`w-full flex items-center justify-between gap-4 px-5 py-4 text-left transition-colors ${theme.button}`}
              aria-expanded={isOpen}
            >
              <span className="flex items-center gap-3 min-w-0">
                <span className={`shrink-0 text-xs font-bold tabular-nums ${theme.numero}`}>{s.numero}</span>
                <span className={`font-bold ${theme.titulo}`}>{s.titulo}</span>
              </span>
              <span
                className={`shrink-0 w-7 h-7 rounded-full border flex items-center justify-center transition-colors ${
                  isOpen ? theme.plusOpen : theme.plusIdle
                }`}
              >
                <Plus size={16} className={`transition-transform duration-200 ${isOpen ? "rotate-45" : ""}`} />
              </span>
            </button>
            <AnimatePresence initial={false}>
              {isOpen && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.25, ease: "easeInOut" }}
                  className="overflow-hidden"
                >
                  <div className="px-5 pb-5 pt-1">
                    <p className={`text-sm leading-relaxed ${theme.descripcion}`}>{s.descripcion}</p>

                    {s.beneficios.length > 0 && (
                      <ul className="mt-4 space-y-2">
                        {s.beneficios.map((b) => (
                          <li key={b} className={`flex items-start gap-2.5 text-sm ${theme.beneficio}`}>
                            <Check className={`w-4 h-4 mt-0.5 shrink-0 ${theme.check}`} />
                            {b}
                          </li>
                        ))}
                      </ul>
                    )}

                    {s.grupos.length > 0 && (
                    <div className={`mt-4 pt-4 border-t space-y-2 ${theme.divider}`}>
                      {s.grupos.map((g) => {
                        const grupoKey = `${s.numero}-${g.id}`;
                        const grupoOpen = openGrupos.has(grupoKey);
                        return (
                          <div key={g.id} className={`border rounded-xl overflow-hidden ${theme.grupoWrapper}`}>
                            <button
                              type="button"
                              onClick={() => toggleGrupo(grupoKey)}
                              className={`w-full flex items-center justify-between gap-3 px-4 py-3 text-left transition-colors ${theme.grupoButton}`}
                              aria-expanded={grupoOpen}
                            >
                              <span className={`text-xs font-semibold uppercase tracking-wide ${theme.grupoTitulo}`}>
                                {g.titulo}
                              </span>
                              <span
                                className={`shrink-0 w-5 h-5 rounded-full border flex items-center justify-center transition-colors ${
                                  grupoOpen ? theme.grupoPlusOpen : theme.grupoPlusIdle
                                }`}
                              >
                                <Plus
                                  size={12}
                                  className={`transition-transform duration-200 ${grupoOpen ? "rotate-45" : ""}`}
                                />
                              </span>
                            </button>
                            <AnimatePresence initial={false}>
                              {grupoOpen && (
                                <motion.div
                                  initial={{ height: 0, opacity: 0 }}
                                  animate={{ height: "auto", opacity: 1 }}
                                  exit={{ height: 0, opacity: 0 }}
                                  transition={{ duration: 0.22, ease: "easeInOut" }}
                                  className="overflow-hidden"
                                >
                                  <div className="px-4 pb-4">
                                    <GrupoContenido grupo={g} theme={theme} />
                                  </div>
                                </motion.div>
                              )}
                            </AnimatePresence>
                          </div>
                        );
                      })}
                    </div>
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        );
      })}
    </div>
  );
}

type Theme = {
  listItem: string;
  tablaHeader: string;
  tablaCell: string;
  barraTrack: string;
  beneficio: string;
};

function GrupoContenido({ grupo, theme }: { grupo: ProductoGrupo; theme: Theme }) {
  if (grupo.tipo === "lista") {
    return (
      <ul className="space-y-1.5">
        {grupo.items.map((item) => (
          <li key={item} className={`text-sm leading-relaxed ${theme.listItem}`}>
            {item}
          </li>
        ))}
      </ul>
    );
  }

  if (grupo.tipo === "tabla") {
    return (
      <div className="overflow-x-auto -mx-1">
        <table className="w-full text-sm border-collapse min-w-[420px]">
          <thead>
            <tr>
              {grupo.columnas.map((col, i) => (
                <th
                  key={i}
                  className={`text-left font-semibold px-3 py-2 border-b ${theme.tablaHeader}`}
                >
                  {col}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {grupo.filas.map((fila, ri) => (
              <tr key={ri}>
                {fila.map((celda, ci) => (
                  <td key={ci} className={`px-3 py-2 border-b align-top leading-relaxed ${theme.tablaCell}`}>
                    {celda}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {grupo.items.map((item) => (
        <BarraResultado key={item.label} item={item} theme={theme} />
      ))}
    </div>
  );
}

function BarraResultado({ item, theme }: { item: ProductoResultado; theme: Theme }) {
  const pct = Math.round(Math.min(item.fraccion, 1) * 100);

  return (
    <div>
      <div className="flex items-baseline justify-between gap-3 mb-1.5 flex-wrap">
        <span className={`text-sm font-medium ${theme.beneficio}`}>{item.label}</span>
        <span className="text-xs whitespace-nowrap">
          <span className="font-bold" style={{ color: DORADO }}>
            {item.valorLabel}
          </span>
          <span className={theme.listItem}> vs {item.limiteLabel}</span>
        </span>
      </div>
      <div className={`h-2 rounded-full overflow-hidden ${theme.barraTrack}`}>
        <motion.div
          className="h-full rounded-full"
          style={{ backgroundColor: DORADO }}
          initial={{ width: 0 }}
          whileInView={{ width: `${pct}%` }}
          viewport={{ once: true }}
          transition={{ duration: 0.7, ease: "easeOut" }}
        />
      </div>
      <div className="mt-1.5 flex items-center gap-1.5 text-xs">
        <Check className="w-3.5 h-3.5 shrink-0" style={{ color: DORADO }} />
        <span className={theme.listItem}>
          Cumple la norma{item.mejora ? ` — ${item.mejora}` : ""}
        </span>
      </div>
    </div>
  );
}
