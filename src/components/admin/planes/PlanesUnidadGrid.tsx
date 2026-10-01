"use client";

import { Fragment, useMemo, useState } from "react";
import Link from "next/link";
import * as XLSX from "xlsx";
import {
  ESTADO_PLAN_UNIDAD_LABELS,
  ESTADO_PLAN_UNIDAD_COLORS,
  FILTRO_ESTADO_OPTIONS,
  FILTRO_ESTADO_LABELS,
  cumpleFiltroEstado,
  type FilaPlanUnidad,
  type FiltroEstadoPlan,
} from "@/lib/cobranza/planes-unidad";
import type { TipoAcuerdo } from "@/lib/cobranza/constantes";
import { useDebouncedValue } from "@/lib/hooks/useDebouncedValue";
import DetallePlanesUnidad, { TEXTOS_TIPO } from "@/components/admin/planes/DetallePlanesUnidad";
import type { AccionesPlanes } from "@/components/admin/planes/useAccionesPlanes";

type FiltroMoneda = "USD" | "ARS" | "todos";

const PAGE_SIZE = 50;

function formatMoneda(value: number, moneda: string): string {
  return `${moneda} ${value.toLocaleString("es-AR", { maximumFractionDigits: 0 })}`;
}

function formatFecha(value: string | null): string {
  return value ? new Date(value).toLocaleDateString("es-AR", { timeZone: "UTC" }) : "—";
}

/** Grilla principal de Cobranza / Pagos — una fila por unidad (no por
 * cuota ni por plan), con el saldo de la unidad completa. Click en la fila
 * despliega el detalle (planes, cuotas y pagos). */
export default function PlanesUnidadGrid({
  tipo,
  filas,
  rol,
  acciones,
  estadoInicial = "todos",
  monedaInicial,
}: {
  tipo: TipoAcuerdo;
  filas: FilaPlanUnidad[];
  rol: string;
  acciones: AccionesPlanes;
  estadoInicial?: FiltroEstadoPlan;
  monedaInicial?: "USD" | "ARS";
}) {
  const esCobro = tipo === "cobro";
  const t = TEXTOS_TIPO[tipo];
  const [filtroEstado, setFiltroEstado] = useState<FiltroEstadoPlan>(estadoInicial);
  const [filtroMoneda, setFiltroMoneda] = useState<FiltroMoneda>(monedaInicial ?? "todos");
  const [busqueda, setBusqueda] = useState("");
  const busquedaDebounced = useDebouncedValue(busqueda, 300);
  const [pagina, setPagina] = useState(1);
  const [expandida, setExpandida] = useState<string | null>(null);

  const filtradas = useMemo(() => {
    const q = busquedaDebounced.trim().toLowerCase();
    return filas.filter((f) => {
      if (filtroMoneda !== "todos" && f.moneda !== filtroMoneda) return false;
      if (!cumpleFiltroEstado(f, filtroEstado)) return false;
      if (q) {
        const proveedores = f.planes.map((p) => p.contraparte).join(" ");
        const haystack = `${f.unidad.numeroUnidad ?? ""} ${f.unidad.clienteNombre} ${f.unidad.modelo ?? ""} ${proveedores}`.toLowerCase();
        if (!haystack.includes(q)) return false;
      }
      return true;
    });
  }, [filas, filtroMoneda, filtroEstado, busquedaDebounced]);

  // Volver a la página 1 cada vez que cambia un filtro (ajuste de estado
  // durante el render, no en un efecto).
  const filtroKey = `${filtroMoneda}|${filtroEstado}|${busquedaDebounced}`;
  const [filtroKeyAnterior, setFiltroKeyAnterior] = useState(filtroKey);
  if (filtroKeyAnterior !== filtroKey) {
    setFiltroKeyAnterior(filtroKey);
    setPagina(1);
  }

  const totalPaginas = Math.max(1, Math.ceil(filtradas.length / PAGE_SIZE));
  const paginaEfectiva = Math.min(pagina, totalPaginas);
  const filasPagina = filtradas.slice((paginaEfectiva - 1) * PAGE_SIZE, paginaEfectiva * PAGE_SIZE);

  function exportarExcel() {
    const rows = filtradas.map((f) => ({
      Unidad: f.unidad.numeroUnidad ?? "Sin número",
      Cliente: f.unidad.clienteNombre,
      Modelo: f.unidad.modelo ?? "—",
      ...(esCobro
        ? { "Valor unidad (USD)": f.unidad.precioCliente ?? "", "Plan de pago": f.resumenPlan || "Sin plan" }
        : { Proveedores: f.planes.map((p) => p.contraparte).join(", ") || "—" }),
      Moneda: f.moneda,
      "Total del plan": f.totalPlan,
      [t.pagado]: f.pagado,
      "Saldo pendiente": f.saldo,
      "%": Math.round(f.porcentaje),
      Estado: ESTADO_PLAN_UNIDAD_LABELS[f.estado],
      "Último pago": formatFecha(f.ultimoPagoFecha),
    }));
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, esCobro ? "Cobranza" : "Pagos");
    XLSX.writeFile(wb, esCobro ? "cobranza.xlsx" : "pagos.xlsx");
  }

  const columnas = 11;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-sm font-bold uppercase tracking-widest text-stone-500">
          {esCobro ? "Cobranza por unidad" : "Pagos a proveedores por unidad"}
        </h2>
        <div className="flex flex-wrap items-center gap-2">
          <select
            aria-label="Filtrar por estado"
            value={filtroEstado}
            onChange={(e) => setFiltroEstado(e.target.value as FiltroEstadoPlan)}
            className="rounded-lg border border-[#E5E5E5] px-3 py-2 text-sm text-[#2F2F2F] bg-white"
          >
            {FILTRO_ESTADO_OPTIONS.map((e) => (
              <option key={e} value={e}>
                {FILTRO_ESTADO_LABELS[e]}
              </option>
            ))}
          </select>
          <select
            aria-label="Filtrar por moneda"
            value={filtroMoneda}
            onChange={(e) => setFiltroMoneda(e.target.value as FiltroMoneda)}
            className="rounded-lg border border-[#E5E5E5] px-3 py-2 text-sm text-[#2F2F2F] bg-white"
          >
            <option value="todos">Todas las monedas</option>
            <option value="USD">USD</option>
            <option value="ARS">ARS</option>
          </select>
          <input
            type="text"
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            placeholder={esCobro ? "Buscar por unidad, cliente o modelo..." : "Buscar por unidad, cliente o proveedor..."}
            className="rounded-lg border border-[#E5E5E5] px-3 py-2 text-sm w-64"
          />
          <button
            type="button"
            onClick={exportarExcel}
            className="px-4 py-2 bg-white border border-[#E5E5E5] hover:border-stone-300 text-[#2F2F2F] font-bold text-sm rounded-lg transition-colors"
          >
            Exportar Excel
          </button>
          <button
            type="button"
            onClick={() => acciones.abrirNuevoPlan()}
            className="px-4 py-2 bg-[#D4B06A] hover:bg-[#c19f57] text-[#2F2F2F] font-bold text-sm rounded-lg transition-colors"
          >
            {t.nuevoPlan}
          </button>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-[#E5E5E5] overflow-hidden overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[#E5E5E5] text-left text-stone-500 text-xs uppercase tracking-wide">
              <th className="px-4 py-3 font-medium">Unidad</th>
              <th className="px-4 py-3 font-medium">Cliente</th>
              <th className="px-4 py-3 font-medium">Modelo</th>
              {esCobro ? (
                <>
                  <th className="px-4 py-3 font-medium">Valor total unidad</th>
                  <th className="px-4 py-3 font-medium">Plan de pago</th>
                </>
              ) : (
                <>
                  <th className="px-4 py-3 font-medium">Proveedores</th>
                  <th className="px-4 py-3 font-medium">Total a pagar</th>
                </>
              )}
              <th className="px-4 py-3 font-medium">{esCobro ? "Total cobrado" : "Pagado"}</th>
              <th className="px-4 py-3 font-medium">{esCobro ? "Saldo pendiente" : "Pendiente"}</th>
              <th className="px-4 py-3 font-medium">{esCobro ? "% cobrado" : "% pagado"}</th>
              <th className="px-4 py-3 font-medium">Estado</th>
              <th className="px-4 py-3 font-medium">Fecha último pago</th>
              <th className="px-4 py-3 font-medium">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {filtradas.length === 0 && (
              <tr>
                <td colSpan={columnas} className="px-4 py-8 text-center text-stone-400">
                  Ninguna unidad coincide con los filtros.
                </td>
              </tr>
            )}
            {filasPagina.map((f) => {
              const abierta = expandida === f.key;
              const conSaldo = f.planes.filter((p) => p.movimientos.reduce((a, m) => a + m.importe, 0) < p.totalAcordado - 0.01);
              return (
                <Fragment key={f.key}>
                  <tr
                    onClick={() => setExpandida(abierta ? null : f.key)}
                    className="border-b border-[#F0F0F0] last:border-0 hover:bg-stone-50 cursor-pointer"
                    aria-expanded={abierta}
                  >
                    <td className="px-4 py-3 font-medium whitespace-nowrap">
                      <Link
                        href={`/admin/unidades/${f.unidad.id}`}
                        onClick={(e) => e.stopPropagation()}
                        className="text-[#2F2F2F] hover:text-sage-600 underline-offset-2 hover:underline"
                      >
                        {f.unidad.numeroUnidad ?? "Sin número"}
                      </Link>
                      {f.moneda !== "USD" && <span className="ml-1 text-xs text-stone-400">({f.moneda})</span>}
                    </td>
                    <td className="px-4 py-3 text-stone-600">{f.unidad.clienteNombre}</td>
                    <td className="px-4 py-3 text-stone-600">{f.unidad.modelo ?? "—"}</td>
                    {esCobro ? (
                      <>
                        <td className="px-4 py-3 text-stone-600 whitespace-nowrap">
                          {f.unidad.precioCliente != null ? formatMoneda(f.unidad.precioCliente, "USD") : "—"}
                        </td>
                        <td className="px-4 py-3 text-stone-600">
                          {f.planes.length === 0 ? (
                            <span className="text-stone-400">Sin plan</span>
                          ) : (
                            <>
                              <span>{f.resumenPlan || "Sin cuotas"}</span>
                              {f.planes[0].descripcion && (
                                <span className="block text-xs text-stone-400">{f.planes[0].descripcion}</span>
                              )}
                            </>
                          )}
                        </td>
                      </>
                    ) : (
                      <>
                        <td className="px-4 py-3 text-stone-600">
                          {f.planes.length === 0 ? <span className="text-stone-400">—</span> : f.planes.map((p) => p.contraparte).join(", ")}
                        </td>
                        <td className="px-4 py-3 text-stone-600 whitespace-nowrap">{formatMoneda(f.totalPlan, f.moneda)}</td>
                      </>
                    )}
                    <td className="px-4 py-3 text-stone-600 whitespace-nowrap">{formatMoneda(f.pagado, f.moneda)}</td>
                    <td className={`px-4 py-3 whitespace-nowrap ${f.saldo > 0 ? "text-red-700 font-medium" : "text-stone-600"}`}>
                      {formatMoneda(f.saldo, f.moneda)}
                    </td>
                    <td className="px-4 py-3 min-w-[110px]">
                      <div
                        className="h-2 bg-stone-100 rounded-full overflow-hidden"
                        role="progressbar"
                        aria-valuenow={Math.round(f.porcentaje)}
                        aria-valuemin={0}
                        aria-valuemax={100}
                      >
                        <div
                          className={`h-full ${f.estado === "saldado" ? "bg-emerald-500" : "bg-[#D4B06A]"}`}
                          style={{ width: `${f.porcentaje}%` }}
                        />
                      </div>
                      <span className="text-xs text-stone-500">{Math.round(f.porcentaje)}%</span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-1 rounded-full text-xs font-bold whitespace-nowrap ${ESTADO_PLAN_UNIDAD_COLORS[f.estado]}`}>
                        {ESTADO_PLAN_UNIDAD_LABELS[f.estado]}
                      </span>
                      {f.tieneVencidas && (
                        <span className="ml-1 px-2 py-1 rounded-full text-xs font-bold bg-red-100 text-red-700 whitespace-nowrap">
                          Vencida
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-stone-600 whitespace-nowrap">{formatFecha(f.ultimoPagoFecha)}</td>
                    <td className="px-4 py-3 whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                      {f.planes.length === 0 || !esCobro ? (
                        <button
                          type="button"
                          onClick={() => acciones.abrirNuevoPlan(f.unidad.id)}
                          className="text-sage-600 hover:text-sage-700 font-bold text-xs mr-3"
                        >
                          {esCobro ? "Crear plan" : "+ Plan"}
                        </button>
                      ) : null}
                      {conSaldo.length > 0 && (
                        <button
                          type="button"
                          onClick={() =>
                            conSaldo.length === 1 ? acciones.abrirRegistrarPago(conSaldo[0]) : setExpandida(f.key)
                          }
                          className="text-sage-600 hover:text-sage-700 font-bold text-xs"
                        >
                          Registrar pago
                        </button>
                      )}
                    </td>
                  </tr>
                  {abierta && (
                    <tr className="bg-[#f5f5f5]">
                      <td colSpan={columnas} className="px-4 py-4">
                        <DetallePlanesUnidad tipo={tipo} fila={f} rol={rol} acciones={acciones} />
                      </td>
                    </tr>
                  )}
                </Fragment>
              );
            })}
          </tbody>
        </table>
      </div>

      {totalPaginas > 1 && (
        <div className="flex items-center justify-between pt-1">
          <button
            type="button"
            disabled={paginaEfectiva <= 1}
            onClick={() => setPagina(paginaEfectiva - 1)}
            className="px-4 py-2 rounded-lg text-sm font-bold border border-[#E5E5E5] text-[#2F2F2F] hover:border-stone-300 disabled:opacity-40 transition-colors"
          >
            ← Anterior
          </button>
          <span className="text-xs text-stone-400">
            Página {paginaEfectiva} de {totalPaginas} ({filtradas.length} unidades)
          </span>
          <button
            type="button"
            disabled={paginaEfectiva >= totalPaginas}
            onClick={() => setPagina(paginaEfectiva + 1)}
            className="px-4 py-2 rounded-lg text-sm font-bold border border-[#E5E5E5] text-[#2F2F2F] hover:border-stone-300 disabled:opacity-40 transition-colors"
          >
            Siguiente →
          </button>
        </div>
      )}
    </div>
  );
}
