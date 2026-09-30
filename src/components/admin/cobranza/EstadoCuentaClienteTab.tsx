"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { CONCEPTO_LABELS, MODALIDAD_LABELS, ESTADO_ACUERDO_LABELS, ESTADO_ACUERDO_COLORS } from "@/lib/cobranza/constantes";
import { sumaImportes, estadoAcuerdo } from "@/lib/cobranza/calc";
import SearchableSelect from "@/components/admin/SearchableSelect";
import type { AcuerdoConDetalle, ClienteOpcion } from "@/lib/cobranza/types";

function formatMoneda(value: number, moneda: string): string {
  return `${moneda} ${value.toLocaleString("es-AR", { maximumFractionDigits: 0 })}`;
}

function formatFecha(value: string): string {
  return new Date(value).toLocaleDateString("es-AR", { timeZone: "UTC" });
}

export default function EstadoCuentaClienteTab({
  clientes,
  acuerdosCobro,
  clienteIdInicial,
}: {
  clientes: ClienteOpcion[];
  acuerdosCobro: AcuerdoConDetalle[];
  clienteIdInicial?: string;
}) {
  const [clienteId, setClienteId] = useState(clienteIdInicial ?? "");

  const acuerdosDelCliente = useMemo(
    () => acuerdosCobro.filter((a) => a.clienteId === clienteId),
    [acuerdosCobro, clienteId]
  );

  const filas = useMemo(
    () =>
      acuerdosDelCliente.map((acuerdo) => {
        const movido = sumaImportes(acuerdo.movimientos);
        return {
          acuerdo,
          movido,
          pendiente: acuerdo.totalAcordado - movido,
          estado: estadoAcuerdo(acuerdo.totalAcordado, movido, acuerdo.cuotas),
        };
      }),
    [acuerdosDelCliente]
  );

  const movimientosCronologicos = useMemo(
    () =>
      acuerdosDelCliente
        .flatMap((a) => a.movimientos.map((m) => ({ ...m, moneda: a.moneda, unidadNumero: a.unidadNumero })))
        .sort((a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime()),
    [acuerdosDelCliente]
  );

  // Saldo pendiente solo tiene sentido sumado dentro de una misma moneda —
  // se separa por moneda en vez de mezclar USD y ARS en un único número.
  const saldosPorMoneda = useMemo(() => {
    const mapa = new Map<string, number>();
    for (const f of filas) {
      mapa.set(f.acuerdo.moneda, (mapa.get(f.acuerdo.moneda) ?? 0) + f.pendiente);
    }
    return Array.from(mapa.entries());
  }, [filas]);

  const clienteSeleccionado = clientes.find((c) => c.id === clienteId);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-[280px]">
          <SearchableSelect
            value={clienteId}
            onChange={setClienteId}
            placeholder="Buscar cliente..."
            emptyText="Ningún cliente coincide"
            options={clientes.map((c) => ({ value: c.id, label: c.nombre }))}
          />
        </div>
        {clienteId && (
          <a
            href={`/api/admin/cobranza/estado-cuenta/${clienteId}/pdf`}
            target="_blank"
            rel="noopener noreferrer"
            className="px-4 py-2 bg-white border border-[#E5E5E5] hover:border-stone-300 text-[#2F2F2F] font-bold text-sm rounded-lg transition-colors"
          >
            Exportar PDF
          </a>
        )}
      </div>

      {!clienteId ? (
        <div className="bg-white rounded-2xl border border-[#E5E5E5] p-10 text-center text-stone-500 text-sm">
          Elegí un cliente para ver su estado de cuenta.
        </div>
      ) : (
        <>
          <div className="flex flex-wrap gap-3">
            {saldosPorMoneda.length === 0 ? (
              <div className="bg-white rounded-2xl border border-[#E5E5E5] p-4 text-sm text-stone-400">
                {clienteSeleccionado?.nombre} todavía no tiene acuerdos de cobro cargados.
              </div>
            ) : (
              saldosPorMoneda.map(([moneda, saldo]) => (
                <div key={moneda} className="bg-white rounded-2xl border border-[#E5E5E5] p-4">
                  <p className={`text-xl font-bold ${saldo > 0 ? "text-red-700" : "text-emerald-700"}`}>
                    {formatMoneda(saldo, moneda)}
                  </p>
                  <p className="text-xs text-stone-500 mt-0.5">Saldo pendiente ({moneda})</p>
                </div>
              ))
            )}
          </div>

          {filas.length > 0 && (
            <div className="bg-white rounded-2xl border border-[#E5E5E5] overflow-hidden overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-[#E5E5E5] text-left text-stone-500 text-xs uppercase tracking-wide">
                    <th className="px-4 py-3 font-medium">Unidad</th>
                    <th className="px-4 py-3 font-medium">Concepto</th>
                    <th className="px-4 py-3 font-medium">Total acordado</th>
                    <th className="px-4 py-3 font-medium">Pendiente</th>
                    <th className="px-4 py-3 font-medium">Estado</th>
                  </tr>
                </thead>
                <tbody>
                  {filas.map(({ acuerdo, pendiente, estado }) => (
                    <tr key={acuerdo.id} className="border-b border-[#F0F0F0] last:border-0">
                      <td className="px-4 py-3">
                        <Link
                          href={`/admin/unidades/${acuerdo.unidadId}`}
                          className="font-medium text-sage-600 hover:text-sage-700"
                        >
                          {acuerdo.unidadNumero ?? "Sin número"}
                        </Link>
                      </td>
                      <td className="px-4 py-3 text-stone-600">
                        {CONCEPTO_LABELS[acuerdo.concepto as keyof typeof CONCEPTO_LABELS] ?? acuerdo.concepto}
                      </td>
                      <td className="px-4 py-3 text-stone-600">{formatMoneda(acuerdo.totalAcordado, acuerdo.moneda)}</td>
                      <td className="px-4 py-3 text-stone-600">{formatMoneda(pendiente, acuerdo.moneda)}</td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-1 rounded-full text-xs font-bold ${ESTADO_ACUERDO_COLORS[estado]}`}>
                          {ESTADO_ACUERDO_LABELS[estado]}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <div>
            <h3 className="text-xs font-bold uppercase tracking-wide text-stone-500 mb-2">
              Historial de movimientos
            </h3>
            {movimientosCronologicos.length === 0 ? (
              <p className="text-sm text-stone-400">Todavía no hay movimientos registrados.</p>
            ) : (
              <div className="bg-white rounded-2xl border border-[#E5E5E5] overflow-hidden overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-[#E5E5E5] text-left text-stone-500 text-xs uppercase tracking-wide">
                      <th className="px-4 py-3 font-medium">Fecha</th>
                      <th className="px-4 py-3 font-medium">Unidad</th>
                      <th className="px-4 py-3 font-medium">Importe</th>
                      <th className="px-4 py-3 font-medium">Modalidad</th>
                    </tr>
                  </thead>
                  <tbody>
                    {movimientosCronologicos.map((m) => (
                      <tr key={m.id} className="border-b border-[#F0F0F0] last:border-0">
                        <td className="px-4 py-3 text-stone-600">{formatFecha(m.fecha)}</td>
                        <td className="px-4 py-3 text-stone-600">{m.unidadNumero ?? "Sin número"}</td>
                        <td className="px-4 py-3 font-medium text-[#2F2F2F]">{formatMoneda(m.importe, m.moneda)}</td>
                        <td className="px-4 py-3 text-stone-600">
                          {MODALIDAD_LABELS[m.modalidad as keyof typeof MODALIDAD_LABELS] ?? m.modalidad}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
