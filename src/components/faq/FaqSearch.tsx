"use client";

import { useMemo, useState } from "react";
import { Search } from "lucide-react";
import FaqAccordion from "@/components/faq/FaqAccordion";
import { FAQ_CATEGORY_COLORS, type FaqCategory } from "@/data/faq";

export default function FaqSearch({ categorias }: { categorias: FaqCategory[] }) {
  const [query, setQuery] = useState("");

  const filteredCategories = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return categorias;

    return categorias
      .map((categoria) => ({
        ...categoria,
        preguntas: categoria.preguntas.filter(
          (item) =>
            item.pregunta.toLowerCase().includes(q) || item.respuesta.toLowerCase().includes(q),
        ),
      }))
      .filter((categoria) => categoria.preguntas.length > 0);
  }, [categorias, query]);

  return (
    <div>
      <div className="relative max-w-xl mx-auto mb-16">
        <Search
          size={20}
          className="absolute left-4 top-1/2 -translate-y-1/2 text-stone-400 pointer-events-none"
        />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Buscá tu pregunta…"
          className="w-full pl-12 pr-4 py-4 rounded-xl border border-stone-200 bg-white text-[#2F2F2F] placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-sage-500 focus:border-transparent transition-shadow"
        />
      </div>

      {filteredCategories.length === 0 ? (
        <p className="text-center text-stone-400 py-12">
          No encontramos preguntas que coincidan con &ldquo;{query}&rdquo;.
        </p>
      ) : (
        <div className="space-y-10">
          {filteredCategories.map((categoria) => {
            const originalIndex = categorias.findIndex(
              (c) => (c._key ?? c.titulo) === (categoria._key ?? categoria.titulo),
            );
            const color = FAQ_CATEGORY_COLORS[originalIndex % FAQ_CATEGORY_COLORS.length];

            return (
              <section
                key={categoria._key ?? categoria.titulo}
                className={`rounded-2xl border ${color.border} ${color.bg} px-6 sm:px-8`}
              >
                <div className="flex items-center gap-3 pt-7 pb-1">
                  {categoria.icono && (
                    <span className="text-2xl leading-none">{categoria.icono}</span>
                  )}
                  <h2 className={`font-bold text-lg ${color.text}`}>{categoria.titulo}</h2>
                </div>
                <FaqAccordion items={categoria.preguntas} />
              </section>
            );
          })}
        </div>
      )}
    </div>
  );
}
