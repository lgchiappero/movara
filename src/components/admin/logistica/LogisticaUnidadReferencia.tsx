import Link from "next/link";
import { CONCEPTO_LOGISTICA_LABELS } from "@/lib/cobranza/constantes";
import { ordenarCostos, type CostoLogisticaRow } from "@/lib/cobranza/logistica";

function formatMoneda(value: number, moneda: string): string {
  return `${moneda} ${value.toLocaleString("es-AR", { maximumFractionDigits: 2 })}`;
}

/** Referencia de solo lectura, en la ficha de la unidad, a los costos de
 * logística internacional de su envío — se cargan y editan en el envío. */
export default function LogisticaUnidadReferencia({
  unidadId,
  envio,
  costos,
}: {
  unidadId: string;
  envio: { id: string; numeroPI: string | null } | null;
  costos: CostoLogisticaRow[];
}) {
  if (!envio) {
    return (
      <div className="bg-white rounded-xl p-4 text-sm text-stone-500" data-testid="logistica-unidad">
        <p className="font-bold text-[#2F2F2F] mb-1">Logística internacional</p>
        La unidad todavía no está asignada a un envío.
      </div>
    );
  }

  // Lo que le toca a esta unidad, por moneda (solo de los costos prorrateados).
  const parte = { USD: 0, ARS: 0 };
  for (const c of costos) {
    const propio = c.prorrateos.find((p) => p.unidadId === unidadId);
    if (propio && (c.moneda === "USD" || c.moneda === "ARS")) parte[c.moneda] += propio.importe;
  }

  return (
    <div className="bg-white rounded-xl p-4 space-y-3" data-testid="logistica-unidad">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <p className="font-bold text-[#2F2F2F]">Logística internacional</p>
          <p className="text-xs text-stone-400">Costos del envío completo — solo lectura, se cargan en el envío.</p>
        </div>
        <Link href={`/admin/envios/${envio.id}#logistica`} className="text-sm font-bold text-sage-600 hover:text-sage-700">
          Ver envío {envio.numeroPI ?? "sin PI"} →
        </Link>
      </div>

      {costos.length === 0 ? (
        <p className="text-sm text-stone-400">El envío todavía no tiene costos de logística cargados.</p>
      ) : (
        <>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-[#F0F0F0] text-left text-stone-400 uppercase tracking-wide">
                  <th className="px-2 py-2 font-medium">Concepto</th>
                  <th className="px-2 py-2 font-medium text-right">Total del envío</th>
                  <th className="px-2 py-2 font-medium text-right">Parte de esta unidad</th>
                  <th className="px-2 py-2 font-medium">Estado</th>
                </tr>
              </thead>
              <tbody>
                {ordenarCostos(costos).map((c) => {
                  const propio = c.prorrateos.find((p) => p.unidadId === unidadId);
                  return (
                    <tr key={c.id} className="border-b border-[#F0F0F0] last:border-0">
                      <td className="px-2 py-2 text-stone-700">
                        {CONCEPTO_LOGISTICA_LABELS[c.concepto as keyof typeof CONCEPTO_LOGISTICA_LABELS] ?? c.concepto}
                        {c.descripcion && <span className="block text-stone-400">{c.descripcion}</span>}
                      </td>
                      <td className="px-2 py-2 text-right whitespace-nowrap text-stone-600">{formatMoneda(c.importe, c.moneda)}</td>
                      <td className="px-2 py-2 text-right whitespace-nowrap">
                        {propio ? (
                          <span className="font-medium text-[#2F2F2F]">{formatMoneda(propio.importe, c.moneda)}</span>
                        ) : (
                          <span className="text-stone-400">No prorrateado</span>
                        )}
                      </td>
                      <td className="px-2 py-2">
                        <span
                          className={`px-1.5 py-0.5 rounded-full text-[11px] font-bold ${
                            c.estado === "pagado" ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"
                          }`}
                        >
                          {c.estado === "pagado" ? "Pagado" : "Pendiente"}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <p className="text-sm text-stone-600">
            Parte de esta unidad: <strong className="text-[#2F2F2F]">{formatMoneda(parte.USD, "USD")}</strong>
            {parte.ARS > 0 && (
              <>
                {" "}
                · <strong className="text-[#2F2F2F]">{formatMoneda(parte.ARS, "ARS")}</strong>
              </>
            )}
          </p>
        </>
      )}
    </div>
  );
}
