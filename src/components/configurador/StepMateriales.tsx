"use client";

import { useState } from "react";
import Image from "next/image";
import {
  MATERIAL_CATEGORY_GROUPS,
  getDefaultMateriales,
  findMaterialOption,
  getMaterialLabel,
  type MaterialOption,
  type MaterialSelector,
  type MaterialCategoryGroup,
  type MaterialesSeleccion,
} from "@/data/material-catalog";

export {
  MATERIAL_CATEGORY_GROUPS,
  getDefaultMateriales,
  findMaterialOption,
  getMaterialLabel,
  type MaterialOption,
  type MaterialSelector,
  type MaterialCategoryGroup,
  type MaterialesSeleccion,
};

// ─────────────────────────────────────────────────────────
// UI
// ─────────────────────────────────────────────────────────

const GREEN = "#2d9e75";
const ORANGE = "#d45a1a";
const TILE_GRID = "grid grid-cols-2 sm:grid-cols-3 gap-3";
const TILE_RADIUS = "rounded-xl";
const TILE_SIZES = "(min-width: 640px) 33vw, 50vw";

function CheckIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
    </svg>
  );
}

function MaterialImage({
  src,
  alt,
  sizes,
  fit = "cover",
  fallbackColor,
  fallbackBorder,
}: {
  src: string;
  alt: string;
  sizes: string;
  fit?: "cover" | "contain";
  /** Si la imagen no carga (todavía no existe el archivo), mostrar este color en vez del cuadro gris genérico. */
  fallbackColor?: string;
  fallbackBorder?: boolean;
}) {
  const [error, setError] = useState(false);
  if (error) {
    if (fallbackColor) {
      return <div className={`w-full h-full ${fallbackBorder ? "border border-stone-300" : ""}`} style={{ backgroundColor: fallbackColor }} />;
    }
    return (
      <div className="w-full h-full bg-stone-200 flex items-center justify-center p-2 text-center">
        <span className="text-[10px] font-semibold text-stone-500 leading-snug">{alt}</span>
      </div>
    );
  }
  return (
    <Image
      src={src}
      alt={alt}
      fill
      sizes={sizes}
      className={`object-center ${fit === "contain" ? "object-contain" : "object-cover"}`}
      onError={() => setError(true)}
    />
  );
}

function StatusBadge({ isPremium }: { isPremium: boolean }) {
  return (
    <span
      className="inline-flex items-center gap-1 mb-1 px-1.5 py-0.5 rounded-full text-[9px] font-bold text-white whitespace-nowrap"
      style={{ backgroundColor: isPremium ? ORANGE : GREEN }}
    >
      <CheckIcon className="w-2.5 h-2.5" />
      {isPremium ? "Agregado" : "Elegido"}
    </span>
  );
}

/** Badge de precio sobre la imagen — solo en cards premium. Siempre muestra el
 * precio, esté o no seleccionada; el estado "Agregado" vive en el área de texto. */
function ImagePriceBadge({ amount }: { amount: number }) {
  return (
    <span
      className="absolute top-1.5 right-1.5 px-1.5 py-0.5 rounded-full text-[9px] font-bold shadow whitespace-nowrap"
      style={{ backgroundColor: "#faeeda", color: "#854F0B" }}
    >
      {`+ USD ${amount}`}
    </span>
  );
}

function MaterialCard({
  option,
  selected,
  onSelect,
  priceAmount,
  imageFit = "cover",
  imageBg,
}: {
  option: MaterialOption;
  selected: boolean;
  onSelect: () => void;
  /** Si está definida, esta card tiene costo adicional. */
  priceAmount?: number;
  imageFit?: "cover" | "contain";
  imageBg?: string;
}) {
  const isPremium = priceAmount !== undefined;
  const accent = isPremium ? ORANGE : GREEN;
  const textBg = isPremium ? "#faeeda" : "#e6f7f1";

  return (
    <button
      type="button"
      onClick={onSelect}
      aria-pressed={selected}
      className={`w-full text-left ${TILE_RADIUS} overflow-hidden transition-all duration-200 cursor-pointer ${
        selected ? "border-[3px] shadow-md" : "border border-stone-200 hover:border-stone-300"
      }`}
      style={selected ? { borderColor: accent } : undefined}
    >
      {/* Imagen — nunca lleva overlay ni tinte, se ve siempre limpia. */}
      <div className="relative w-full aspect-[4/3]" style={{ backgroundColor: imageBg ?? "#f5f5f4" }}>
        {option.img ? (
          <MaterialImage
            src={option.img}
            alt={option.label}
            sizes={TILE_SIZES}
            fit={imageFit}
            fallbackColor={option.color}
            fallbackBorder={option.border}
          />
        ) : option.color ? (
          <div className={`w-full h-full ${option.border ? "border border-stone-300" : ""}`} style={{ backgroundColor: option.color }} />
        ) : null}
        {isPremium && <ImagePriceBadge amount={priceAmount!} />}
      </div>
      {/* Estado de selección: solo acá — nunca sobre la imagen. */}
      <div className="px-2 py-2 transition-colors duration-200" style={{ backgroundColor: selected ? textBg : "#ffffff" }}>
        {selected && <StatusBadge isPremium={isPremium} />}
        <p className={`text-xs font-semibold leading-snug line-clamp-2 ${selected ? "text-stone-900" : "text-stone-600"}`}>{option.label}</p>
      </div>
    </button>
  );
}

function SelectorBlock({
  selector,
  selectedId,
  onSelect,
  priceFor,
}: {
  selector: MaterialSelector;
  selectedId: string | null;
  onSelect: (id: string) => void;
  priceFor: (priceName: string) => number;
}) {
  const amount = selector.priceName ? priceFor(selector.priceName) : undefined;
  return (
    <div>
      <p className="text-xs font-bold text-stone-500 uppercase tracking-wide mb-2">{selector.label}</p>
      <div className={TILE_GRID}>
        {selector.options.map((opt) => (
          <MaterialCard
            key={opt.id}
            option={opt}
            selected={selectedId === opt.id}
            onSelect={() => onSelect(opt.id)}
            priceAmount={amount}
            imageFit={selector.imageFit}
            imageBg={selector.imageBg}
          />
        ))}
      </div>
    </div>
  );
}

function CategoryGroupBlock({
  category,
  seleccion,
  onSelect,
  priceFor,
}: {
  category: MaterialCategoryGroup;
  seleccion: MaterialesSeleccion;
  onSelect: (key: string, id: string, nullable?: boolean) => void;
  priceFor: (priceName: string) => number;
}) {
  return (
    <div>
      <h4 className="text-base font-bold text-stone-900 mb-4">{category.title}</h4>
      <div className="space-y-5">
        {category.selectors.map((sel, i) => {
          const prevPriced = i > 0 && !!category.selectors[i - 1].priceName;
          const divider = !!sel.priceName && !prevPriced;
          return (
            <div key={`${sel.key}-${i}`}>
              {divider && <div className="mb-5 border-t border-dashed border-stone-300" />}
              <SelectorBlock
                selector={sel}
                selectedId={seleccion[sel.key] ?? null}
                onSelect={(id) => onSelect(sel.key, id, sel.nullable)}
                priceFor={priceFor}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function MaterialesSection({
  seleccion,
  onSelect,
  priceFor,
}: {
  seleccion: MaterialesSeleccion;
  onSelect: (key: string, id: string, nullable?: boolean) => void;
  priceFor: (priceName: string) => number;
}) {
  return (
    <div className="space-y-8 pt-2">
      <div>
        <h3 className="text-xl font-bold text-stone-900">Elegí los materiales de tu MOVARA</h3>
        <p className="text-stone-500 text-sm mt-1">
          Fotos de referencia — el color y la textura final pueden variar levemente según el lote de fabricación. Las opciones marcadas con
          &quot;+ USD&quot; suman ese monto al precio estimado.
        </p>
      </div>
      <div className="space-y-8">
        {MATERIAL_CATEGORY_GROUPS.map((cat) => (
          <div key={cat.key} className="pb-8 border-b border-stone-200 last:border-b-0 last:pb-0">
            <CategoryGroupBlock category={cat} seleccion={seleccion} onSelect={onSelect} priceFor={priceFor} />
          </div>
        ))}
      </div>
    </div>
  );
}
