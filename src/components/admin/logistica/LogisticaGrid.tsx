"use client";

import { useMemo, useState } from "react";
import { CONCEPTO_LOGISTICA_OPTIONS, CONCEPTO_LOGISTICA_LABELS } from "@/lib/cobranza/constantes";
import { ordenarCostos, type CostoLogisticaRow } from "@/lib/cobranza/logistica";
import { fechaEnRango, fechaLarga, rangoDesdeFiltro, type FiltroPeriodo } from "@/lib/cobranza/planes-unidad";
import { useDebouncedValue } from "@/lib/hooks/useDebouncedValue";
import { exportarExcel } from "@/lib/admin/exportar-excel";
import SearchableSelect from "@/components/admin/SearchableSelect";
import FiltroPeriodoSelect, { selectFiltroClass } from "@/components/admin/planes/FiltroPeriodo";
import TablaCostosLogistica from "@/components/admin/logistica/TablaCostosLogistica";
import { etiquetaEnvio, type EnvioOpcion } from "@/components/admin/logistica/CostoLogisticaModal";
import type { AccionesLogistica } from "@/components/admin/logistica/useAccionesLogistica";

type FiltroEstado = "todos" | "pendiente" | "pagado";

/** Tab "Logística internacional" de /admin/pagos: filtros (búsqueda por PI o
 * contenedor, concepto, estado, período y envío), exportación a Excel de lo
 * filtrado, y la tabla de costos. */
export default function LogisticaGrid({
  costos,
  envios,
  rol,
  acciones,
  ahora = new Date(),
}: {
  costos: CostoLogisticaRow[];
  envios: EnvioOpcion[];
  rol: string;
  acciones: AccionesLogistica;
  ahora?: Date;
}) {
  const [busqueda, setBusqueda] = useState("");
  const busquedaDebounced = useDebouncedValue(busqueda, 300);
  const [filtroConcepto, setFiltroConcepto] = useState<string>("todos");
  const [filtroEstado, setFiltroEstado] = useState<FiltroEstado>("todos");
  const [filtroPeriodo, setFiltroPeriodo] = useState<FiltroPeriodo>("todo");
  const [desde, setDesde] = useState("");
  const [hasta, setHasta] = useState("");
  const [envioId, setEnvioId] = useState("");

  const rango = useMemo(() => rangoDesdeFiltro(filtroPeriodo, desde, hasta, ahora), [filtroPeriodo, desde, hasta, ahora]);

  const filtrados = useMemo(() => {
    const q = busquedaDebounced.trim().toLowerCase();
    return ordenarCostos(
      costos.filter((c) => {
        if (envioId && c.envioId !== envioId) return false;
        if (filtroConcepto !== "todos" && c.concepto !== filtroConcepto) return false;
        if (filtroEstado !== "todos" && c.estado !== filtroEstado) return false;
        if (rango && !fechaEnRango(c.fecha, rango)) return false;
        if (q && !`${c.envioNumeroPI ?? ""} ${c.envioContenedor ?? ""}`.toLowerCase().includes(q)) return false;
        return true;
      })
    );
  }, [costos, envioId, filtroConcepto, filtroEstado, rango, busquedaDebounced]);

  /** Exporta exactamente los costos filtrados que se ven en pantalla. */
  function exportar() {
    exportarExcel(
      filtrados.map((c) => ({
        "Envío (PI)": c.envioNumeroPI ?? "Sin PI",
        Contenedor: c.envioContenedor ?? "",
        Concepto: CONCEPTO_LOGISTICA_LABELS[c.concepto as keyof typeof CONCEPTO_LOGISTICA_LABELS] ?? c.concepto,
        Descripción: c.descripcion ?? "",
        Moneda: c.moneda,
        Importe: c.importe,
        Estado: c.estado === "pagado" ? "Pagado" : "Pendiente",
        Fecha: fechaLarga(c.fecha),
        Prorrateado: c.prorrateado ? "Sí" : "No",
        Notas: c.notas ?? "",
      })),
      "Logística internacional",
      "logistica-internacional.xlsx"
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-sm font-bold uppercase tracking-widest text-stone-500">Costos del envío / contenedor</h2>
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
            onClick={() => acciones.abrirNuevo()}
            className="px-3 py-1.5 bg-[#D4B06A] hover:bg-[#c19f57] text-[#2F2F2F] font-bold text-sm rounded-lg transition-colors"
          >
            + Nuevo costo de logística
          </button>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2 bg-white rounded-xl border border-[#E5E5E5] p-2.5">
        <select
          aria-label="Filtrar por concepto"
          value={filtroConcepto}
          onChange={(e) => setFiltroConcepto(e.target.value)}
          className={selectFiltroClass}
        >
          <option value="todos">Todos los conceptos</option>
          {CONCEPTO_LOGISTICA_OPTIONS.map((c) => (
            <option key={c} value={c}>
              {CONCEPTO_LOGISTICA_LABELS[c]}
            </option>
          ))}
        </select>
        <select
          aria-label="Filtrar por estado"
          value={filtroEstado}
          onChange={(e) => setFiltroEstado(e.target.value as FiltroEstado)}
          className={selectFiltroClass}
        >
          <option value="todos">Todos los estados</option>
          <option value="pendiente">Pendiente</option>
          <option value="pagado">Pagado</option>
        </select>
        <FiltroPeriodoSelect
          valor={filtroPeriodo}
          desde={desde}
          hasta={hasta}
          onValor={setFiltroPeriodo}
          onDesde={setDesde}
          onHasta={setHasta}
        />
        <div className="w-56" aria-label="Filtrar por envío" role="group">
          <SearchableSelect
            value={envioId}
            onChange={setEnvioId}
            placeholder="Envío: buscar PI o contenedor..."
            emptyText="Ningún envío coincide"
            options={[{ value: "", label: "Todos los envíos" }, ...envios.map((e) => ({ value: e.id, label: etiquetaEnvio(e) }))]}
          />
        </div>
        <input
          type="search"
          aria-label="Buscar"
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
          placeholder="Buscar N° de PI o contenedor..."
          className={`${selectFiltroClass} flex-1 min-w-[12rem]`}
        />
      </div>

      {filtrados.length === 0 && costos.length > 0 ? (
        <p className="text-sm text-stone-400 px-1 py-4">Ningún costo coincide con los filtros.</p>
      ) : (
        <TablaCostosLogistica costos={filtrados} rol={rol} acciones={acciones} mostrarEnvio />
      )}
    </div>
  );
}
