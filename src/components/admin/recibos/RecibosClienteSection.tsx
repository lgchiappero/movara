import Link from "next/link";
import { fechaHoraAR } from "@/lib/recibos/texto";
import EstadoReciboChip from "./EstadoReciboChip";

export type ReciboDeCliente = {
  id: string;
  numeroRecibo: string;
  numeroUnidad: string;
  unidadId: string;
  modelo: string;
  estado: string;
  confirmadoAt: Date | null;
};

/** Recibos en Conformidad de todas las unidades del cliente. */
export default function RecibosClienteSection({ recibos }: { recibos: ReciboDeCliente[] }) {
  return (
    <div className="bg-white rounded-2xl border border-[#E5E5E5] p-5">
      <h2 className="text-sm font-bold uppercase tracking-widest text-sage-600 mb-4">
        Recibos en Conformidad ({recibos.length})
      </h2>
      {recibos.length === 0 ? (
        <p className="text-sm text-stone-400">Este cliente todavía no tiene recibos.</p>
      ) : (
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-stone-500 text-xs uppercase tracking-wide border-b border-[#E5E5E5]">
              <th className="py-2 pr-3 font-semibold">Nº</th>
              <th className="py-2 pr-3 font-semibold">Unidad</th>
              <th className="py-2 pr-3 font-semibold hidden sm:table-cell">Modelo</th>
              <th className="py-2 pr-3 font-semibold">Estado</th>
              <th className="py-2 pr-3 font-semibold hidden sm:table-cell">Confirmado</th>
              <th className="py-2 font-semibold">
                <span className="sr-only">PDF</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {recibos.map((r) => (
              <tr key={r.id} className="border-b border-[#F0F0F0] last:border-0">
                <td className="py-2 pr-3 whitespace-nowrap">
                  <Link href={`/admin/recibos/${r.id}`} className="font-medium text-[#2F2F2F] hover:text-sage-600 hover:underline">
                    {r.numeroRecibo}
                  </Link>
                </td>
                <td className="py-2 pr-3 whitespace-nowrap">
                  <Link href={`/admin/unidades/${r.unidadId}`} className="text-stone-600 hover:text-sage-600">
                    {r.numeroUnidad}
                  </Link>
                </td>
                <td className="py-2 pr-3 text-stone-600 hidden sm:table-cell">{r.modelo}</td>
                <td className="py-2 pr-3">
                  <EstadoReciboChip estado={r.estado} />
                </td>
                <td className="py-2 pr-3 text-stone-600 hidden sm:table-cell whitespace-nowrap">
                  {r.confirmadoAt ? fechaHoraAR(r.confirmadoAt) : "—"}
                </td>
                <td className="py-2 text-right">
                  {r.estado === "confirmado" && (
                    <a href={`/api/admin/recibos/${r.id}/pdf`} className="text-sage-600 hover:text-sage-700 font-semibold text-xs">
                      PDF
                    </a>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
