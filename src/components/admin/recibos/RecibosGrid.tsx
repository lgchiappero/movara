"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import FiltroPeriodoSelect, { selectFiltroClass } from "@/components/admin/planes/FiltroPeriodo";
import SearchableSelect from "@/components/admin/SearchableSelect";
import { rangoDesdeFiltro, fechaLarga, type FiltroPeriodo } from "@/lib/cobranza/planes-unidad";
import { estadoReciboOptions, ESTADO_RECIBO_LABELS, type EstadoRecibo } from "@/lib/recibos/constantes";
import { filtrarRecibos, opcionesUnicas, type FilaRecibo } from "@/lib/recibos/filtros";
import EstadoReciboChip from "./EstadoReciboChip";

const th = "px-4 py-3 font-semibold";
const td = "px-4 py-3";
const soloDesktop = "hidden md:table-cell";

export default function RecibosGrid({ filas, ahora }: { filas: FilaRecibo[]; ahora: string }) {
  const router = useRouter();
  const [estado, setEstado] = useState<EstadoRecibo | "todos">("todos");
  const [periodo, setPeriodo] = useState<FiltroPeriodo>("todo");
  const [desde, setDesde] = useState("");
  const [hasta, setHasta] = useState("");
  const [unidadId, setUnidadId] = useState("");
  const [clienteId, setClienteId] = useState("");

  const rango = useMemo(() => rangoDesdeFiltro(periodo, desde, hasta, new Date(ahora)), [periodo, desde, hasta, ahora]);
  const visibles = useMemo(
    () => filtrarRecibos(filas, { estado, rango, unidadId, clienteId }),
    [filas, estado, rango, unidadId, clienteId]
  );
  const opcionesUnidad = useMemo(() => [{ value: "", label: "Todas las unidades" }, ...opcionesUnicas(filas, "unidad")], [filas]);
  const opcionesCliente = useMemo(() => [{ value: "", label: "Todos los clientes" }, ...opcionesUnicas(filas, "cliente")], [filas]);
  const hayFiltros = estado !== "todos" || periodo !== "todo" || unidadId || clienteId;

  function limpiar() {
    setEstado("todos");
    setPeriodo("todo");
    setDesde("");
    setHasta("");
    setUnidadId("");
    setClienteId("");
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2 bg-white rounded-xl border border-[#E5E5E5] p-2.5">
        <select
          aria-label="Filtrar por estado"
          value={estado}
          onChange={(e) => setEstado(e.target.value as EstadoRecibo | "todos")}
          className={selectFiltroClass}
        >
          <option value="todos">Todos los estados</option>
          {estadoReciboOptions.map((e) => (
            <option key={e} value={e}>
              {ESTADO_RECIBO_LABELS[e]}
            </option>
          ))}
        </select>
        <FiltroPeriodoSelect valor={periodo} desde={desde} hasta={hasta} onValor={setPeriodo} onDesde={setDesde} onHasta={setHasta} />
        <div className="w-56" aria-label="Filtrar por unidad">
          <SearchableSelect options={opcionesUnidad} value={unidadId} onChange={setUnidadId} placeholder="Unidad..." />
        </div>
        <div className="w-48" aria-label="Filtrar por cliente">
          <SearchableSelect options={opcionesCliente} value={clienteId} onChange={setClienteId} placeholder="Cliente..." />
        </div>
        {hayFiltros && (
          <button type="button" onClick={limpiar} className="text-xs font-semibold text-stone-500 hover:text-stone-800 px-2">
            Limpiar filtros
          </button>
        )}
      </div>

      <div className="bg-white rounded-2xl border border-[#E5E5E5] overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[#E5E5E5] text-left text-stone-500 text-xs uppercase tracking-wide">
              <th className={th}>Nº recibo</th>
              <th className={th}>Cliente</th>
              <th className={`${th} ${soloDesktop}`}>Nº unidad</th>
              <th className={`${th} ${soloDesktop}`}>Modelo</th>
              <th className={th}>Entrega</th>
              <th className={th}>Estado</th>
            </tr>
          </thead>
          <tbody>
            {visibles.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-stone-400">
                  {filas.length === 0 ? "Todavía no hay recibos." : "Ningún recibo coincide con los filtros."}
                </td>
              </tr>
            )}
            {visibles.map((r) => (
              <tr
                key={r.id}
                onClick={() => router.push(`/admin/recibos/${r.id}`)}
                className="border-b border-[#F0F0F0] last:border-0 hover:bg-stone-50 cursor-pointer"
              >
                <td className={`${td} whitespace-nowrap`}>
                  <Link
                    href={`/admin/recibos/${r.id}`}
                    onClick={(e) => e.stopPropagation()}
                    className="font-medium text-[#2F2F2F] hover:text-sage-600 hover:underline underline-offset-2"
                  >
                    {r.numeroRecibo}
                  </Link>
                </td>
                <td className={`${td} text-stone-600 max-w-[12rem] truncate`} title={r.clienteNombre}>
                  {r.clienteNombre}
                </td>
                <td className={`${td} ${soloDesktop} text-stone-600 whitespace-nowrap`}>{r.numeroUnidad}</td>
                <td className={`${td} ${soloDesktop} text-stone-600`}>{r.modelo}</td>
                <td className={`${td} text-stone-600 whitespace-nowrap`}>{fechaLarga(r.fechaEntrega)}</td>
                <td className={td}>
                  <EstadoReciboChip estado={r.estado} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
