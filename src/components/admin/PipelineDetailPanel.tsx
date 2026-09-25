"use client";

import { useState } from "react";
import Link from "next/link";
import { ETAPA_OPTIONS, ETAPA_LABELS, ORIGEN_OPTIONS, ORIGEN_LABELS } from "@/lib/leads/constantes";
import { buildWhatsAppLeadUrl } from "@/lib/leads/calc";
import type { LeadPipeline, Vendedor } from "@/components/admin/PipelineBoard";

const inputClass =
  "w-full rounded-lg border border-[#E5E5E5] px-3 py-2 text-sm text-[#2F2F2F] bg-white focus:outline-none focus:ring-2 focus:ring-sage-500";
const labelClass = "text-xs font-medium text-stone-500";

function toNumberOrNull(value: string): number | null {
  return value.trim() === "" ? null : Number(value);
}

export default function PipelineDetailPanel({
  lead,
  vendedores,
  onClose,
  onSaved,
}: {
  lead: LeadPipeline;
  vendedores: Vendedor[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const [etapa, setEtapa] = useState(lead.etapa);
  const [origen, setOrigen] = useState(lead.origen ?? "");
  const [vendedorId, setVendedorId] = useState(lead.vendedorId ?? "");
  const [notasVenta, setNotasVenta] = useState(lead.notasVenta ?? "");
  const [motivoPerdida, setMotivoPerdida] = useState(lead.motivoPerdida ?? "");
  const [valorEstimado, setValorEstimado] = useState(lead.valorEstimado?.toString() ?? "");
  const [saving, setSaving] = useState(false);
  const [converting, setConverting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function guardar() {
    setError(null);
    setSaving(true);
    try {
      const res = await fetch(`/api/admin/leads/${lead.id}/pipeline`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          etapa,
          origen: origen || null,
          vendedorId: vendedorId || null,
          notasVenta: notasVenta || null,
          motivoPerdida: motivoPerdida || null,
          valorEstimado: toNumberOrNull(valorEstimado),
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        setError(json.error ?? "No pudimos guardar los cambios.");
        return;
      }
      onSaved();
    } catch {
      setError("No pudimos guardar los cambios. Probá de nuevo.");
    } finally {
      setSaving(false);
    }
  }

  async function convertir() {
    setError(null);
    setConverting(true);
    try {
      const res = await fetch(`/api/admin/leads/${lead.id}/convertir`, { method: "POST" });
      const json = await res.json();
      if (!res.ok) {
        setError(json.error ?? "No pudimos convertir el lead.");
        return;
      }
      onSaved();
    } catch {
      setError("No pudimos convertir el lead. Probá de nuevo.");
    } finally {
      setConverting(false);
    }
  }

  return (
    <>
      <div className="fixed inset-0 bg-black/30 z-40" onClick={onClose} />
      <div className="fixed inset-y-0 right-0 w-full max-w-md bg-white shadow-2xl z-50 overflow-y-auto">
        <div className="p-6 space-y-6">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-sage-500 text-xs font-bold uppercase tracking-widest mb-1">Lead</p>
              <h2 className="text-xl font-bold text-[#2F2F2F]">
                {lead.nombre} {lead.apellido ?? ""}
              </h2>
            </div>
            <button
              type="button"
              onClick={onClose}
              aria-label="Cerrar"
              className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-stone-100 text-stone-500 text-xl leading-none"
            >
              ×
            </button>
          </div>

          <div className="space-y-1.5 text-sm">
            <p>
              <span className="text-stone-500">Teléfono: </span>
              <span className="text-[#2F2F2F] font-medium">{lead.telefono}</span>
            </p>
            <p>
              <span className="text-stone-500">Email: </span>
              <span className="text-[#2F2F2F] font-medium">{lead.email || "—"}</span>
            </p>
            <p>
              <span className="text-stone-500">Provincia: </span>
              <span className="text-[#2F2F2F] font-medium">{lead.provincia || "—"}</span>
            </p>
            <p>
              <span className="text-stone-500">Recibido: </span>
              <span className="text-[#2F2F2F] font-medium">
                {new Date(lead.createdAt).toLocaleDateString("es-AR")}
              </span>
            </p>
            {lead.mensaje && (
              <p>
                <span className="text-stone-500">Mensaje: </span>
                <span className="text-[#2F2F2F]">{lead.mensaje}</span>
              </p>
            )}
          </div>

          <a
            href={buildWhatsAppLeadUrl(lead.telefono, lead.nombre)}
            target="_blank"
            rel="noopener noreferrer"
            className="block text-center py-2.5 bg-green-50 hover:bg-green-100 text-green-700 font-bold text-sm rounded-xl transition-colors"
          >
            Escribir por WhatsApp
          </a>

          {lead.clienteId ? (
            <div className="bg-sage-50 border border-sage-200 rounded-xl p-4 text-sm">
              <p className="text-sage-700 font-medium mb-1">Ya convertido a cliente.</p>
              <Link href={`/admin/clientes/${lead.clienteId}`} className="text-sage-600 font-bold hover:underline">
                Ver cliente →
              </Link>
            </div>
          ) : (
            etapa === "ganado" && (
              <button
                type="button"
                disabled={converting}
                onClick={convertir}
                className="w-full py-2.5 bg-[#D4B06A] hover:bg-[#c19f5a] disabled:opacity-60 text-[#1a1a1a] font-bold text-sm rounded-xl transition-colors"
              >
                {converting ? "Convirtiendo..." : "Convertir a cliente"}
              </button>
            )
          )}

          <div className="space-y-4 border-t border-[#F0F0F0] pt-4">
            <label className="block space-y-1.5">
              <span className={labelClass}>Etapa</span>
              <select className={inputClass} value={etapa} onChange={(e) => setEtapa(e.target.value)}>
                {ETAPA_OPTIONS.map((e) => (
                  <option key={e} value={e}>
                    {ETAPA_LABELS[e]}
                  </option>
                ))}
              </select>
            </label>

            {etapa === "perdido" && (
              <label className="block space-y-1.5">
                <span className={labelClass}>Motivo de pérdida</span>
                <textarea
                  className={inputClass}
                  rows={2}
                  value={motivoPerdida}
                  onChange={(e) => setMotivoPerdida(e.target.value)}
                />
              </label>
            )}

            <label className="block space-y-1.5">
              <span className={labelClass}>Origen</span>
              <select className={inputClass} value={origen} onChange={(e) => setOrigen(e.target.value)}>
                <option value="">Sin definir</option>
                {ORIGEN_OPTIONS.map((o) => (
                  <option key={o} value={o}>
                    {ORIGEN_LABELS[o]}
                  </option>
                ))}
              </select>
            </label>

            <label className="block space-y-1.5">
              <span className={labelClass}>Vendedor asignado</span>
              <select className={inputClass} value={vendedorId} onChange={(e) => setVendedorId(e.target.value)}>
                <option value="">Sin asignar</option>
                {vendedores.map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.nombre}
                  </option>
                ))}
              </select>
            </label>

            <label className="block space-y-1.5">
              <span className={labelClass}>Valor estimado (USD)</span>
              <input
                type="number"
                step="0.01"
                className={inputClass}
                value={valorEstimado}
                onChange={(e) => setValorEstimado(e.target.value)}
              />
            </label>

            <label className="block space-y-1.5">
              <span className={labelClass}>Notas de venta</span>
              <textarea
                className={inputClass}
                rows={3}
                value={notasVenta}
                onChange={(e) => setNotasVenta(e.target.value)}
              />
            </label>
          </div>

          {error && <p className="text-xs text-red-600">{error}</p>}

          <button
            type="button"
            disabled={saving}
            onClick={guardar}
            className="w-full py-3 bg-sage-500 hover:bg-sage-600 disabled:opacity-60 text-[#2F2F2F] font-bold text-sm rounded-xl transition-colors"
          >
            {saving ? "Guardando..." : "Guardar cambios"}
          </button>
        </div>
      </div>
    </>
  );
}
