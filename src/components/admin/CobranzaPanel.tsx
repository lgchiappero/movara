"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  PERIODO_TIPO_OPTIONS,
  PERIODO_TIPO_LABELS,
  type PeriodoTipo,
} from "@/lib/cobranza/periodo";
import type {
  AcuerdoConDetalle,
  UnidadOpcion,
  ClienteOpcion,
  TipoCambioRow,
  CierreRow,
} from "@/lib/cobranza/types";
import { useToast } from "@/components/admin/Toast";
import NuevoAcuerdoModal from "@/components/admin/NuevoAcuerdoModal";
import RegistrarMovimientoModal from "@/components/admin/RegistrarMovimientoModal";
import GestionCobranzaTab from "@/components/admin/cobranza/GestionCobranzaTab";
import RentabilidadPorUnidadTab from "@/components/admin/cobranza/RentabilidadPorUnidadTab";
import EstadoCuentaClienteTab from "@/components/admin/cobranza/EstadoCuentaClienteTab";
import TipoCambioTab from "@/components/admin/cobranza/TipoCambioTab";
import CierresTab from "@/components/admin/cobranza/CierresTab";

export type { AcuerdoConDetalle, UnidadOpcion, ClienteOpcion, TipoCambioRow, CierreRow };

export type TabPrincipal = "gestion" | "rentabilidad" | "cuenta-cliente" | "tipo-cambio" | "cierres";

const TABS: { key: TabPrincipal; label: string }[] = [
  { key: "gestion", label: "Gestión de cobranza" },
  { key: "rentabilidad", label: "Rentabilidad por unidad" },
  { key: "cuenta-cliente", label: "Estado de cuenta por cliente" },
  { key: "tipo-cambio", label: "Tipo de cambio" },
  { key: "cierres", label: "Cierres" },
];

function formatMoneda(value: number, moneda: string): string {
  return `${moneda} ${value.toLocaleString("es-AR", { maximumFractionDigits: 0 })}`;
}

export default function CobranzaPanel({
  acuerdosCobro,
  acuerdosPago,
  unidades,
  clientes,
  tiposCambio,
  cierres,
  rol,
  periodo,
  mesUnico,
  cierreActual,
  metricas,
  tabInicial,
  subInicial,
  estadoInicial,
  monedaInicial,
  clienteIdInicial,
}: {
  acuerdosCobro: AcuerdoConDetalle[];
  acuerdosPago: AcuerdoConDetalle[];
  unidades: UnidadOpcion[];
  clientes: ClienteOpcion[];
  tiposCambio: TipoCambioRow[];
  cierres: CierreRow[];
  rol: string;
  periodo: { tipo: PeriodoTipo; desde: string; hasta: string };
  mesUnico: { mes: number; anio: number } | null;
  cierreActual: CierreRow | null;
  metricas: {
    usd: { cobrado: number; pagado: number; margen: number };
    ars: { cobrado: number; pagado: number; margen: number };
    cuotasVencidas: number;
    cuotasVencenSemana: number;
    periodosSinCerrar: number;
  };
  tabInicial?: TabPrincipal;
  subInicial?: "cobros" | "pagos";
  estadoInicial?: string;
  monedaInicial?: "USD" | "ARS";
  clienteIdInicial?: string;
}) {
  const router = useRouter();
  const { showSuccess, showError } = useToast();
  const [tab, setTab] = useState<TabPrincipal>(tabInicial ?? "gestion");
  const [nuevoAcuerdoTipo, setNuevoAcuerdoTipo] = useState<"cobro" | "pago" | null>(null);
  const [movimientoAcuerdo, setMovimientoAcuerdo] = useState<AcuerdoConDetalle | null>(null);
  const [desdePersonalizado, setDesdePersonalizado] = useState(
    periodo.tipo === "personalizado" ? periodo.desde.slice(0, 10) : ""
  );
  const [hastaPersonalizado, setHastaPersonalizado] = useState(
    periodo.tipo === "personalizado" ? periodo.hasta.slice(0, 10) : ""
  );
  const [cerrando, setCerrando] = useState(false);

  function cambiarPeriodo(tipo: PeriodoTipo, desde?: string, hasta?: string) {
    const params = new URLSearchParams();
    params.set("periodo", tipo);
    if (tipo === "personalizado" && desde && hasta) {
      params.set("desde", desde);
      params.set("hasta", hasta);
    }
    params.set("tab", tab);
    router.push(`/admin/cobranza?${params.toString()}`);
  }

  const ahora = new Date();
  const periodoYaTermino = new Date(periodo.hasta) <= ahora;
  const puedeCerrar = rol === "admin" && mesUnico !== null && periodoYaTermino && !cierreActual;

  async function cerrarPeriodoActual() {
    if (!mesUnico) return;
    if (
      !window.confirm(
        `¿Cerrar el período ${mesUnico.mes}/${mesUnico.anio}? No se van a poder cargar más movimientos con fecha en ese mes.`
      )
    ) {
      return;
    }
    const notas = window.prompt("Notas del cierre (opcional):") ?? undefined;
    setCerrando(true);
    try {
      const res = await fetch("/api/admin/cobranza/cierres", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mes: mesUnico.mes, anio: mesUnico.anio, notas: notas || undefined }),
      });
      const json = await res.json();
      if (!res.ok) {
        showError(json.error ?? "No pudimos cerrar el período.");
        return;
      }
      showSuccess("Período cerrado");
      router.refresh();
    } catch {
      showError("No pudimos cerrar el período. Probá de nuevo.");
    } finally {
      setCerrando(false);
    }
  }

  return (
    <div className="space-y-6">
      {/* Selector de período */}
      <div className="bg-white rounded-2xl border border-[#E5E5E5] p-4 flex flex-wrap items-center gap-3">
        <div className="flex flex-wrap gap-2">
          {PERIODO_TIPO_OPTIONS.map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => {
                if (t === "personalizado") {
                  if (desdePersonalizado && hastaPersonalizado) {
                    cambiarPeriodo(t, desdePersonalizado, hastaPersonalizado);
                  }
                } else {
                  cambiarPeriodo(t);
                }
              }}
              className={`px-3 py-1.5 rounded-full text-xs font-bold transition-colors ${
                periodo.tipo === t ? "bg-[#2F2F2F] text-white" : "bg-stone-100 text-stone-600"
              }`}
            >
              {PERIODO_TIPO_LABELS[t]}
            </button>
          ))}
        </div>

        {periodo.tipo === "personalizado" && (
          <div className="flex items-center gap-2">
            <input
              type="date"
              value={desdePersonalizado}
              onChange={(e) => setDesdePersonalizado(e.target.value)}
              className="rounded-lg border border-[#E5E5E5] px-2 py-1.5 text-xs"
            />
            <span className="text-stone-400 text-xs">a</span>
            <input
              type="date"
              value={hastaPersonalizado}
              onChange={(e) => setHastaPersonalizado(e.target.value)}
              className="rounded-lg border border-[#E5E5E5] px-2 py-1.5 text-xs"
            />
            <button
              type="button"
              onClick={() => desdePersonalizado && hastaPersonalizado && cambiarPeriodo("personalizado", desdePersonalizado, hastaPersonalizado)}
              className="px-3 py-1.5 bg-[#D4B06A] text-[#2F2F2F] font-bold text-xs rounded-lg"
            >
              Aplicar
            </button>
          </div>
        )}

        <div className="ml-auto flex items-center gap-2">
          {cierreActual && (
            <span className="px-3 py-1.5 rounded-full text-xs font-bold bg-stone-800 text-white">
              Período cerrado 🔒
            </span>
          )}
          {puedeCerrar && (
            <button
              type="button"
              disabled={cerrando}
              onClick={cerrarPeriodoActual}
              className="px-3 py-1.5 bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white font-bold text-xs rounded-lg transition-colors"
            >
              {cerrando ? "Cerrando…" : "Cerrar período"}
            </button>
          )}
        </div>
      </div>

      {/* Métricas por moneda */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-white rounded-2xl border border-[#E5E5E5] p-5 space-y-3">
          <h3 className="text-sm font-bold uppercase tracking-widest text-stone-500">USD</h3>
          <div className="grid grid-cols-3 gap-3">
            <MetricaMini label="Cobrado" value={formatMoneda(metricas.usd.cobrado, "USD")} />
            <MetricaMini label="Pagado" value={formatMoneda(metricas.usd.pagado, "USD")} />
            <MetricaMini
              label="Margen"
              value={formatMoneda(metricas.usd.margen, "USD")}
              tono={metricas.usd.margen >= 0 ? "positivo" : "negativo"}
            />
          </div>
        </div>
        <div className="bg-white rounded-2xl border border-[#E5E5E5] p-5 space-y-3">
          <h3 className="text-sm font-bold uppercase tracking-widest text-stone-500">ARS</h3>
          <div className="grid grid-cols-3 gap-3">
            <MetricaMini label="Cobrado" value={formatMoneda(metricas.ars.cobrado, "ARS")} />
            <MetricaMini label="Pagado" value={formatMoneda(metricas.ars.pagado, "ARS")} />
            <MetricaMini
              label="Margen"
              value={formatMoneda(metricas.ars.margen, "ARS")}
              tono={metricas.ars.margen >= 0 ? "positivo" : "negativo"}
            />
          </div>
        </div>
      </div>

      {/* Alertas */}
      {(metricas.cuotasVencidas > 0 || metricas.cuotasVencenSemana > 0 || metricas.periodosSinCerrar > 0) && (
        <div className="rounded-2xl border border-[#F3C6C6] p-4 space-y-2" style={{ backgroundColor: "#fff0f0" }}>
          {metricas.cuotasVencidas > 0 && (
            <div className="flex items-center justify-between gap-3 text-sm text-red-800">
              <span>
                <strong>{metricas.cuotasVencidas}</strong> cuota{metricas.cuotasVencidas === 1 ? "" : "s"} vencida
                {metricas.cuotasVencidas === 1 ? "" : "s"}
              </span>
              <Link
                href="/admin/cobranza?tab=gestion&estado=vencido"
                className="px-3 py-1 bg-white border border-red-200 hover:bg-red-50 text-red-700 font-bold text-xs rounded-lg"
              >
                Ver →
              </Link>
            </div>
          )}
          {metricas.cuotasVencenSemana > 0 && (
            <div className="flex items-center justify-between gap-3 text-sm text-red-800">
              <span>
                <strong>{metricas.cuotasVencenSemana}</strong> cuota{metricas.cuotasVencenSemana === 1 ? "" : "s"}{" "}
                vence{metricas.cuotasVencenSemana === 1 ? "" : "n"} esta semana
              </span>
              <Link
                href="/admin/cobranza?tab=gestion&estado=semana"
                className="px-3 py-1 bg-white border border-red-200 hover:bg-red-50 text-red-700 font-bold text-xs rounded-lg"
              >
                Ver →
              </Link>
            </div>
          )}
          {metricas.periodosSinCerrar > 0 && (
            <div className="flex items-center justify-between gap-3 text-sm text-red-800">
              <span>
                <strong>{metricas.periodosSinCerrar}</strong> período{metricas.periodosSinCerrar === 1 ? "" : "s"}{" "}
                sin cerrar
              </span>
              <Link
                href="/admin/cobranza?tab=cierres"
                className="px-3 py-1 bg-white border border-red-200 hover:bg-red-50 text-red-700 font-bold text-xs rounded-lg"
              >
                Ver →
              </Link>
            </div>
          )}
        </div>
      )}

      {/* Tabs principales */}
      <div className="flex flex-wrap gap-2">
        {TABS.map((t) => (
          <button
            key={t.key}
            type="button"
            onClick={() => setTab(t.key)}
            className={`px-4 py-2 rounded-full text-sm font-bold transition-colors ${
              tab === t.key ? "bg-[#2F2F2F] text-white" : "bg-white border border-[#E5E5E5] text-stone-600"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === "gestion" && (
        <GestionCobranzaTab
          acuerdosCobro={acuerdosCobro}
          acuerdosPago={acuerdosPago}
          subInicial={subInicial}
          estadoInicial={estadoInicial}
          monedaInicial={monedaInicial}
          onNuevoAcuerdo={(tipo) => setNuevoAcuerdoTipo(tipo)}
          onRegistrarMovimiento={(acuerdo) => setMovimientoAcuerdo(acuerdo)}
        />
      )}
      {tab === "rentabilidad" && (
        <RentabilidadPorUnidadTab acuerdosCobro={acuerdosCobro} acuerdosPago={acuerdosPago} periodo={periodo} />
      )}
      {tab === "cuenta-cliente" && (
        <EstadoCuentaClienteTab
          clientes={clientes}
          acuerdosCobro={acuerdosCobro}
          clienteIdInicial={clienteIdInicial}
        />
      )}
      {tab === "tipo-cambio" && <TipoCambioTab tiposCambio={tiposCambio} onSaved={() => router.refresh()} />}
      {tab === "cierres" && <CierresTab cierres={cierres} rol={rol} onSaved={() => router.refresh()} />}

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

function MetricaMini({
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
    <div className="text-center">
      <p className={`text-lg font-bold ${color}`}>{value}</p>
      <p className="text-xs text-stone-500 mt-0.5">{label}</p>
    </div>
  );
}
