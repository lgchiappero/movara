"use client";

import { motion } from "framer-motion";

type CuposBarProps = {
  total: number;
  reservadas: number;
  variant?: "full" | "mini";
};

export default function CuposBar({ total, reservadas, variant = "full" }: CuposBarProps) {
  const disponibles = total - reservadas;
  const pct = Math.min(100, Math.round((reservadas / total) * 100));

  if (variant === "mini") {
    return (
      <div className="flex items-center gap-2 min-w-0">
        <div className="w-10 sm:w-14 h-1 bg-white/15 rounded-full overflow-hidden shrink-0">
          <div className="h-full bg-[#D4B36A] rounded-full" style={{ width: `${pct}%` }} />
        </div>
        <span className="text-[11px] sm:text-xs text-stone-300 whitespace-nowrap tabular-nums">
          {disponibles} <span className="hidden sm:inline">disponibles</span><span className="sm:hidden">disp.</span>
        </span>
      </div>
    );
  }

  return (
    <div className="border border-white/10 rounded-xl p-6 max-w-md mx-auto text-left">
      <div className="flex justify-between items-baseline mb-2.5">
        <span className="text-stone-400 text-xs tracking-wide">{reservadas} lugares reservados</span>
        <span className="text-[#D4B36A] font-semibold text-sm">{disponibles} disponibles</span>
      </div>
      <div className="h-1.5 bg-white/10 rounded-full overflow-hidden mb-2.5">
        <motion.div
          initial={{ width: 0 }}
          whileInView={{ width: `${pct}%` }}
          viewport={{ once: true }}
          transition={{ duration: 1.2, delay: 0.15, ease: "easeOut" }}
          className="h-full bg-[#D4B36A] rounded-full"
        />
      </div>
      <p className="text-stone-600 text-[11px] text-center tracking-wide">
        {reservadas} de {total} lugares con condiciones especiales ocupados
      </p>
    </div>
  );
}
