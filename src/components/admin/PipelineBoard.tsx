"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ETAPA_LABELS, ETAPA_COLORS, ORIGEN_LABELS, ORIGEN_COLORS, type Etapa, type Origen } from "@/lib/leads/constantes";
import { buildWhatsAppLeadUrl } from "@/lib/leads/calc";
import PipelineDetailPanel from "@/components/admin/PipelineDetailPanel";

export type LeadPipeline = {
  id: string;
  nombre: string;
  apellido: string | null;
  dni: string | null;
  telefono: string;
  email: string | null;
  provincia: string | null;
  mensaje: string | null;
  createdAt: string;
  contactado: boolean;
  contactadoEn: string | null;
  etapa: string;
  origen: string | null;
  vendedorId: string | null;
  notasVenta: string | null;
  motivoPerdida: string | null;
  clienteId: string | null;
  valorEstimado: number | null;
};

export type Vendedor = { id: string; nombre: string };

async function savePipeline(
  id: string,
  data: {
    etapa: string;
    origen: string | null;
    vendedorId: string | null;
    notasVenta: string | null;
    motivoPerdida: string | null;
    valorEstimado: number | null;
  }
): Promise<boolean> {
  const res = await fetch(`/api/admin/leads/${id}/pipeline`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  return res.ok;
}

const TOAST_DURATION_MS = 2500;

export default function PipelineBoard({ leads, vendedores }: { leads: LeadPipeline[]; vendedores: Vendedor[] }) {
  const router = useRouter();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const selectedLead = leads.find((l) => l.id === selectedId) ?? null;

  function showToast(message: string) {
    setToast(message);
    setTimeout(() => setToast(null), TOAST_DURATION_MS);
  }

  function handlePanelSaved() {
    router.refresh();
    setSelectedId(null);
    showToast("Guardado");
  }

  async function handleVendedorChange(lead: LeadPipeline, vendedorId: string) {
    const ok = await savePipeline(lead.id, {
      etapa: lead.etapa,
      origen: lead.origen,
      vendedorId: vendedorId || null,
      notasVenta: lead.notasVenta,
      motivoPerdida: lead.motivoPerdida,
      valorEstimado: lead.valorEstimado,
    });
    if (ok) router.refresh();
  }

  return (
    <>
      <div className="bg-white rounded-2xl border border-[#E5E5E5] overflow-hidden overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[#E5E5E5] text-left text-stone-500 text-xs uppercase tracking-wide">
              <th className="px-4 py-3 font-medium">Nombre</th>
              <th className="px-4 py-3 font-medium">Teléfono</th>
              <th className="px-4 py-3 font-medium">Origen</th>
              <th className="px-4 py-3 font-medium">Etapa</th>
              <th className="px-4 py-3 font-medium">Último contacto</th>
              <th className="px-4 py-3 font-medium">Notas</th>
              <th className="px-4 py-3 font-medium">Vendedor</th>
              <th className="px-4 py-3 font-medium">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {leads.map((lead) => (
              <tr
                key={lead.id}
                className="border-b border-[#F0F0F0] last:border-0 hover:bg-stone-50 cursor-pointer"
                onClick={() => setSelectedId(lead.id)}
              >
                <td className="px-4 py-3 font-medium text-[#2F2F2F] whitespace-nowrap">
                  {lead.nombre} {lead.apellido ?? ""}
                </td>
                <td className="px-4 py-3 text-stone-600 whitespace-nowrap">{lead.telefono}</td>
                <td className="px-4 py-3">
                  {lead.origen ? (
                    <span
                      className={`px-2 py-1 rounded-full text-xs font-bold ${ORIGEN_COLORS[lead.origen as Origen]}`}
                    >
                      {ORIGEN_LABELS[lead.origen as Origen]}
                    </span>
                  ) : (
                    "—"
                  )}
                </td>
                <td className="px-4 py-3">
                  <span className={`px-2 py-1 rounded-full text-xs font-bold ${ETAPA_COLORS[lead.etapa as Etapa]}`}>
                    {ETAPA_LABELS[lead.etapa as Etapa] ?? lead.etapa}
                  </span>
                </td>
                <td className="px-4 py-3 text-stone-500 whitespace-nowrap">
                  {lead.contactadoEn ? new Date(lead.contactadoEn).toLocaleDateString("es-AR") : "—"}
                </td>
                <td className="px-4 py-3 max-w-[180px]" onClick={(e) => e.stopPropagation()}>
                  <NotasInline leadId={lead.id} notasVenta={lead.notasVenta} onSaved={() => router.refresh()} />
                </td>
                <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                  <select
                    value={lead.vendedorId ?? ""}
                    onChange={(e) => handleVendedorChange(lead, e.target.value)}
                    className="rounded-lg border border-[#E5E5E5] px-2 py-1.5 text-xs text-[#2F2F2F] bg-white"
                  >
                    <option value="">Sin asignar</option>
                    {vendedores.map((v) => (
                      <option key={v.id} value={v.id}>
                        {v.nombre}
                      </option>
                    ))}
                  </select>
                </td>
                <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                  <div className="flex items-center gap-2">
                    <a
                      href={buildWhatsAppLeadUrl(lead.telefono, lead.nombre)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-2.5 py-1.5 bg-green-50 hover:bg-green-100 text-green-700 font-bold text-xs rounded-lg transition-colors whitespace-nowrap"
                    >
                      WhatsApp
                    </a>
                    <button
                      type="button"
                      onClick={() => setSelectedId(lead.id)}
                      className="px-2.5 py-1.5 bg-sage-500 hover:bg-sage-600 text-[#2F2F2F] font-bold text-xs rounded-lg transition-colors whitespace-nowrap"
                    >
                      Ver detalle
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {selectedLead && (
        <PipelineDetailPanel
          lead={selectedLead}
          vendedores={vendedores}
          onClose={() => setSelectedId(null)}
          onSaved={handlePanelSaved}
          onConverted={() => router.refresh()}
        />
      )}

      {toast && (
        <div
          role="status"
          className="fixed bottom-6 right-6 z-[60] bg-[#2F2F2F] text-white text-sm font-medium px-4 py-2.5 rounded-xl shadow-lg"
        >
          {toast}
        </div>
      )}
    </>
  );
}

function NotasInline({
  leadId,
  notasVenta,
  onSaved,
}: {
  leadId: string;
  notasVenta: string | null;
  onSaved: () => void;
}) {
  const [value, setValue] = useState(notasVenta ?? "");
  const [saving, setSaving] = useState(false);

  async function save() {
    if (value === (notasVenta ?? "")) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/admin/leads/${leadId}/notas`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ notasVenta: value }),
      });
      if (res.ok) onSaved();
    } finally {
      setSaving(false);
    }
  }

  return (
    <input
      value={value}
      onChange={(e) => setValue(e.target.value)}
      onBlur={save}
      disabled={saving}
      placeholder="Sin notas"
      className="w-full rounded-lg border border-transparent hover:border-[#E5E5E5] focus:border-[#E5E5E5] px-2 py-1 text-xs text-[#2F2F2F] bg-transparent focus:bg-white outline-none disabled:opacity-60"
    />
  );
}
