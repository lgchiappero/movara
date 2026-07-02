"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown } from "lucide-react";
import type { FaqItem } from "@/data/faq";

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
                  <p className="pb-5 pr-8 text-stone-600 text-sm leading-relaxed">
                    {item.respuesta}
                  </p>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        );
      })}
    </div>
  );
}
