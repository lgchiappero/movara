"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useDebouncedValue } from "@/lib/hooks/useDebouncedValue";

export type SearchableOption = { value: string; label: string };

/** Combobox con búsqueda — reemplaza un <select> nativo cuando la lista de
 * opciones es larga (unidades, clientes). Filtra mientras se escribe;
 * `onMouseDown` + `preventDefault` en las opciones evita que el blur del
 * input cierre la lista antes de que el click en una opción se registre. */
export default function SearchableSelect({
  options,
  value,
  onChange,
  placeholder = "Buscar...",
  emptyText = "Sin resultados",
}: {
  options: SearchableOption[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  emptyText?: string;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);

  const selected = options.find((o) => o.value === value) ?? null;

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
        setQuery("");
      }
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  const queryDebounced = useDebouncedValue(query, 300);
  const filtered = useMemo(() => {
    const q = queryDebounced.trim().toLowerCase();
    return q ? options.filter((o) => o.label.toLowerCase().includes(q)) : options;
  }, [options, queryDebounced]);

  return (
    <div ref={containerRef} className="relative">
      <input
        type="text"
        value={open ? query : (selected?.label ?? "")}
        onChange={(e) => {
          setQuery(e.target.value);
          if (!open) setOpen(true);
        }}
        onFocus={() => {
          setOpen(true);
          setQuery("");
        }}
        placeholder={placeholder}
        className="w-full rounded-lg border border-[#E5E5E5] px-3 py-2 text-sm text-[#1a1a1a] bg-white focus:outline-none focus:ring-2 focus:ring-[#D4B06A]"
      />
      {open && (
        <div className="absolute z-20 mt-1 w-full max-h-56 overflow-y-auto bg-white border border-[#E5E5E5] rounded-lg shadow-lg">
          {filtered.length === 0 ? (
            <p className="px-3 py-2 text-sm text-stone-400">{emptyText}</p>
          ) : (
            filtered.map((o) => (
              <button
                key={o.value}
                type="button"
                onMouseDown={(e) => {
                  e.preventDefault();
                  onChange(o.value);
                  setOpen(false);
                  setQuery("");
                }}
                className={`w-full text-left px-3 py-2 text-sm hover:bg-stone-50 ${
                  o.value === value ? "bg-[#D4B06A]/10 font-bold text-[#2F2F2F]" : "text-stone-700"
                }`}
              >
                {o.label}
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}
