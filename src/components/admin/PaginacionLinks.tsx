import Link from "next/link";

/** Botones "Anterior/Siguiente" para grillas paginadas server-side — no
 * necesita "use client": son <Link> normales, el cambio de página navega
 * con el query param nuevo. No se renderiza si hay 1 sola página. */
export default function PaginacionLinks({
  page,
  totalPages,
  buildHref,
}: {
  page: number;
  totalPages: number;
  buildHref: (page: number) => string;
}) {
  if (totalPages <= 1) return null;

  return (
    <div className="flex items-center justify-between pt-2">
      {page > 1 ? (
        <Link
          href={buildHref(page - 1)}
          className="px-4 py-2 rounded-lg text-sm font-bold border border-[#E5E5E5] text-[#2F2F2F] hover:border-stone-300 transition-colors"
        >
          ← Anterior
        </Link>
      ) : (
        <span className="px-4 py-2 rounded-lg text-sm font-bold border border-[#E5E5E5] text-stone-300">
          ← Anterior
        </span>
      )}
      <span className="text-xs text-stone-400">
        Página {page} de {totalPages}
      </span>
      {page < totalPages ? (
        <Link
          href={buildHref(page + 1)}
          className="px-4 py-2 rounded-lg text-sm font-bold border border-[#E5E5E5] text-[#2F2F2F] hover:border-stone-300 transition-colors"
        >
          Siguiente →
        </Link>
      ) : (
        <span className="px-4 py-2 rounded-lg text-sm font-bold border border-[#E5E5E5] text-stone-300">
          Siguiente →
        </span>
      )}
    </div>
  );
}
