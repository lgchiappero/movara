"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown } from "lucide-react";
import type { FaqItem, FaqTabla } from "@/data/faq";

export default function FaqAccordion({
  items,
  className = "",
}: {
  items: FaqItem[];
  className?: string;
}) {
  const [openKey, setOpenKey] = useState<string | null>(null);

  return (
    <div className={`divide-y divide-stone-200 ${className}`}>
      {items.map((item, i) => {
        const key = item._key ?? `${i}-${item.pregunta}`;
        const isOpen = openKey === key;

        return (
          <div key={key}>
            <button
              type="button"
              onClick={() => setOpenKey(isOpen ? null : key)}
              className="w-full flex items-center justify-between gap-4 py-5 text-left"
              aria-expanded={isOpen}
            >
              <span className="font-bold text-[#2F2F2F] text-base leading-snug">
                {item.pregunta}
              </span>
              <ChevronDown
                size={20}
                className={`shrink-0 text-stone-400 transition-transform duration-200 ${
                  isOpen ? "rotate-180" : ""
                }`}
              />
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
                  <div className="pb-5 pr-8">
                    <p className="text-stone-600 text-sm leading-relaxed whitespace-pre-line">{item.respuesta}</p>
                    {item.tabla && <FaqTablaComparativa tabla={item.tabla} />}
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

function FaqTablaComparativa({ tabla }: { tabla: FaqTabla }) {
  return (
    <div className="mt-4 overflow-x-auto rounded-xl border border-stone-200">
      <table className="w-full text-sm border-collapse min-w-[480px]">
        <thead>
          <tr>
            {tabla.columnas.map((col, i) => {
              const esMovara = col.trim().toUpperCase() === "MOVARA";
              return (
                <th
                  key={i}
                  className={`text-left font-semibold px-3.5 py-2.5 ${
                    esMovara ? "bg-[#D4B36A] text-[#1C1C1C]" : "bg-stone-50 text-stone-600"
                  }`}
                >
                  {col || " "}
                </th>
              );
            })}
          </tr>
        </thead>
        <tbody>
          {tabla.filas.map((fila, ri) => (
            <tr key={ri} className={ri % 2 === 1 ? "bg-stone-50/60" : ""}>
              {fila.map((celda, ci) => {
                const esMovara = tabla.columnas[ci]?.trim().toUpperCase() === "MOVARA";
                return (
                  <td
                    key={ci}
                    className={`px-3.5 py-2.5 align-top leading-relaxed border-t border-stone-100 ${
                      esMovara ? "bg-[#D4B36A]/10 text-[#2F2F2F] font-medium" : "text-stone-500"
                    }`}
                  >
                    {celda}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
