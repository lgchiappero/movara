"use client";

import { Fragment, useMemo, useState } from "react";
import Link from "next/link";
import { CONCEPTO_LABELS, CONCEPTO_PAGO_UNIDAD_OPTIONS } from "@/lib/cobranza/constantes";
import { sumaImportes } from "@/lib/cobranza/calc";
import {
  estadoPagoUnidad,
  ESTADO_PAGO_UNIDAD_LABELS,
  ESTADO_PAGO_UNIDAD_COLORS,
  type EstadoPagoUnidad,
} from "@/lib/cobranza/pagos-unidad";
import { useDebouncedValue } from "@/lib/hooks/useDebouncedValue";
import { exportarExcel } from "@/lib/admin/exportar-excel";
import {
  fechaLarga,
  pagadoEnRangoPlanes,
  rangoDesdeFiltro,
  type FiltroPeriodo,
} from "@/lib/cobranza/planes-unidad";
import FiltroPeriodoSelect, { selectFiltroClass } from "@/components/admin/planes/FiltroPeriodo";
import { PlanDePago } from "@/components/admin/planes/DetallePlanesUnidad";
import type { AccionesPlanes } from "@/components/admin/planes/useAccionesPlanes";
import type { AcuerdoConDetalle } from "@/lib/cobranza/types";

type FiltroEstado = EstadoPagoUnidad | "todos" | "con_saldo";

const FILTRO_ESTADO_LABELS: Record<FiltroEstado, string> = {
  todos: "Todos los estados",
  ...ESTADO_PAGO_UNIDAD_LABELS,
  con_saldo: "Con saldo pendiente",
};

const selectClass = selectFiltroClass;
const th = "px-2 py-2 font-medium";
const td = "px-2 py-2";
const soloDesktop = "hidden md:table-cell";
const PAGE_SIZE = 50;

function formatMoneda(value: number, moneda: string): string {
  return `${moneda} ${value.toLocaleString("es-AR", { maximumFractionDigits: 0 })}`;
}

/** Tab "Por unidad" de /admin/pagos: un renglón por pago a proveedor
 * (fábrica o logística nacional) de cada unidad. Click despliega el plan
 * con sus cuotas y los pagos realizados. */
export default function PagosPorUnidadGrid({
  planes,
  rol,
  acciones,
  estadoInicial = "todos",
  ahora = new Date(),
}: {
  planes: AcuerdoConDetalle[];
  rol: string;
  acciones: AccionesPlanes;
  estadoInicial?: FiltroEstado;
  ahora?: Date;
}) {
  const [filtroEstado, setFiltroEstado] = useState<FiltroEstado>(estadoInicial);
  const [filtroConcepto, setFiltroConcepto] = useState<string>("todos");
  const [filtroPeriodo, setFiltroPeriodo] = useState<FiltroPeriodo>("todo");
  const [desde, setDesde] = useState("");
  const [hasta, setHasta] = useState("");
  const [busqueda, setBusqueda] = useState("");
  const busquedaDebounced = useDebouncedValue(busqueda, 300);
  const [pagina, setPagina] = useState(1);
  const [expandida, setExpandida] = useState<string | null>(null);

  const filas = useMemo(
    () =>
      planes
        .map((plan) => {
          const pagado = sumaImportes(plan.movimientos);
          return {
            plan,
            pagado,
            pendiente: Math.max(0, plan.totalAcordado - pagado),
            estado: estadoPagoUnidad(plan, ahora),
            ultimoPago: plan.movimientos.reduce<string | null>((max, m) => (max === null || m.fecha > max ? m.fecha : max), null),
          };
        })
        .sort(
          (a, b) =>
            (b.plan.unidadNumero ?? "").localeCompare(a.plan.unidadNumero ?? "") ||
            b.plan.createdAt.localeCompare(a.plan.createdAt)
        ),
    [planes, ahora]
  );

  const rango = useMemo(() => rangoDesdeFiltro(filtroPeriodo, desde, hasta, ahora), [filtroPeriodo, desde, hasta, ahora]);

  const filtradas = useMemo(() => {
    const q = busquedaDebounced.trim().toLowerCase();
    return filas.flatMap((f) => {
      const enPeriodo = rango ? pagadoEnRangoPlanes([f.plan], rango) : null;
      // Con período: solo los pagos a proveedores con pagos realizados en
      // el rango, y la columna Pagado pasa a ser lo de ese período.
      if (enPeriodo && enPeriodo.cantidad === 0) return [];
      return [{ ...f, enPeriodo }];
    }).filter((f) => {
      if (filtroConcepto !== "todos" && f.plan.concepto !== filtroConcepto) return false;
      if (filtroEstado === "con_saldo" ? f.estado === "pagado" : filtroEstado !== "todos" && f.estado !== filtroEstado) {
        return false;
      }
      if (q) {
        const haystack = `${f.plan.unidadNumero ?? ""} ${f.plan.clienteNombre} ${f.plan.contraparte}`.toLowerCase();
        if (!haystack.includes(q)) return false;
      }
      return true;
    });
  }, [filas, filtroConcepto, filtroEstado, busquedaDebounced, rango]);

  const filtroKey = `${filtroEstado}|${filtroConcepto}|${busquedaDebounced}|${rango?.desde.getTime()}|${rango?.hasta.getTime()}`;
  const [filtroKeyAnterior, setFiltroKeyAnterior] = useState(filtroKey);
  if (filtroKeyAnterior !== filtroKey) {
    setFiltroKeyAnterior(filtroKey);
    setPagina(1);
  }
  const totalPaginas = Math.max(1, Math.ceil(filtradas.length / PAGE_SIZE));
  const paginaEfectiva = Math.min(pagina, totalPaginas);
  const filasPagina = filtradas.slice((paginaEfectiva - 1) * PAGE_SIZE, paginaEfectiva * PAGE_SIZE);

  // Conceptos para el filtro: los que se cargan hoy + los de pagos viejos que haya.
  const conceptos = [...new Set([...CONCEPTO_PAGO_UNIDAD_OPTIONS, ...planes.map((p) => p.concepto)])];
  const opcionesEstado: FiltroEstado[] = ["todos", "pendiente", "parcial", "pagado", "vencido"];
  if (!opcionesEstado.includes(filtroEstado)) opcionesEstado.push(filtroEstado);

  /** Exporta exactamente las filas filtradas que se ven en pantalla. */
  function exportar() {
    exportarExcel(
      filtradas.map(({ plan, pagado, pendiente, estado, ultimoPago, enPeriodo }) => ({
        "Número unidad": plan.unidadNumero ?? "Sin número",
        Cliente: plan.clienteNombre,
        Modelo: plan.unidadModelo ?? "",
        Proveedor: plan.contraparte,
        Concepto: CONCEPTO_LABELS[plan.concepto as keyof typeof CONCEPTO_LABELS] ?? plan.concepto,
        Descripción: plan.descripcion ?? "",
        Moneda: plan.moneda,
        "Total acordado": plan.totalAcordado,
        "Total pagado": pagado,
        ...(enPeriodo ? { "Pagado en el período": enPeriodo.monto } : {}),
        "Saldo pendiente": pendiente,
        Estado: ESTADO_PAGO_UNIDAD_LABELS[estado],
        "Fecha último pago": fechaLarga(ultimoPago),
        Notas: plan.notas ?? "",
      })),
      "Pagos por unidad",
      "pagos-por-unidad.xlsx"
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-sm font-bold uppercase tracking-widest text-stone-500">Fábrica y logística nacional</h2>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={exportar}
            className="px-3 py-1.5 bg-white border border-[#E5E5E5] hover:border-stone-300 text-[#2F2F2F] font-bold text-sm rounded-lg transition-colors"
          >
            Exportar Excel
          </button>
          <button
            type="button"
            onClick={() => acciones.abrirNuevoPlan()}
            className="px-3 py-1.5 bg-[#D4B06A] hover:bg-[#c19f57] text-[#2F2F2F] font-bold text-sm rounded-lg transition-colors"
          >
            + Nuevo pago a proveedor
          </button>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2 bg-white rounded-xl border border-[#E5E5E5] p-2.5">
        <select aria-label="Filtrar por estado" value={filtroEstado} onChange={(e) => setFiltroEstado(e.target.value as FiltroEstado)} className={selectClass}>
          {opcionesEstado.map((e) => (
            <option key={e} value={e}>
              {FILTRO_ESTADO_LABELS[e]}
            </option>
          ))}
        </select>
        <select aria-label="Filtrar por concepto" value={filtroConcepto} onChange={(e) => setFiltroConcepto(e.target.value)} className={selectClass}>
          <option value="todos">Todos los conceptos</option>
          {conceptos.map((c) => (
            <option key={c} value={c}>
              {CONCEPTO_LABELS[c as keyof typeof CONCEPTO_LABELS] ?? c}
            </option>
          ))}
        </select>
        <FiltroPeriodoSelect
          valor={filtroPeriodo}
          desde={desde}
          hasta={hasta}
          onValor={setFiltroPeriodo}
          onDesde={setDesde}
          onHasta={setHasta}
        />
        <input
          type="search"
          aria-label="Buscar"
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
          placeholder="Buscar cliente, N° de unidad o proveedor..."
          className={`${selectClass} flex-1 min-w-[12rem]`}
        />
      </div>

      <div className="bg-white rounded-2xl border border-[#E5E5E5] overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[#E5E5E5] text-left text-stone-500 text-xs uppercase tracking-wide">
              <th className={th}>Unidad</th>
              <th className={`${th} ${soloDesktop}`}>Cliente</th>
              <th className={th}>Proveedor</th>
              <th className={th}>Concepto</th>
              <th className={`${th} ${soloDesktop} text-right`}>Total</th>
              <th className={`${th} ${soloDesktop} text-right`}>{rango ? "Pagado (período)" : "Pagado"}</th>
              <th className={`${th} text-right`}>Pendiente</th>
              <th className={th}>Estado</th>
            </tr>
          </thead>
          <tbody>
            {filtradas.length === 0 && (
              <tr>
                <td colSpan={8} className="px-4 py-8 text-center text-stone-400">
                  {planes.length === 0 ? "Todavía no hay pagos a proveedores cargados." : "Ningún pago coincide con los filtros."}
                </td>
              </tr>
            )}
            {filasPagina.map(({ plan, pagado, pendiente, estado, enPeriodo }) => {
              const abierta = expandida === plan.id;
              return (
                <Fragment key={plan.id}>
                  <tr
                    onClick={() => setExpandida(abierta ? null : plan.id)}
                    className="border-b border-[#F0F0F0] last:border-0 hover:bg-stone-50 cursor-pointer"
                    aria-expanded={abierta}
                  >
                    <td className={`${td} whitespace-nowrap`}>
                      <Link
                        href={`/admin/unidades/${plan.unidadId}`}
                        onClick={(e) => e.stopPropagation()}
                        className="font-medium text-[#2F2F2F] hover:text-sage-600 hover:underline underline-offset-2"
                      >
                        {plan.unidadNumero ?? "Sin número"}
                      </Link>
                    </td>
                    <td className={`${td} ${soloDesktop} text-stone-600 max-w-[10rem] truncate`} title={plan.clienteNombre}>
                      {plan.clienteNombre}
                    </td>
                    <td className={`${td} text-stone-600 max-w-[10rem] truncate`} title={plan.contraparte}>
                      {plan.contraparte}
                    </td>
                    <td className={`${td} text-stone-600`}>
                      {CONCEPTO_LABELS[plan.concepto as keyof typeof CONCEPTO_LABELS] ?? plan.concepto}
                    </td>
                    <td className={`${td} ${soloDesktop} text-right whitespace-nowrap text-stone-600`}>
                      {formatMoneda(plan.totalAcordado, plan.moneda)}
                    </td>
                    <td className={`${td} ${soloDesktop} text-right whitespace-nowrap text-stone-600`}>
                      {formatMoneda(enPeriodo ? enPeriodo.monto : pagado, plan.moneda)}
                    </td>
                    <td className={`${td} text-right whitespace-nowrap ${pendiente > 0 ? "text-red-700 font-medium" : "text-stone-500"}`}>
                      {formatMoneda(pendiente, plan.moneda)}
                    </td>
                    <td className={`${td} whitespace-nowrap`}>
                      <span className={`px-1.5 py-0.5 rounded-full text-[11px] font-bold ${ESTADO_PAGO_UNIDAD_COLORS[estado]}`}>
                        {ESTADO_PAGO_UNIDAD_LABELS[estado]}
                      </span>
                    </td>
                  </tr>
                  {abierta && (
                    <tr className="bg-[#f5f5f5]">
                      <td colSpan={8} className="px-2 py-3 md:px-4" data-testid={`detalle-pago-${plan.id}`}>
                        <PlanDePago plan={plan} rol={rol} acciones={acciones} />
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
            className="px-4 py-2 rounded-lg text-sm font-bold border border-[#E5E5E5] text-[#2F2F2F] disabled:opacity-40"
          >
            ← Anterior
          </button>
          <span className="text-xs text-stone-400">
            Página {paginaEfectiva} de {totalPaginas} ({filtradas.length} pagos)
          </span>
          <button
            type="button"
            disabled={paginaEfectiva >= totalPaginas}
            onClick={() => setPagina(paginaEfectiva + 1)}
            className="px-4 py-2 rounded-lg text-sm font-bold border border-[#E5E5E5] text-[#2F2F2F] disabled:opacity-40"
          >
            Siguiente →
          </button>
        </div>
      )}
    </div>
  );
}
