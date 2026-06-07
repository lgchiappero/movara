"use client";

import { useState } from "react";
import { CATEGORY_LABELS, type ModelCategory, type ProductModel } from "@/data/models";
import ModelCard from "./ModelCard";

type Filter = ModelCategory | "all";

const FILTERS: { value: Filter; label: string }[] = [
  { value: "all", label: "Todos" },
  { value: "familiar", label: CATEGORY_LABELS.familiar },
  { value: "turistico", label: CATEGORY_LABELS.turistico },
  { value: "oficina", label: CATEGORY_LABELS.oficina },
];

export default function CatalogGrid({ models }: { models: ProductModel[] }) {
  const [active, setActive] = useState<Filter>("all");

  const filtered =
    active === "all" ? models : models.filter((m) => m.category === active);

  const count = (f: Filter) =>
    f === "all" ? models.length : models.filter((m) => m.category === f).length;

  return (
    <div>
      {/* Filter bar */}
      <div className="flex flex-wrap items-center gap-2 mb-10">
        {FILTERS.map(({ value, label }) => {
          const isActive = active === value;
          return (
            <button
              key={value}
              onClick={() => setActive(value)}
              className={`inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-semibold transition-all duration-200 ${
                isActive
                  ? "bg-sage-600 text-white shadow-md shadow-sage-600/20"
                  : "bg-stone-100 text-stone-600 hover:bg-stone-200"
              }`}
            >
              {label}
              <span
                className={`text-xs px-1.5 py-0.5 rounded-full font-bold ${
                  isActive
                    ? "bg-white/20 text-white"
                    : "bg-stone-200 text-stone-500"
                }`}
              >
                {count(value)}
              </span>
            </button>
          );
        })}

        <span className="ml-auto text-sm text-stone-400 hidden sm:block">
          {filtered.length} {filtered.length === 1 ? "modelo" : "modelos"}
        </span>
      </div>

      {/* Grid */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {filtered.map((model) => (
          <ModelCard key={model.slug} model={model} />
        ))}
      </div>

      {filtered.length === 0 && (
        <div className="col-span-3 py-24 text-center text-stone-400">
          No hay modelos en esta categoría todavía.
        </div>
      )}
    </div>
  );
}
