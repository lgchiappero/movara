"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion, animate, useMotionValue } from "framer-motion";
import { A_CONSULTAR, LEYENDA_PRECIOS, formatUSD } from "@/data/precios-extras";
import type { PrecioResumen } from "@/lib/precio-configurador";

export type { PrecioAdicional, PrecioResumen } from "@/lib/precio-configurador";

/** "+ Bañera — opción 1: A consultar", debajo del precio estimado. */
export function AConsultar({ items, color, className }: { items: PrecioResumen["aConsultar"]; color?: string; className: string }) {
  if (items.length === 0) return null;
  return (
    <ul className={`font-semibold ${className}`} style={color ? { color } : undefined}>
      {items.map((o) => (
        <li key={o.key}>+ {o.nombre}: {A_CONSULTAR}</li>
      ))}
    </ul>
  );
}

const COLOR_SIN_ADICIONALES = { text: "#2d9e75", bg: "#e6f7f1" };
const COLOR_CON_ADICIONALES = { text: "#854F0B", bg: "#faeeda" };
const COLOR_SIN_MODELO = { text: "#78716c", bg: "#f5f5f4" };

const NOTA = `* Precio estimado de referencia. ${LEYENDA_PRECIOS} El precio final depende de la configuración completa y se confirma en el presupuesto personalizado.`;

/** Anima el monto mostrado del valor anterior al nuevo en ~0.5s. */
function useCountUp(target: number) {
  const [display, setDisplay] = useState(target);
  const prevRef = useRef(target);
  useEffect(() => {
    const controls = animate(prevRef.current, target, {
      duration: 0.5,
      ease: "easeOut",
      onUpdate: setDisplay,
    });
    prevRef.current = target;
    return () => controls.stop();
  }, [target]);
  return display;
}

/** Precio base, extras con precio y extras a consultar, línea por línea. */
export function Desglose({ resumen, colors, className = "pt-3 mt-3 border-t" }: { resumen: PrecioResumen; colors: { text: string; bg?: string }; className?: string }) {
  return (
    <div className={`space-y-1.5 ${className}`} style={{ borderColor: `${colors.text}25` }}>
      <div className="flex items-center justify-between text-xs font-bold" style={{ color: colors.text }}>
        <span>Precio base</span>
        <span className="tabular-nums">{formatUSD(resumen.base)}</span>
      </div>
      {resumen.adicionales.map((a) => (
        <div key={a.key} className="flex items-start sm:items-center justify-between text-xs" style={{ color: colors.text }}>
          <span className="min-w-0 pr-2 sm:truncate">+ {a.nombre}</span>
          <span className="tabular-nums shrink-0">{formatUSD(a.precio)}</span>
        </div>
      ))}
      {resumen.aConsultar.map((o) => (
        <div key={o.key} className="flex items-start sm:items-center justify-between text-xs" style={{ color: colors.text }}>
          <span className="min-w-0 pr-2 sm:truncate">+ {o.nombre}</span>
          <span className="shrink-0 font-semibold">{A_CONSULTAR}</span>
        </div>
      ))}
    </div>
  );
}

/** Colores del precio: gris sin modelo, verde sin extras, naranja con extras. */
export function coloresPrecio(resumen: PrecioResumen, modeloLabel: string | null) {
  if (!modeloLabel) return COLOR_SIN_MODELO;
  return resumen.adicionales.length > 0 ? COLOR_CON_ADICIONALES : COLOR_SIN_ADICIONALES;
}

/** Celular: el total arriba de Atrás/Siguiente, en la barra fija del
 *  configurador. "Detalle" despliega el desglose y la nota del precio. */
export function PrecioBarraMovil({ resumen, modeloLabel }: { resumen: PrecioResumen; modeloLabel: string | null }) {
  const [open, setOpen] = useState(false);
  const displayTotal = useCountUp(resumen.total);
  const colors = coloresPrecio(resumen, modeloLabel);

  if (!modeloLabel) {
    return (
      <p className="sm:hidden min-h-11 flex items-center text-sm font-bold" style={{ color: colors.text }}>
        Seleccioná un modelo para ver el precio
      </p>
    );
  }
  return (
    <div className="sm:hidden" style={{ color: colors.text }}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="w-full min-h-11 flex items-center justify-between gap-3 text-left cursor-pointer"
      >
        <span className="min-w-0">
          <span className="block text-[11px] font-semibold leading-tight truncate">{modeloLabel} · Precio estimado</span>
          <span className="block text-lg font-extrabold leading-tight tabular-nums">{formatUSD(displayTotal)}</span>
          {resumen.aConsultar.length > 0 && (
            <span className="block text-[10px] font-semibold leading-tight">
              + {resumen.aConsultar.length} {resumen.aConsultar.length === 1 ? "opción" : "opciones"} a consultar
            </span>
          )}
        </span>
        <span className="shrink-0 text-xs font-bold underline underline-offset-2 decoration-1">{open ? "Ocultar" : "Ver detalle"}</span>
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.25 }} className="overflow-hidden">
            <div className="max-h-[40vh] overflow-y-auto">
              <Desglose resumen={resumen} colors={colors} />
              <p className="text-[10px] mt-2 leading-snug opacity-80">{NOTA}</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export function PrecioPanel({ resumen, modeloLabel }: { resumen: PrecioResumen; modeloLabel: string | null }) {
  const [open, setOpen] = useState(false);
  const displayTotal = useCountUp(resumen.total);
  const colors = coloresPrecio(resumen, modeloLabel);

  const scale = useMotionValue(1);
  useEffect(() => {
    const controls = animate(scale, [1, 1.035, 1], { duration: 0.45, ease: "easeOut" });
    return () => controls.stop();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resumen.total, modeloLabel]);

  return (
    <>
      {/* Desktop / tablet — barra sticky arriba del contenido */}
      <motion.div
        style={{ scale, backgroundColor: colors.bg }}
        className="hidden sm:block sticky top-16 z-30 mb-6 rounded-2xl border border-black/5 px-5 py-4 shadow-sm transition-colors duration-500"
      >
        {!modeloLabel ? (
          <p className="text-sm font-bold transition-colors duration-500" style={{ color: colors.text }}>
            Seleccioná un modelo para ver el precio
          </p>
        ) : (
          <>
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <p className="text-base font-extrabold transition-colors duration-500" style={{ color: colors.text }}>
                  {modeloLabel}
                </p>
                <p className="text-sm font-semibold mt-0.5 transition-colors duration-500" style={{ color: colors.text }}>
                  Precio estimado:{" "}
                  <span className="text-2xl font-extrabold tabular-nums">{formatUSD(displayTotal)}</span>
                </p>
                <AConsultar items={resumen.aConsultar} color={colors.text} className="mt-1 space-y-0.5 text-xs" />
              </div>
              <button
                type="button"
                onClick={() => setOpen((v) => !v)}
                className="shrink-0 mt-1 text-xs font-bold underline underline-offset-2 decoration-1 cursor-pointer transition-colors duration-500"
                style={{ color: colors.text }}
              >
                {open ? "Ocultar detalle" : "Ver detalle"}
              </button>
            </div>
            <p className="text-[10px] mt-2 leading-relaxed opacity-70 transition-colors duration-500" style={{ color: colors.text }}>
              {NOTA}
            </p>
            <AnimatePresence initial={false}>
              {open && (
                <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.25 }} className="overflow-hidden">
                  <Desglose resumen={resumen} colors={colors} />
                </motion.div>
              )}
            </AnimatePresence>
          </>
        )}
      </motion.div>

    </>
  );
}
