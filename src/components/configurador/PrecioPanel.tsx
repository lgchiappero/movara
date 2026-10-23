"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion, animate, useMotionValue } from "framer-motion";

export type PrecioAdicional = { key: string; nombre: string; precio: number };

export type PrecioResumen = {
  base: number;
  adicionales: PrecioAdicional[];
  total: number;
  /** Opciones sin precio de lista elegidas: no suman al total, se cotizan aparte. */
  aConsultar: { key: string; nombre: string }[];
};

/** "+ Balcón frontal: lo cotizamos en tu presupuesto", debajo del precio estimado. */
export function AConsultar({ items, color, className }: { items: PrecioResumen["aConsultar"]; color?: string; className: string }) {
  if (items.length === 0) return null;
  return (
    <ul className={`font-semibold ${className}`} style={color ? { color } : undefined}>
      {items.map((o) => (
        <li key={o.key}>+ {o.nombre}: lo cotizamos en tu presupuesto</li>
      ))}
    </ul>
  );
}

const COLOR_SIN_ADICIONALES = { text: "#2d9e75", bg: "#e6f7f1" };
const COLOR_CON_ADICIONALES = { text: "#854F0B", bg: "#faeeda" };
const COLOR_SIN_MODELO = { text: "#78716c", bg: "#f5f5f4" };

const NOTA =
  "* Precio estimado de referencia. El precio final depende de la configuración completa y se confirma en el presupuesto personalizado.";

function formatUSD(n: number): string {
  return `USD ${new Intl.NumberFormat("es-AR", { maximumFractionDigits: 0 }).format(Math.round(n))}`;
}

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

function Desglose({ resumen, colors }: { resumen: PrecioResumen; colors: { text: string; bg: string } }) {
  return (
    <div className="space-y-1.5 pt-3 mt-3 border-t" style={{ borderColor: `${colors.text}25` }}>
      <div className="flex items-center justify-between text-xs font-bold" style={{ color: colors.text }}>
        <span>Precio base</span>
        <span className="tabular-nums">{formatUSD(resumen.base)}</span>
      </div>
      {resumen.adicionales.map((a) => (
        <div key={a.key} className="flex items-center justify-between text-xs" style={{ color: colors.text }}>
          <span className="truncate pr-2">+ {a.nombre}</span>
          <span className="tabular-nums shrink-0">{formatUSD(a.precio)}</span>
        </div>
      ))}
    </div>
  );
}

export function PrecioPanel({ resumen, modeloLabel }: { resumen: PrecioResumen; modeloLabel: string | null }) {
  const [open, setOpen] = useState(false);
  const displayTotal = useCountUp(resumen.total);
  const hasExtras = resumen.adicionales.length > 0;
  const colors = !modeloLabel ? COLOR_SIN_MODELO : hasExtras ? COLOR_CON_ADICIONALES : COLOR_SIN_ADICIONALES;

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

      {/* Mobile — barra fija abajo */}
      <motion.div
        style={{ scale, backgroundColor: colors.bg }}
        data-barra-inferior
        className="sm:hidden fixed bottom-0 left-0 right-0 z-40 border-t border-black/5 px-4 pt-3 pb-[calc(env(safe-area-inset-bottom)+0.75rem)] shadow-[0_-4px_16px_rgba(0,0,0,0.08)] transition-colors duration-500"
      >
        {!modeloLabel ? (
          <p className="text-sm font-bold transition-colors duration-500" style={{ color: colors.text }}>
            Seleccioná un modelo para ver el precio
          </p>
        ) : (
          <>
            <button type="button" onClick={() => setOpen((v) => !v)} className="w-full flex items-center justify-between gap-3 cursor-pointer">
              <div className="text-left min-w-0">
                <p className="text-xs font-extrabold transition-colors duration-500" style={{ color: colors.text }}>
                  {modeloLabel}
                </p>
                <p className="text-[11px] font-semibold transition-colors duration-500" style={{ color: colors.text }}>
                  Precio estimado: <span className="text-lg font-extrabold tabular-nums">{formatUSD(displayTotal)}</span>
                </p>
                <AConsultar items={resumen.aConsultar} color={colors.text} className="text-[10px] leading-tight" />
              </div>
              <span className="shrink-0 text-[11px] font-bold underline underline-offset-2 decoration-1 transition-colors duration-500" style={{ color: colors.text }}>
                {open ? "Ocultar" : "Ver detalle"}
              </span>
            </button>
            <p className="text-[8.5px] mt-1 leading-tight opacity-70 transition-colors duration-500" style={{ color: colors.text }}>
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
