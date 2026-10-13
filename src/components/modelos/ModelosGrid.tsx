import ModeloCard, { type ModeloCardData } from "./ModeloCard";

/** Grilla de modelos — la misma en la home y en /modelos: 1 columna en el
 * celular, 2 desde tablet, todas las cards a la misma altura. */
export default function ModelosGrid({
  modelos,
  ctaLabel,
  eagerPrimeras = false,
}: {
  modelos: ModeloCardData[];
  ctaLabel?: string;
  /** /modelos: las primeras dos imágenes se ven al cargar (LCP). */
  eagerPrimeras?: boolean;
}) {
  if (modelos.length === 0) {
    return <p className="text-center text-stone-400 text-sm">Estamos actualizando nuestros modelos — volvé pronto.</p>;
  }
  return (
    <ul className="grid grid-cols-1 md:grid-cols-2 gap-6 lg:gap-8 items-stretch">
      {modelos.map((modelo, i) => (
        <li key={modelo._id} className="h-full">
          <ModeloCard modelo={modelo} ctaLabel={ctaLabel} eager={eagerPrimeras && i < 2} />
        </li>
      ))}
    </ul>
  );
}
