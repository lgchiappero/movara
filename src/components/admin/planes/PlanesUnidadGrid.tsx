"use client";

import { Fragment, useMemo, useState } from "react";
import Link from "next/link";
import * as XLSX from "xlsx";
import {
  ESTADO_PLAN_UNIDAD_LABELS as ESTADO_LABELS_COBRO,
  ESTADO_PLAN_UNIDAD_COLORS,
  FILTRO_ESTADO_VISIBLES,
  FILTRO_ESTADO_LABELS as FILTRO_LABELS_COBRO,
  FILTRO_PERIODO_OPTIONS,
  FILTRO_PERIODO_LABELS,
  cumpleFiltroEstado,
  pagadoEnRango,
  fechaCorta,
  type EstadoPlanUnidad,
  type FilaPlanUnidad,
  type FiltroEstadoPlan,
  type FiltroPeriodo,
} from "@/lib/cobranza/planes-unidad";
import { calcularRangoPeriodo } from "@/lib/cobranza/periodo";
import type { TipoAcuerdo } from "@/lib/cobranza/constantes";
import { useDebouncedValue } from "@/lib/hooks/useDebouncedValue";
import DetallePlanesUnidad, { TEXTOS_TIPO } from "@/components/admin/planes/DetallePlanesUnidad";
import type { AccionesPlanes } from "@/components/admin/planes/useAccionesPlanes";

type FiltroMoneda = "USD" | "ARS" | "todos";

// En Pagos no hay planes con cuotas sino pagos directos — mismos estados,
// con el vocabulario de pagos.
const ESTADO_LABELS_PAGO: Record<EstadoPlanUnidad, string> = {
  sin_plan: "Sin pagos",
  pendiente: "Pendiente",
  en_curso: "Parcial",
  saldado: "Pagado",
};
const FILTRO_LABELS_PAGO: Record<FiltroEstadoPlan, string> = {
  ...FILTRO_LABELS_COBRO,
  sin_plan: "Sin pagos",
  en_curso: "Parcial",
  saldado: "Pagado",
  vencidas: "Con pagos vencidos",
  semana: "Vencen esta semana",
};

const PAGE_SIZE = 50;

const selectClass = "rounded-lg border border-[#E5E5E5] px-2.5 py-1.5 text-sm text-[#2F2F2F] bg-white";
const th = "px-2 py-2 font-medium";
const td = "px-2 py-2";
// Columnas que se ocultan en mobile — quedan Unidad, Cliente, Saldo, Estado y Acciones.
const soloDesktop = "hidden md:table-cell";

function formatMoneda(value: number, moneda: string): string {
  return `${moneda} ${value.toLocaleString("es-AR", { maximumFractionDigits: 0 })}`;
}

/** Grilla principal de Cobranza / Pagos — una fila por unidad (no por
 * cuota ni por plan), compacta para que entre sin scroll horizontal. Click
 * en la fila (o en el monto cobrado) despliega el detalle con los pagos. */
export default function PlanesUnidadGrid({
  tipo,
  filas,
  rol,
  acciones,
  estadoInicial = "todos",
  monedaInicial,
  ahora = new Date(),
}: {
  tipo: TipoAcuerdo;
  filas: FilaPlanUnidad[];
  rol: string;
  acciones: AccionesPlanes;
  estadoInicial?: FiltroEstadoPlan;
  monedaInicial?: "USD" | "ARS";
  /** Para calcular los rangos de período (inyectable en tests). */
  ahora?: Date;
}) {
  const esCobro = tipo === "cobro";
  const t = TEXTOS_TIPO[tipo];
  const ESTADO_LABELS = esCobro ? ESTADO_LABELS_COBRO : ESTADO_LABELS_PAGO;
  const FILTRO_LABELS = esCobro ? FILTRO_LABELS_COBRO : FILTRO_LABELS_PAGO;
  const labelPagado = esCobro ? "Cobrado" : "Pagado";
  const labelSaldo = esCobro ? "Saldo" : "Pendiente";

  const [filtroEstado, setFiltroEstado] = useState<FiltroEstadoPlan>(estadoInicial);
  const [filtroPeriodo, setFiltroPeriodo] = useState<FiltroPeriodo>("todo");
  const [desde, setDesde] = useState("");
  const [hasta, setHasta] = useState("");
  const [filtroMoneda, setFiltroMoneda] = useState<FiltroMoneda>(monedaInicial ?? "todos");
  const [busqueda, setBusqueda] = useState("");
  const busquedaDebounced = useDebouncedValue(busqueda, 300);
  const [pagina, setPagina] = useState(1);
  const [expandida, setExpandida] = useState<string | null>(null);

  // Rango del período elegido — null = todo el historial (o un rango
  // personalizado todavía incompleto).
  const rango = useMemo(() => {
    if (filtroPeriodo === "todo") return null;
    if (filtroPeriodo === "personalizado" && (!desde || !hasta)) return null;
    return calcularRangoPeriodo(filtroPeriodo, ahora, desde, hasta);
  }, [filtroPeriodo, desde, hasta, ahora]);

  const filtradas = useMemo(() => {
    const q = busquedaDebounced.trim().toLowerCase();
    return filas.flatMap((f) => {
      if (filtroMoneda !== "todos" && f.moneda !== filtroMoneda) return [];
      if (!cumpleFiltroEstado(f, filtroEstado)) return [];
      if (q) {
        const proveedores = f.planes.map((p) => p.contraparte).join(" ");
        const haystack = `${f.unidad.numeroUnidad ?? ""} ${f.unidad.clienteNombre} ${f.unidad.modelo ?? ""} ${proveedores}`.toLowerCase();
        if (!haystack.includes(q)) return [];
      }
      // Con período: solo las unidades con pagos en ese rango, y el monto
      // de la columna Cobrado/Pagado pasa a ser el del período.
      const enPeriodo = rango ? pagadoEnRango(f, rango) : null;
      if (enPeriodo && enPeriodo.cantidad === 0) return [];
      return [{ fila: f, enPeriodo }];
    });
  }, [filas, filtroMoneda, filtroEstado, busquedaDebounced, rango]);

  // Volver a la página 1 cada vez que cambia un filtro (ajuste de estado
  // durante el render, no en un efecto).
  const filtroKey = `${filtroMoneda}|${filtroEstado}|${busquedaDebounced}|${rango?.desde.getTime()}|${rango?.hasta.getTime()}`;
  const [filtroKeyAnterior, setFiltroKeyAnterior] = useState(filtroKey);
  if (filtroKeyAnterior !== filtroKey) {
    setFiltroKeyAnterior(filtroKey);
    setPagina(1);
  }

  const totalPaginas = Math.max(1, Math.ceil(filtradas.length / PAGE_SIZE));
  const paginaEfectiva = Math.min(pagina, totalPaginas);
  const filasPagina = filtradas.slice((paginaEfectiva - 1) * PAGE_SIZE, paginaEfectiva * PAGE_SIZE);

  // Opciones del selector de estado: las principales, más la activa si
  // llegó por URL un filtro que no se lista (ej: "con saldo" del dashboard).
  const opcionesEstado = FILTRO_ESTADO_VISIBLES.includes(filtroEstado)
    ? FILTRO_ESTADO_VISIBLES
    : [...FILTRO_ESTADO_VISIBLES, filtroEstado];

  /** Click en el monto cobrado: despliega el detalle y lleva a la lista de pagos. */
  function verPagos(key: string) {
    setExpandida(key);
    requestAnimationFrame(() => {
      document
        .querySelector(`[data-testid="detalle-${key}"] [data-pagos]`)
        ?.scrollIntoView?.({ behavior: "smooth", block: "nearest" });
    });
  }

  function exportarExcel() {
    const rows = filtradas.map(({ fila: f, enPeriodo }) => ({
      Unidad: f.unidad.numeroUnidad ?? "Sin número",
      Cliente: f.unidad.clienteNombre,
      Modelo: f.unidad.modelo ?? "—",
      ...(esCobro
        ? { "Valor unidad (USD)": f.unidad.precioCliente ?? "", "Plan de pago": f.resumenPlan || "Sin plan" }
        : { Proveedores: f.planes.map((p) => p.contraparte).join(", ") || "—" }),
      Moneda: f.moneda,
      Total: f.totalPlan,
      [labelPagado]: f.pagado,
      ...(enPeriodo ? { [`${labelPagado} en el período`]: enPeriodo.monto } : {}),
      [labelSaldo]: f.saldo,
      "%": Math.round(f.porcentaje),
      Estado: ESTADO_LABELS[f.estado],
      "Último pago": fechaCorta(f.ultimoPagoFecha),
    }));
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, esCobro ? "Cobranza" : "Pagos");
    XLSX.writeFile(wb, esCobro ? "cobranza.xlsx" : "pagos.xlsx");
  }

  const columnas = 8;

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-sm font-bold uppercase tracking-widest text-stone-500">
          {esCobro ? "Cobranza por unidad" : "Pagos a proveedores por unidad"}
        </h2>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={exportarExcel}
            className="px-3 py-1.5 bg-white border border-[#E5E5E5] hover:border-stone-300 text-[#2F2F2F] font-bold text-sm rounded-lg transition-colors"
          >
            Exportar Excel
          </button>
          <button
            type="button"
            onClick={() => acciones.abrirNuevoPlan()}
            className="px-3 py-1.5 bg-[#D4B06A] hover:bg-[#c19f57] text-[#2F2F2F] font-bold text-sm rounded-lg transition-colors"
          >
            {t.nuevoPlan}
          </button>
        </div>
      </div>

      {/* Filtros */}
      <div className="flex flex-wrap items-center gap-2 bg-white rounded-xl border border-[#E5E5E5] p-2.5">
        <select
          aria-label="Filtrar por estado"
          value={filtroEstado}
          onChange={(e) => setFiltroEstado(e.target.value as FiltroEstadoPlan)}
          className={selectClass}
        >
          {opcionesEstado.map((e) => (
            <option key={e} value={e}>
              {FILTRO_LABELS[e]}
            </option>
          ))}
        </select>
        <select
          aria-label="Filtrar por período"
          value={filtroPeriodo}
          onChange={(e) => setFiltroPeriodo(e.target.value as FiltroPeriodo)}
          className={selectClass}
        >
          {FILTRO_PERIODO_OPTIONS.map((p) => (
            <option key={p} value={p}>
              {FILTRO_PERIODO_LABELS[p]}
            </option>
          ))}
        </select>
        {filtroPeriodo === "personalizado" && (
          <span className="flex items-center gap-1">
            <input type="date" aria-label="Desde" value={desde} onChange={(e) => setDesde(e.target.value)} className={selectClass} />
            <span className="text-stone-400 text-xs">a</span>
            <input type="date" aria-label="Hasta" value={hasta} onChange={(e) => setHasta(e.target.value)} className={selectClass} />
          </span>
        )}
        <select
          aria-label="Filtrar por moneda"
          value={filtroMoneda}
          onChange={(e) => setFiltroMoneda(e.target.value as FiltroMoneda)}
          className={selectClass}
        >
          <option value="todos">USD y ARS</option>
          <option value="USD">USD</option>
          <option value="ARS">ARS</option>
        </select>
        <input
          type="search"
          aria-label="Buscar"
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
          placeholder="Buscar cliente o N° de unidad..."
          className={`${selectClass} flex-1 min-w-[12rem]`}
        />
      </div>

      <div className="bg-white rounded-2xl border border-[#E5E5E5] overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[#E5E5E5] text-left text-stone-500 text-xs uppercase tracking-wide">
              <th className={th}>Unidad</th>
              <th className={th}>Cliente</th>
              <th className={`${th} ${soloDesktop} text-right`}>Total</th>
              <th className={`${th} ${soloDesktop} text-right`}>{rango ? `${labelPagado} (período)` : labelPagado}</th>
              <th className={`${th} text-right`}>{labelSaldo}</th>
              <th className={`${th} ${soloDesktop}`}>%</th>
              <th className={th}>Estado</th>
              <th className={th}>
                <span className="sr-only">Acciones</span>
              </th>
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
            {filasPagina.map(({ fila: f, enPeriodo }) => {
              const abierta = expandida === f.key;
              const conSaldo = f.planes.filter(
                (p) => p.movimientos.reduce((a, m) => a + m.importe, 0) < p.totalAcordado - 0.01
              );
              const sinPlan = f.planes.length === 0;
              return (
                <Fragment key={f.key}>
                  <tr
                    onClick={() => setExpandida(abierta ? null : f.key)}
                    className="border-b border-[#F0F0F0] last:border-0 hover:bg-stone-50 cursor-pointer"
                    aria-expanded={abierta}
                  >
                    <td className={`${td} whitespace-nowrap`}>
                      <Link
                        href={`/admin/unidades/${f.unidad.id}`}
                        onClick={(e) => e.stopPropagation()}
                        className="font-medium text-[#2F2F2F] hover:text-sage-600 underline-offset-2 hover:underline"
                      >
                        {f.unidad.numeroUnidad ?? "Sin número"}
                      </Link>
                      {f.moneda !== "USD" && <span className="ml-1 text-xs text-stone-400">({f.moneda})</span>}
                      {f.unidad.modelo && <span className="block text-xs text-stone-400">{f.unidad.modelo}</span>}
                    </td>
                    <td className={`${td} text-stone-600 max-w-[12rem] truncate`} title={f.unidad.clienteNombre}>
                      {f.unidad.clienteNombre}
                    </td>
                    <td className={`${td} ${soloDesktop} text-right whitespace-nowrap`}>
                      {!sinPlan ? (
                        <span className="text-stone-600">{formatMoneda(f.totalPlan, f.moneda)}</span>
                      ) : esCobro && f.unidad.precioCliente != null ? (
                        <span className="text-stone-400" title="Valor de la unidad (todavía sin plan de pago)">
                          {formatMoneda(f.unidad.precioCliente, "USD")}
                        </span>
                      ) : (
                        <span className="text-stone-300">—</span>
                      )}
                    </td>
                    <td className={`${td} ${soloDesktop} text-right whitespace-nowrap`}>
                      {sinPlan ? (
                        <span className="text-stone-300">—</span>
                      ) : (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            verPagos(f.key);
                          }}
                          title={esCobro ? "Ver pagos recibidos" : "Ver pagos"}
                          className="text-right text-stone-700 hover:text-sage-700 underline decoration-dotted underline-offset-2"
                        >
                          {formatMoneda(enPeriodo ? enPeriodo.monto : f.pagado, f.moneda)}
                          <span className="block text-xs text-stone-400">
                            {enPeriodo
                              ? `${enPeriodo.cantidad} pago${enPeriodo.cantidad === 1 ? "" : "s"}`
                              : f.ultimoPagoFecha
                                ? `últ. ${fechaCorta(f.ultimoPagoFecha)}`
                                : "sin pagos"}
                          </span>
                        </button>
                      )}
                    </td>
                    <td className={`${td} text-right whitespace-nowrap ${f.saldo > 0 ? "text-red-700 font-medium" : "text-stone-500"}`}>
                      {sinPlan ? <span className="text-stone-300">—</span> : formatMoneda(f.saldo, f.moneda)}
                    </td>
                    <td className={`${td} ${soloDesktop} w-24`}>
                      <div
                        className="h-1.5 bg-stone-100 rounded-full overflow-hidden"
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
                    <td className={`${td} whitespace-nowrap`}>
                      <span className={`px-1.5 py-0.5 rounded-full text-[11px] font-bold ${ESTADO_PLAN_UNIDAD_COLORS[f.estado]}`}>
                        {ESTADO_LABELS[f.estado]}
                      </span>
                      {f.tieneVencidas && (
                        <span
                          className="ml-1 px-1.5 py-0.5 rounded-full text-[11px] font-bold bg-red-100 text-red-700"
                          title={esCobro ? "Tiene cuotas vencidas" : "Tiene pagos vencidos"}
                        >
                          Vencida
                        </span>
                      )}
                    </td>
                    <td className={`${td} whitespace-nowrap text-right space-x-2`} onClick={(e) => e.stopPropagation()}>
                      {sinPlan || !esCobro ? (
                        <button
                          type="button"
                          onClick={() => acciones.abrirNuevoPlan(f.unidad.id)}
                          className="text-sage-600 hover:text-sage-700 font-bold text-xs"
                        >
                          {esCobro ? "Crear plan" : "+ Pago"}
                        </button>
                      ) : null}
                      {esCobro && conSaldo.length > 0 && (
                        <button
                          type="button"
                          onClick={() => (conSaldo.length === 1 ? acciones.abrirRegistrarPago(conSaldo[0]) : setExpandida(f.key))}
                          className="text-sage-600 hover:text-sage-700 font-bold text-xs"
                        >
                          Registrar pago
                        </button>
                      )}
                    </td>
                  </tr>
                  {abierta && (
                    <tr className="bg-[#f5f5f5]">
                      <td colSpan={columnas} className="px-2 py-3 md:px-4">
                        <DetallePlanesUnidad tipo={tipo} fila={f} rol={rol} acciones={acciones} ahora={ahora} />
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
