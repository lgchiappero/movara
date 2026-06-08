"use client";

import { useState } from "react";
import { type ProductModel } from "@/data/models";
import ModelCard from "./ModelCard";

type SizeFilter = "all" | "compact" | "medium" | "large";

const SIZE_FILTERS: { value: SizeFilter; label: string; desc: string }[] = [
  { value: "all",     label: "Todos",          desc: "" },
  { value: "compact", label: "Hasta 45 m²",    desc: "" },
  { value: "medium",  label: "50 – 80 m²",     desc: "" },
  { value: "large",   label: "90 m² o más",    desc: "" },
];

function matchesSize(model: ProductModel, filter: SizeFilter): boolean {
  if (filter === "all")     return true;
  if (filter === "compact") return model.size <= 45;
  if (filter === "medium")  return model.size >= 50 && model.size <= 80;
  if (filter === "large")   return model.size >= 90;
  return true;
}

export default function CatalogGrid({ models }: { models: ProductModel[] }) {
  const [active, setActive] = useState<SizeFilter>("all");

  const filtered = models.filter((m) => matchesSize(m, active));

  const count = (f: SizeFilter) => models.filter((m) => matchesSize(m, f)).length;

  return (
    <div>
      {/* Filter bar */}
      <div className="flex flex-wrap items-center gap-2 mb-10">
        {SIZE_FILTERS.map(({ value, label }) => {
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
          No hay modelos en ese rango de superficie.
        </div>
      )}
    </div>
  );
}
