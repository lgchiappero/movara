"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import * as XLSX from "xlsx";
import {
  CONCEPTO_LABELS,
  MODALIDAD_LABELS,
  ESTADO_CUOTA_LABELS,
  ESTADO_CUOTA_COLORS,
  ESTADO_ACUERDO_LABELS,
  ESTADO_ACUERDO_COLORS,
  type EstadoAcuerdo,
} from "@/lib/cobranza/constantes";
import { sumaImportes, estadoAcuerdo, margenPorcentaje } from "@/lib/cobranza/calc";
import NuevoAcuerdoModal from "@/components/admin/NuevoAcuerdoModal";
import RegistrarMovimientoModal from "@/components/admin/RegistrarMovimientoModal";

export type Cuota = {
  id: string;
  descripcion: string;
  importe: number;
  vencimiento: string | null;
  estado: string;
};

export type MovimientoDetalle = {
  id: string;
  fecha: string;
  importe: number;
  modalidad: string;
  cuotaId: string | null;
  comprobanteUrl: string | null;
  notas: string | null;
  registradoPor: string;
};

export type AcuerdoConDetalle = {
  id: string;
  unidadId: string;
  unidadNumero: string | null;
  clienteNombre: string;
  tipo: string;
  concepto: string;
  descripcion: string | null;
  contraparte: string;
  moneda: string;
  totalAcordado: number;
  notas: string | null;
  createdAt: string;
  cuotas: Cuota[];
  movimientos: MovimientoDetalle[];
};

export type UnidadOpcion = { id: string; numeroUnidad: string | null; clienteNombre: string };

function formatMoneda(value: number, moneda: string): string {
  return `${moneda} ${value.toLocaleString("es-AR", { maximumFractionDigits: 0 })}`;
}

function formatFecha(value: string | null): string {
  return value ? new Date(value).toLocaleDateString("es-AR", { timeZone: "UTC" }) : "—";
}

export default function CobranzaPanel({
  acuerdosCobro,
  acuerdosPago,
  unidades,
  metricas,
  tabInicial,
  estadoInicial,
}: {
  acuerdosCobro: AcuerdoConDetalle[];
  acuerdosPago: AcuerdoConDetalle[];
  unidades: UnidadOpcion[];
  metricas: { cobradoMes: number; pagadoMes: number; margenMes: number; cuotasVencidas: number };
  tabInicial?: "cobros" | "pagos";
  estadoInicial?: "vencido";
}) {
  const router = useRouter();
  const [tab, setTab] = useState<"cobros" | "pagos" | "resumen">(tabInicial ?? "cobros");
  const [filtroEstado, setFiltroEstado] = useState<EstadoAcuerdo | "todos">(estadoInicial ?? "todos");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [nuevoAcuerdoTipo, setNuevoAcuerdoTipo] = useState<"cobro" | "pago" | null>(null);
  const [movimientoAcuerdo, setMovimientoAcuerdo] = useState<AcuerdoConDetalle | null>(null);

  const acuerdosConEstado = useMemo(() => {
    const conEstado = (lista: AcuerdoConDetalle[]) =>
      lista.map((a) => {
        const pagado = sumaImportes(a.movimientos);
        return {
          acuerdo: a,
          pagado,
          pendiente: a.totalAcordado - pagado,
          estado: estadoAcuerdo(a.totalAcordado, pagado, a.cuotas),
        };
      });
    return { cobros: conEstado(acuerdosCobro), pagos: conEstado(acuerdosPago) };
  }, [acuerdosCobro, acuerdosPago]);

  const filaAcuerdos = tab === "cobros" ? acuerdosConEstado.cobros : acuerdosConEstado.pagos;
  const filaAcuerdosFiltradas =
    filtroEstado === "todos" ? filaAcuerdos : filaAcuerdos.filter((f) => f.estado === filtroEstado);

  const resumenPorUnidad = useMemo(() => {
    const mapa = new Map<
      string,
      { unidadId: string; unidadNumero: string | null; clienteNombre: string; cobrado: number; pagado: number }
    >();
    for (const a of acuerdosCobro) {
      if (a.moneda !== "USD") continue;
      const entry = mapa.get(a.unidadId) ?? {
        unidadId: a.unidadId,
        unidadNumero: a.unidadNumero,
        clienteNombre: a.clienteNombre,
        cobrado: 0,
        pagado: 0,
      };
      entry.cobrado += sumaImportes(a.movimientos);
      mapa.set(a.unidadId, entry);
    }
    for (const a of acuerdosPago) {
      if (a.moneda !== "USD") continue;
      const entry = mapa.get(a.unidadId) ?? {
        unidadId: a.unidadId,
        unidadNumero: a.unidadNumero,
        clienteNombre: a.clienteNombre,
        cobrado: 0,
        pagado: 0,
      };
      entry.pagado += sumaImportes(a.movimientos);
      mapa.set(a.unidadId, entry);
    }
    return Array.from(mapa.values()).map((e) => ({
      ...e,
      margenUSD: e.cobrado - e.pagado,
      margenPct: margenPorcentaje(e.cobrado, e.pagado),
    }));
  }, [acuerdosCobro, acuerdosPago]);

  function exportarExcel() {
    let rows: Record<string, string | number>[];
    let filename: string;
    if (tab === "resumen") {
      rows = resumenPorUnidad.map((r) => ({
        Unidad: r.unidadNumero ?? "Sin número",
        Cliente: r.clienteNombre,
        "Total cobrado USD": r.cobrado,
        "Total pagado USD": r.pagado,
        "Margen USD": r.margenUSD,
        "Margen %": r.margenPct !== null ? Math.round(r.margenPct * 10) / 10 : "",
      }));
      filename = "cobranza-resumen-por-unidad.xlsx";
    } else {
      rows = filaAcuerdosFiltradas.map(({ acuerdo, pagado, pendiente, estado }) => ({
        Unidad: acuerdo.unidadNumero ?? "Sin número",
        [tab === "cobros" ? "Cliente" : "Proveedor"]: acuerdo.contraparte,
        Concepto: CONCEPTO_LABELS[acuerdo.concepto as keyof typeof CONCEPTO_LABELS] ?? acuerdo.concepto,
        Moneda: acuerdo.moneda,
        "Total acordado": acuerdo.totalAcordado,
        [tab === "cobros" ? "Cobrado" : "Pagado"]: pagado,
        Pendiente: pendiente,
        Estado: ESTADO_ACUERDO_LABELS[estado],
      }));
      filename = `cobranza-${tab}.xlsx`;
    }
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Cobranza");
    XLSX.writeFile(wb, filename);
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricaCard label="Cobrado USD (mes)" value={formatMoneda(metricas.cobradoMes, "USD")} />
        <MetricaCard label="Pagado USD (mes)" value={formatMoneda(metricas.pagadoMes, "USD")} />
        <MetricaCard
          label="Margen USD (mes)"
          value={formatMoneda(metricas.margenMes, "USD")}
          tono={metricas.margenMes >= 0 ? "positivo" : "negativo"}
        />
        <MetricaCard label="Cuotas vencidas" value={String(metricas.cuotasVencidas)} tono="negativo" />
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex gap-2">
          {(["cobros", "pagos", "resumen"] as const).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => {
                setTab(t);
                setExpandedId(null);
              }}
              className={`px-4 py-2 rounded-full text-sm font-bold transition-colors ${
                tab === t ? "bg-[#2F2F2F] text-white" : "bg-white border border-[#E5E5E5] text-stone-600"
              }`}
            >
              {t === "cobros" ? "Cobros" : t === "pagos" ? "Pagos" : "Resumen por unidad"}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2">
          {tab !== "resumen" && (
            <select
              value={filtroEstado}
              onChange={(e) => setFiltroEstado(e.target.value as EstadoAcuerdo | "todos")}
              className="rounded-lg border border-[#E5E5E5] px-3 py-2 text-sm text-[#2F2F2F] bg-white"
            >
              <option value="todos">Todos los estados</option>
              {(Object.keys(ESTADO_ACUERDO_LABELS) as EstadoAcuerdo[]).map((e) => (
                <option key={e} value={e}>
                  {ESTADO_ACUERDO_LABELS[e]}
                </option>
              ))}
            </select>
          )}
          <button
            type="button"
            onClick={exportarExcel}
            className="px-4 py-2 bg-white border border-[#E5E5E5] hover:border-stone-300 text-[#2F2F2F] font-bold text-sm rounded-lg transition-colors"
          >
            Exportar Excel
          </button>
          {tab !== "resumen" && (
            <button
              type="button"
              onClick={() => setNuevoAcuerdoTipo(tab === "cobros" ? "cobro" : "pago")}
              className="px-4 py-2 bg-[#D4B06A] hover:bg-[#c19f57] text-[#2F2F2F] font-bold text-sm rounded-lg transition-colors"
            >
              + Nuevo acuerdo
            </button>
          )}
        </div>
      </div>

      {tab === "resumen" ? (
        <div className="bg-white rounded-2xl border border-[#E5E5E5] overflow-hidden overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[#E5E5E5] text-left text-stone-500 text-xs uppercase tracking-wide">
                <th className="px-4 py-3 font-medium">Unidad</th>
                <th className="px-4 py-3 font-medium">Cliente</th>
                <th className="px-4 py-3 font-medium">Total cobrado</th>
                <th className="px-4 py-3 font-medium">Total pagado</th>
                <th className="px-4 py-3 font-medium">Margen USD</th>
                <th className="px-4 py-3 font-medium">Margen %</th>
              </tr>
            </thead>
            <tbody>
              {resumenPorUnidad.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-stone-400">
                    Todavía no hay acuerdos en USD cargados.
                  </td>
                </tr>
              )}
              {resumenPorUnidad.map((r) => (
                <tr
                  key={r.unidadId}
                  onClick={() => router.push(`/admin/unidades/${r.unidadId}`)}
                  className="border-b border-[#F0F0F0] last:border-0 hover:bg-stone-50 cursor-pointer"
                >
                  <td className="px-4 py-3 font-medium text-[#2F2F2F]">{r.unidadNumero ?? "Sin número"}</td>
                  <td className="px-4 py-3 text-stone-600">{r.clienteNombre}</td>
                  <td className="px-4 py-3 text-stone-600">{formatMoneda(r.cobrado, "USD")}</td>
                  <td className="px-4 py-3 text-stone-600">{formatMoneda(r.pagado, "USD")}</td>
                  <td className={`px-4 py-3 font-medium ${r.margenUSD >= 0 ? "text-emerald-700" : "text-red-700"}`}>
                    {formatMoneda(r.margenUSD, "USD")}
                  </td>
                  <td className="px-4 py-3 text-stone-600">
                    {r.margenPct !== null ? `${Math.round(r.margenPct * 10) / 10}%` : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-[#E5E5E5] overflow-hidden overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[#E5E5E5] text-left text-stone-500 text-xs uppercase tracking-wide">
                <th className="px-4 py-3 font-medium">Unidad</th>
                <th className="px-4 py-3 font-medium">{tab === "cobros" ? "Cliente" : "Proveedor"}</th>
                <th className="px-4 py-3 font-medium">Concepto</th>
                <th className="px-4 py-3 font-medium">Moneda</th>
                <th className="px-4 py-3 font-medium">Total acordado</th>
                <th className="px-4 py-3 font-medium">{tab === "cobros" ? "Cobrado" : "Pagado"}</th>
                <th className="px-4 py-3 font-medium">Pendiente</th>
                <th className="px-4 py-3 font-medium">Estado</th>
                <th className="px-4 py-3 font-medium">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {filaAcuerdosFiltradas.length === 0 && (
                <tr>
                  <td colSpan={9} className="px-4 py-8 text-center text-stone-400">
                    {tab === "cobros" ? "Todavía no hay acuerdos de cobro cargados." : "Todavía no hay acuerdos de pago cargados."}
                  </td>
                </tr>
              )}
              {filaAcuerdosFiltradas.map(({ acuerdo, pagado, pendiente, estado }) => (
                <FilaAcuerdo
                  key={acuerdo.id}
                  acuerdo={acuerdo}
                  pagado={pagado}
                  pendiente={pendiente}
                  estado={estado}
                  expanded={expandedId === acuerdo.id}
                  onToggle={() => setExpandedId(expandedId === acuerdo.id ? null : acuerdo.id)}
                  onRegistrarMovimiento={() => setMovimientoAcuerdo(acuerdo)}
                />
              ))}
            </tbody>
          </table>
        </div>
      )}

      {nuevoAcuerdoTipo && (
        <NuevoAcuerdoModal
          tipo={nuevoAcuerdoTipo}
          unidades={unidades}
          onClose={() => setNuevoAcuerdoTipo(null)}
          onCreated={() => {
            setNuevoAcuerdoTipo(null);
            router.refresh();
          }}
        />
      )}

      {movimientoAcuerdo && (
        <RegistrarMovimientoModal
          acuerdo={movimientoAcuerdo}
          onClose={() => setMovimientoAcuerdo(null)}
          onSaved={() => {
            setMovimientoAcuerdo(null);
            router.refresh();
          }}
        />
      )}
    </div>
  );
}

function MetricaCard({
  label,
  value,
  tono,
}: {
  label: string;
  value: string;
  tono?: "positivo" | "negativo";
}) {
  const color = tono === "positivo" ? "text-emerald-700" : tono === "negativo" ? "text-red-700" : "text-[#2F2F2F]";
  return (
    <div className="bg-white rounded-2xl border border-[#E5E5E5] p-5">
      <p className={`text-2xl font-bold ${color}`}>{value}</p>
      <p className="text-xs text-stone-500 mt-1">{label}</p>
    </div>
  );
}

function FilaAcuerdo({
  acuerdo,
  pagado,
  pendiente,
  estado,
  expanded,
  onToggle,
  onRegistrarMovimiento,
}: {
  acuerdo: AcuerdoConDetalle;
  pagado: number;
  pendiente: number;
  estado: EstadoAcuerdo;
  expanded: boolean;
  onToggle: () => void;
  onRegistrarMovimiento: () => void;
}) {
  return (
    <>
      <tr onClick={onToggle} className="border-b border-[#F0F0F0] last:border-0 hover:bg-stone-50 cursor-pointer">
        <td className="px-4 py-3 font-medium text-[#2F2F2F] whitespace-nowrap">
          {acuerdo.unidadNumero ?? "Sin número"}
        </td>
        <td className="px-4 py-3 text-stone-600">{acuerdo.contraparte}</td>
        <td className="px-4 py-3 text-stone-600">
          {CONCEPTO_LABELS[acuerdo.concepto as keyof typeof CONCEPTO_LABELS] ?? acuerdo.concepto}
        </td>
        <td className="px-4 py-3 text-stone-600">{acuerdo.moneda}</td>
        <td className="px-4 py-3 text-stone-600">{formatMoneda(acuerdo.totalAcordado, acuerdo.moneda)}</td>
        <td className="px-4 py-3 text-stone-600">{formatMoneda(pagado, acuerdo.moneda)}</td>
        <td className="px-4 py-3 text-stone-600">{formatMoneda(pendiente, acuerdo.moneda)}</td>
        <td className="px-4 py-3">
          <span className={`px-2 py-1 rounded-full text-xs font-bold ${ESTADO_ACUERDO_COLORS[estado]}`}>
            {ESTADO_ACUERDO_LABELS[estado]}
          </span>
        </td>
        <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
          <button
            type="button"
            onClick={onRegistrarMovimiento}
            className="px-2.5 py-1.5 bg-sage-500 hover:bg-sage-600 text-[#2F2F2F] font-bold text-xs rounded-lg transition-colors whitespace-nowrap"
          >
            Registrar movimiento
          </button>
        </td>
      </tr>
      {expanded && (
        <tr className="bg-[#f5f5f5]">
          <td colSpan={9} className="px-4 py-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <p className="text-xs font-bold uppercase tracking-wide text-stone-500 mb-2">Cuotas</p>
                {acuerdo.cuotas.length === 0 ? (
                  <p className="text-sm text-stone-400">Sin cuotas.</p>
                ) : (
                  <ul className="space-y-1.5">
                    {acuerdo.cuotas.map((c) => (
                      <li key={c.id} className="text-sm flex items-center justify-between gap-2 bg-white rounded-lg px-3 py-2">
                        <span className="truncate">
                          {c.descripcion} · {formatMoneda(c.importe, acuerdo.moneda)}
                          {c.vencimiento ? ` · vence ${formatFecha(c.vencimiento)}` : ""}
                        </span>
                        <span
                          className={`px-2 py-0.5 rounded-full text-xs font-bold whitespace-nowrap ${ESTADO_CUOTA_COLORS[c.estado as keyof typeof ESTADO_CUOTA_COLORS] ?? "bg-stone-100 text-stone-500"}`}
                        >
                          {ESTADO_CUOTA_LABELS[c.estado as keyof typeof ESTADO_CUOTA_LABELS] ?? c.estado}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
              <div>
                <p className="text-xs font-bold uppercase tracking-wide text-stone-500 mb-2">Movimientos</p>
                {acuerdo.movimientos.length === 0 ? (
                  <p className="text-sm text-stone-400">Todavía no hay movimientos registrados.</p>
                ) : (
                  <ul className="space-y-1.5">
                    {acuerdo.movimientos.map((m) => (
                      <li key={m.id} className="text-sm bg-white rounded-lg px-3 py-2">
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-medium text-[#2F2F2F]">
                            {formatFecha(m.fecha)} · {formatMoneda(m.importe, acuerdo.moneda)}
                          </span>
                          <span className="text-stone-500 text-xs">{MODALIDAD_LABELS[m.modalidad as keyof typeof MODALIDAD_LABELS] ?? m.modalidad}</span>
                        </div>
                        {m.notas && <p className="text-xs text-stone-400 mt-0.5">{m.notas}</p>}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          </td>
        </tr>
      )}
    </>
  );
}
