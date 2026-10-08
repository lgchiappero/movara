import Link from "next/link";
import { fechaHoraAR, fechaLargaUTC } from "@/lib/recibos/texto";
import EstadoReciboChip from "./EstadoReciboChip";

export type ReciboDeUnidad = {
  id: string;
  numeroRecibo: string;
  estado: string;
  fechaEntrega: Date;
  confirmadoAt: Date | null;
} | null;

/** Sección "Recibo en Conformidad" de la ficha de la unidad: el recibo
 * vigente (no anulado) con acceso directo, o "Crear recibo". */
export default function ReciboUnidadSection({ unidadId, recibo }: { unidadId: string; recibo: ReciboDeUnidad }) {
  return (
    <div id="recibo" className="bg-white rounded-2xl border border-[#E5E5E5] p-5 space-y-3">
      <h2 className="text-sm font-bold uppercase tracking-widest text-sage-600">Recibo en Conformidad</h2>
      {recibo ? (
        <div className="flex items-center justify-between gap-4 text-sm">
          <div className="space-y-0.5">
            <p className="flex items-center gap-2">
              <span className="font-medium text-[#2F2F2F]">{recibo.numeroRecibo}</span>
              <EstadoReciboChip estado={recibo.estado} />
            </p>
            <p className="text-stone-500">
              Entrega: {fechaLargaUTC(recibo.fechaEntrega)}
              {recibo.confirmadoAt && ` · Confirmado el ${fechaHoraAR(recibo.confirmadoAt)}`}
            </p>
          </div>
          <Link href={`/admin/recibos/${recibo.id}`} className="shrink-0 text-sage-600 hover:text-sage-700 font-semibold">
            Ver recibo →
          </Link>
        </div>
      ) : (
        <div className="flex items-center justify-between gap-4 text-sm">
          <p className="text-stone-500">Todavía no hay un recibo vigente para esta unidad.</p>
          <Link
            href={`/admin/recibos/nuevo?unidad=${unidadId}`}
            className="shrink-0 px-3 py-1.5 bg-[#D4B06A] hover:bg-[#c19f57] text-[#2F2F2F] font-bold text-sm rounded-lg"
          >
            Crear recibo
          </Link>
        </div>
      )}
    </div>
  );
}
