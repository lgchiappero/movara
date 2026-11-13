import Link from "next/link";
import { formatearSoloFecha } from "@/lib/fecha-ar";
import { totalPorMoneda, type PagoVencido } from "@/lib/indicadores/pagos";
import { formatMontos } from "@/lib/indicadores/montos";

/** Lista de "Pagos vencidos": exactamente las filas que cuenta la tarjeta
 * (y la alerta del dashboard) — planes de pago con cuotas vencidas con saldo
 * y costos de logística pendientes con fecha pasada. Montos por moneda,
 * nunca sumados entre sí. */
export default function PagosVencidosLista({ filas }: { filas: PagoVencido[] }) {
  return (
    <section
      aria-labelledby="pagos-vencidos-titulo"
      data-testid="pagos-vencidos"
      className="bg-white rounded-2xl border border-[#F3C6C6] overflow-hidden"
    >
      <div className="px-5 py-4 flex flex-wrap items-baseline justify-between gap-2 border-b border-[#F0F0F0]">
        <h2 id="pagos-vencidos-titulo" className="text-sm font-bold uppercase tracking-widest text-red-700">
          Pagos vencidos ({filas.length})
        </h2>
        {filas.length > 0 && (
          <p className="text-sm text-stone-600">
            Saldo vencido: <strong className="text-red-700">{formatMontos(totalPorMoneda(filas))}</strong>
          </p>
        )}
      </div>
      {filas.length === 0 ? (
        <p className="px-5 py-6 text-sm text-stone-400">No hay pagos vencidos.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[#F0F0F0] text-left text-xs text-stone-400 uppercase tracking-wide">
                <th className="px-4 py-2 font-medium">Tipo</th>
                <th className="px-4 py-2 font-medium">Unidad / envío</th>
                <th className="px-4 py-2 font-medium">Proveedor / detalle</th>
                <th className="px-4 py-2 font-medium">Vencimiento</th>
                <th className="px-4 py-2 font-medium text-right">Saldo vencido</th>
              </tr>
            </thead>
            <tbody>
              {filas.map((f) => (
                <tr key={f.key} className="border-b border-[#F0F0F0] last:border-0" data-origen={f.origen}>
                  <td className="px-4 py-2 font-medium text-[#2F2F2F] whitespace-nowrap">{f.tipo}</td>
                  <td className="px-4 py-2 whitespace-nowrap">
                    <Link href={f.href} className="text-sage-600 hover:underline">
                      {f.referencia}
                    </Link>
                  </td>
                  <td className="px-4 py-2 text-stone-600">{f.contraparte || "—"}</td>
                  <td className="px-4 py-2 text-stone-600 whitespace-nowrap">{formatearSoloFecha(f.vencimiento)}</td>
                  <td className="px-4 py-2 text-right whitespace-nowrap text-red-700 font-medium">
                    {f.moneda} {f.saldo.toLocaleString("es-AR", { maximumFractionDigits: 2 })}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
