"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import * as XLSX from "xlsx";
import {
  CONCEPTO_LABELS,
  ESTADO_ACUERDO_LABELS,
  ESTADO_ACUERDO_COLORS,
  ESTADO_ACUERDO_OPTIONS,
  type EstadoAcuerdo,
} from "@/lib/cobranza/constantes";
import { sumaImportes, estadoAcuerdo } from "@/lib/cobranza/calc";
import { inicioSemana, finSemana } from "@/lib/cobranza/periodo";
import { useToast } from "@/components/admin/Toast";
import EditarMovimientoModal from "@/components/admin/EditarMovimientoModal";
import DetalleAcuerdo from "@/components/admin/cobranza/DetalleAcuerdo";
import type { AcuerdoConDetalle, MovimientoDetalle } from "@/lib/cobranza/types";

type FiltroEstado = EstadoAcuerdo | "semana" | "todos";
type FiltroMoneda = "USD" | "ARS" | "todos";

function formatMoneda(value: number, moneda: string): string {
  return `${moneda} ${value.toLocaleString("es-AR", { maximumFractionDigits: 0 })}`;
}

function formatFecha(value: string | null): string {
  return value ? new Date(value).toLocaleDateString("es-AR", { timeZone: "UTC" }) : "—";
}

function proximoVencimiento(acuerdo: AcuerdoConDetalle): string | null {
  const pendientes = acuerdo.cuotas
    .filter((c) => c.estado !== "pagado" && c.vencimiento)
    .sort((a, b) => new Date(a.vencimiento!).getTime() - new Date(b.vencimiento!).getTime());
  return pendientes[0]?.vencimiento ?? null;
}

function venceEstaSemana(acuerdo: AcuerdoConDetalle, ahora: Date): boolean {
  const desde = inicioSemana(ahora).getTime();
  const hasta = finSemana(ahora).getTime();
  return acuerdo.cuotas.some((c) => {
    if (c.estado !== "pendiente" || !c.vencimiento) return false;
    const t = new Date(c.vencimiento).getTime();
    return t >= desde && t < hasta;
  });
}

export default function GestionCobranzaTab({
  acuerdosCobro,
  acuerdosPago,
  subInicial,
  estadoInicial,
  monedaInicial,
  rol,
  onNuevoAcuerdo,
  onRegistrarMovimiento,
}: {
  acuerdosCobro: AcuerdoConDetalle[];
  acuerdosPago: AcuerdoConDetalle[];
  subInicial?: "cobros" | "pagos";
  estadoInicial?: string;
  monedaInicial?: "USD" | "ARS";
  rol: string;
  onNuevoAcuerdo: (tipo: "cobro" | "pago") => void;
  onRegistrarMovimiento: (acuerdo: AcuerdoConDetalle) => void;
}) {
  const [sub, setSub] = useState<"cobros" | "pagos">(subInicial ?? "cobros");
  const [filtroMoneda, setFiltroMoneda] = useState<FiltroMoneda>(monedaInicial ?? "todos");
  const [filtroEstado, setFiltroEstado] = useState<FiltroEstado>(
    estadoInicial === "vencido" || estadoInicial === "semana" || (ESTADO_ACUERDO_OPTIONS as readonly string[]).includes(estadoInicial ?? "")
      ? (estadoInicial as FiltroEstado)
      : "todos"
  );
  const [busqueda, setBusqueda] = useState("");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [editando, setEditando] = useState<{ acuerdo: AcuerdoConDetalle; movimiento: MovimientoDetalle } | null>(
    null
  );
  const router = useRouter();
  const { showSuccess, showError } = useToast();

  async function eliminarMovimiento(acuerdo: AcuerdoConDetalle, movimiento: MovimientoDetalle) {
    const nombreAccion = acuerdo.tipo === "cobro" ? "este pago recibido" : "este pago realizado";
    if (!window.confirm(`¿Eliminar ${nombreAccion}? Esta acción no se puede deshacer.`)) return;
    try {
      const res = await fetch(`/api/admin/cobranza/acuerdos/${acuerdo.id}/movimientos/${movimiento.id}`, {
        method: "DELETE",
      });
      const json = await res.json();
      if (!res.ok) {
        showError(json.error ?? "No pudimos eliminar el pago.");
        return;
      }
      showSuccess("Pago eliminado");
      router.refresh();
    } catch {
      showError("No pudimos eliminar el pago. Probá de nuevo.");
    }
  }

  async function eliminarAcuerdo(acuerdo: AcuerdoConDetalle): Promise<{ ok: boolean; error?: string }> {
    const res = await fetch(`/api/admin/cobranza/acuerdos/${acuerdo.id}`, { method: "DELETE" });
    const json = await res.json().catch(() => null);
    if (!res.ok) return { ok: false, error: json?.error };
    setExpandedId(null);
    return { ok: true };
  }

  const ahora = new Date();

  const filas = useMemo(() => {
    const lista = sub === "cobros" ? acuerdosCobro : acuerdosPago;
    return lista.map((acuerdo) => {
      const movido = sumaImportes(acuerdo.movimientos);
      return {
        acuerdo,
        movido,
        pendiente: acuerdo.totalAcordado - movido,
        estado: estadoAcuerdo(acuerdo.totalAcordado, movido, acuerdo.cuotas),
        proximoVencimiento: proximoVencimiento(acuerdo),
      };
    });
  }, [sub, acuerdosCobro, acuerdosPago]);

  const filasFiltradas = useMemo(() => {
    const q = busqueda.trim().toLowerCase();
    return filas.filter((f) => {
      if (filtroMoneda !== "todos" && f.acuerdo.moneda !== filtroMoneda) return false;
      if (filtroEstado === "semana") {
        if (!venceEstaSemana(f.acuerdo, ahora)) return false;
      } else if (filtroEstado !== "todos" && f.estado !== filtroEstado) {
        return false;
      }
      if (q) {
        const haystack = `${f.acuerdo.unidadNumero ?? ""} ${f.acuerdo.contraparte} ${CONCEPTO_LABELS[f.acuerdo.concepto as keyof typeof CONCEPTO_LABELS] ?? f.acuerdo.concepto}`.toLowerCase();
        if (!haystack.includes(q)) return false;
      }
      return true;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filas, filtroMoneda, filtroEstado, busqueda]);

  function exportarExcel() {
    const rows = filasFiltradas.map(({ acuerdo, movido, pendiente, estado, proximoVencimiento: prox }) => ({
      Unidad: acuerdo.unidadNumero ?? "Sin número",
      [sub === "cobros" ? "Cliente" : "Proveedor"]: acuerdo.contraparte,
      Concepto: CONCEPTO_LABELS[acuerdo.concepto as keyof typeof CONCEPTO_LABELS] ?? acuerdo.concepto,
      Moneda: acuerdo.moneda,
      "Total acordado": acuerdo.totalAcordado,
      Movido: movido,
      Pendiente: pendiente,
      "Próx. vencimiento": prox ? formatFecha(prox) : "—",
      Estado: ESTADO_ACUERDO_LABELS[estado],
    }));
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Cobranza");
    XLSX.writeFile(wb, `cobranza-${sub}.xlsx`);
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex gap-2">
          {(["cobros", "pagos"] as const).map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => {
                setSub(s);
                setExpandedId(null);
              }}
              className={`px-4 py-2 rounded-full text-sm font-bold transition-colors ${
                sub === s ? "bg-[#2F2F2F] text-white" : "bg-white border border-[#E5E5E5] text-stone-600"
              }`}
            >
              {s === "cobros" ? "Cobros" : "Pagos"}
            </button>
          ))}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <select
            value={filtroMoneda}
            onChange={(e) => setFiltroMoneda(e.target.value as FiltroMoneda)}
            className="rounded-lg border border-[#E5E5E5] px-3 py-2 text-sm text-[#2F2F2F] bg-white"
          >
            <option value="todos">Todas las monedas</option>
            <option value="USD">USD</option>
            <option value="ARS">ARS</option>
          </select>
          <select
            value={filtroEstado}
            onChange={(e) => setFiltroEstado(e.target.value as FiltroEstado)}
            className="rounded-lg border border-[#E5E5E5] px-3 py-2 text-sm text-[#2F2F2F] bg-white"
          >
            <option value="todos">Todos los estados</option>
            {ESTADO_ACUERDO_OPTIONS.map((e) => (
              <option key={e} value={e}>
                {ESTADO_ACUERDO_LABELS[e]}
              </option>
            ))}
            <option value="semana">Vencen esta semana</option>
          </select>
          <input
            type="text"
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            placeholder="Buscar por unidad, contraparte o concepto..."
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
            onClick={() => onNuevoAcuerdo(sub === "cobros" ? "cobro" : "pago")}
            className="px-4 py-2 bg-[#D4B06A] hover:bg-[#c19f57] text-[#2F2F2F] font-bold text-sm rounded-lg transition-colors"
          >
            {sub === "cobros" ? "+ Nuevo cobro" : "+ Nuevo pago"}
          </button>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-[#E5E5E5] overflow-hidden overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[#E5E5E5] text-left text-stone-500 text-xs uppercase tracking-wide">
              <th className="px-4 py-3 font-medium">Unidad</th>
              <th className="px-4 py-3 font-medium">{sub === "cobros" ? "Cliente" : "Proveedor"}</th>
              <th className="px-4 py-3 font-medium">Concepto</th>
              <th className="px-4 py-3 font-medium">Moneda</th>
              <th className="px-4 py-3 font-medium">Total acordado</th>
              <th className="px-4 py-3 font-medium">Movido</th>
              <th className="px-4 py-3 font-medium">Pendiente</th>
              <th className="px-4 py-3 font-medium">Próx vencimiento</th>
              <th className="px-4 py-3 font-medium">Estado</th>
              <th className="px-4 py-3 font-medium">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {filasFiltradas.length === 0 && (
              <tr>
                <td colSpan={10} className="px-4 py-8 text-center text-stone-400">
                  {sub === "cobros" ? "Ningún cobro coincide con los filtros." : "Ningún pago coincide con los filtros."}
                </td>
              </tr>
            )}
            {filasFiltradas.map((f) => (
              <FilaAcuerdo
                key={f.acuerdo.id}
                {...f}
                rol={rol}
                expanded={expandedId === f.acuerdo.id}
                onToggle={() => setExpandedId(expandedId === f.acuerdo.id ? null : f.acuerdo.id)}
                onRegistrarMovimiento={() => onRegistrarMovimiento(f.acuerdo)}
                onEditarMovimiento={(m) => setEditando({ acuerdo: f.acuerdo, movimiento: m })}
                onEliminarMovimiento={(m) => eliminarMovimiento(f.acuerdo, m)}
                onEliminarAcuerdo={() => eliminarAcuerdo(f.acuerdo)}
              />
            ))}
          </tbody>
        </table>
      </div>

      {editando && (
        <EditarMovimientoModal
          acuerdo={editando.acuerdo}
          movimiento={editando.movimiento}
          onClose={() => setEditando(null)}
          onSaved={() => {
            setEditando(null);
            router.refresh();
          }}
        />
      )}
    </div>
  );
}

function FilaAcuerdo({
  acuerdo,
  movido,
  pendiente,
  estado,
  proximoVencimiento: proxVenc,
  rol,
  expanded,
  onToggle,
  onRegistrarMovimiento,
  onEditarMovimiento,
  onEliminarMovimiento,
  onEliminarAcuerdo,
}: {
  acuerdo: AcuerdoConDetalle;
  movido: number;
  pendiente: number;
  estado: EstadoAcuerdo;
  proximoVencimiento: string | null;
  rol: string;
  expanded: boolean;
  onToggle: () => void;
  onRegistrarMovimiento: () => void;
  onEditarMovimiento: (movimiento: MovimientoDetalle) => void;
  onEliminarMovimiento: (movimiento: MovimientoDetalle) => void;
  onEliminarAcuerdo: () => Promise<{ ok: boolean; error?: string }>;
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
        <td className="px-4 py-3 text-stone-600">{formatMoneda(movido, acuerdo.moneda)}</td>
        <td className="px-4 py-3 text-stone-600">{formatMoneda(pendiente, acuerdo.moneda)}</td>
        <td className="px-4 py-3 text-stone-600 whitespace-nowrap">{formatFecha(proxVenc)}</td>
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
            {acuerdo.tipo === "cobro" ? "Registrar pago recibido" : "Registrar pago realizado"}
          </button>
        </td>
      </tr>
      {expanded && (
        <tr className="bg-[#f5f5f5]">
          <td colSpan={10} className="px-4 py-4">
            <DetalleAcuerdo
              acuerdo={acuerdo}
              movido={movido}
              pendiente={pendiente}
              rol={rol}
              onRegistrarMovimiento={onRegistrarMovimiento}
              onEditarMovimiento={onEditarMovimiento}
              onEliminarMovimiento={onEliminarMovimiento}
              onEliminarAcuerdo={onEliminarAcuerdo}
            />
          </td>
        </tr>
      )}
    </>
  );
}
