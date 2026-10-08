"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import SearchableSelect from "@/components/admin/SearchableSelect";

export type UnidadParaRecibo = {
  id: string;
  numeroUnidad: string | null;
  modelo: string | null;
  lugarPorDefecto: string;
  reciboVigente: string | null; // nº del recibo no anulado, si ya tiene
  cliente: { nombre: string; dni: string | null; cuit: string | null; email: string | null; telefono: string | null };
};

const inputClass =
  "w-full rounded-lg border border-[#E5E5E5] px-3 py-2 text-sm text-[#2F2F2F] bg-white focus:outline-none focus:ring-2 focus:ring-[#D4B06A]";

function hoyISO(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

/** Faltantes para emitir el recibo — mismos requisitos que el servidor. */
export function faltantesUnidad(u: UnidadParaRecibo): string[] {
  const faltan: string[] = [];
  if (!u.numeroUnidad?.trim()) faltan.push("Nº de unidad");
  if (!u.modelo?.trim()) faltan.push("modelo");
  if (!u.cliente.email?.trim()) faltan.push("email del cliente");
  return faltan;
}

export default function NuevoReciboForm({ unidades, unidadInicial }: { unidades: UnidadParaRecibo[]; unidadInicial?: string }) {
  const router = useRouter();
  const inicial = unidades.find((u) => u.id === unidadInicial);
  const [unidadId, setUnidadId] = useState(inicial?.id ?? "");
  const [fecha, setFecha] = useState(hoyISO());
  const [lugar, setLugar] = useState(inicial?.lugarPorDefecto ?? "");
  const [observaciones, setObservaciones] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const unidad = unidades.find((u) => u.id === unidadId) ?? null;
  const faltan = unidad ? faltantesUnidad(unidad) : [];
  const bloqueada = !!unidad && (faltan.length > 0 || !!unidad.reciboVigente);
  const puedeCrear = !!unidad && !bloqueada && !!fecha && lugar.trim().length >= 3 && !enviando;

  const opciones = useMemo(
    () =>
      unidades.map((u) => ({
        value: u.id,
        label: `${u.numeroUnidad ?? "Sin número"} · ${u.cliente.nombre}${u.modelo ? ` · ${u.modelo}` : ""}`,
      })),
    [unidades]
  );

  function elegirUnidad(id: string) {
    setUnidadId(id);
    setError(null);
    const u = unidades.find((x) => x.id === id);
    setLugar(u?.lugarPorDefecto ?? "");
  }

  async function crear(e: React.FormEvent) {
    e.preventDefault();
    if (!puedeCrear) return;
    setEnviando(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/recibos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ unidadId, fechaEntrega: fecha, lugarEntrega: lugar, observaciones }),
      });
      const json = await res.json().catch(() => null);
      if (!res.ok) {
        setError(json?.error ?? "No pudimos crear el recibo.");
        return;
      }
      router.push(`/admin/recibos/${json.id}?email=${json.emailEnviado ? "enviado" : "error"}`);
    } catch {
      setError("No pudimos crear el recibo. Probá de nuevo.");
    } finally {
      setEnviando(false);
    }
  }

  return (
    <form onSubmit={crear} className="space-y-5">
      <div className="bg-white rounded-2xl border border-[#E5E5E5] p-5 space-y-4">
        <label className="block space-y-1.5">
          <span className="text-xs font-medium text-stone-500">Unidad (buscá por cliente o Nº de unidad)</span>
          <SearchableSelect options={opciones} value={unidadId} onChange={elegirUnidad} placeholder="Buscar unidad..." />
        </label>

        {unidad && (
          <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2 text-sm bg-[#FAF8F3] rounded-xl p-4" aria-label="Datos precargados">
            {(
              [
                ["Cliente", unidad.cliente.nombre, true],
                ["DNI", unidad.cliente.dni, false],
                ["CUIT", unidad.cliente.cuit, false],
                ["Email", unidad.cliente.email, true],
                ["Teléfono", unidad.cliente.telefono, false],
                ["Nº de unidad", unidad.numeroUnidad, true],
                ["Modelo", unidad.modelo, true],
              ] as const
            ).map(([label, valor, requerido]) => (
              <div key={label} className="flex justify-between gap-3">
                <dt className="text-stone-500">{label}</dt>
                <dd
                  className={
                    valor ? "text-[#2F2F2F] font-medium text-right break-all" : requerido ? "text-red-500 text-right" : "text-stone-400 text-right"
                  }
                >
                  {valor || (requerido ? "Falta" : "—")}
                </dd>
              </div>
            ))}
          </dl>
        )}

        {unidad && faltan.length > 0 && (
          <p role="alert" className="text-sm text-red-600">
            Para emitir el recibo falta: {faltan.join(", ")}. Completalo en la ficha de la unidad o del cliente.
          </p>
        )}
        {unidad?.reciboVigente && (
          <p role="alert" className="text-sm text-red-600">
            Esta unidad ya tiene el recibo {unidad.reciboVigente} sin anular.
          </p>
        )}
      </div>

      <div className="bg-white rounded-2xl border border-[#E5E5E5] p-5 space-y-4">
        <label className="block space-y-1.5">
          <span className="text-xs font-medium text-stone-500">Fecha de entrega</span>
          <input type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} className={inputClass} required />
        </label>
        <label className="block space-y-1.5">
          <span className="text-xs font-medium text-stone-500">Lugar de entrega</span>
          <input
            value={lugar}
            onChange={(e) => setLugar(e.target.value)}
            maxLength={300}
            placeholder="Dirección, localidad, provincia"
            className={inputClass}
          />
        </label>
        <label className="block space-y-1.5">
          <span className="text-xs font-medium text-stone-500">Observaciones (opcional)</span>
          <textarea
            value={observaciones}
            onChange={(e) => setObservaciones(e.target.value)}
            maxLength={2000}
            rows={3}
            placeholder="Si hay algo para dejar asentado sobre el estado de la unidad"
            className={inputClass}
          />
        </label>
      </div>

      {error && (
        <p role="alert" className="text-sm text-red-600">
          {error}
        </p>
      )}
      <div className="flex items-center justify-between gap-4">
        <p className="text-xs text-stone-500">Al crear el recibo se le envía al cliente un email con el link de confirmación.</p>
        <button
          type="submit"
          disabled={!puedeCrear}
          className="shrink-0 px-4 py-2 bg-[#D4B06A] hover:bg-[#c19f57] disabled:opacity-50 text-[#2F2F2F] font-bold text-sm rounded-lg transition-colors"
        >
          {enviando ? "Creando..." : "Crear y enviar al cliente"}
        </button>
      </div>
    </form>
  );
}
