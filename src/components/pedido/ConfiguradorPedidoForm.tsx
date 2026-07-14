"use client";

import { useState } from "react";
import {
  pedidoSchema,
  type PedidoInput,
  modeloOptions,
  zonaClimaticaOptions,
  banoInodoroOptions,
  banoEspejoOptions,
  banoDuchaOptions,
  cocinaTipoOptions,
  lavarropasOptions,
  energiaSolarOptions,
  calefonOptions,
  galeriaOptions,
} from "@/lib/validators/pedido";
import {
  nombreSchema,
  telefonoSchema,
  emailSchema,
  validateField,
} from "@/lib/validators/configurador";

// ─── Spanish labels for the form UI ───────────────────────

const modeloLabelsEs: Record<PedidoInput["modelo"], string> = {
  "10ft": "10ft (18m²)",
  "20ft": "20ft (37m²)",
  "40ft": "40ft (74m²)",
};

const zonaClimaticaLabelsEs: Record<PedidoInput["zonaClimatica"], string> = {
  templada: "Templada",
  frio_intenso: "Frío intenso",
  calor_extremo: "Calor extremo",
  humedad_alta: "Humedad alta",
};

const banoInodoroLabelsEs: Record<PedidoInput["banoInodoro"], string> = {
  estandar: "Estándar",
  inteligente_bidet: "Inteligente con bidet",
};

const banoEspejoLabelsEs: Record<PedidoInput["banoEspejo"], string> = {
  comun: "Común",
  inteligente_led: "Inteligente con LED",
};

const banoDuchaLabelsEs: Record<PedidoInput["banoDucha"], string> = {
  estandar_esquinero: "Estándar esquinero",
  premium: "Premium",
};

const cocinaTipoLabelsEs: Record<PedidoInput["cocinaTipo"], string> = {
  vitroceramica: "Vitrocerámica",
  espacio_gas: "Espacio para garrafa/gas",
};

const lavarropasLabelsEs: Record<PedidoInput["lavarropas"], string> = {
  sin_preinstalacion: "Sin preinstalación",
  con_preinstalacion: "Con preinstalación",
};

const energiaSolarLabelsEs: Record<PedidoInput["energiaSolar"], string> = {
  sin: "Sin energía solar",
  preinstalacion: "Solo preinstalación",
  kit_incluido: "Kit incluido",
};

const calefonLabelsEs: Record<PedidoInput["calefon"], string> = {
  sin: "Sin calefón",
  electrico: "Calefón eléctrico",
};

const galeriaLabelsEs: Record<PedidoInput["galeria"], string> = {
  sin: "Sin galería",
  balcon_techo: "Balcón con techo",
  galeria_perimetral: "Galería perimetral",
};

const DEFAULT_VALUES: PedidoInput = {
  clienteNombre: "",
  clienteWhatsapp: "",
  clienteEmail: "",
  modelo: "20ft",
  zonaClimatica: "templada",
  banoInodoro: "estandar",
  banoEspejo: "comun",
  banoDucha: "estandar_esquinero",
  cocinaTipo: "vitroceramica",
  cocinaExtractor: false,
  cocinaAlacena: false,
  cocinaVentana: false,
  aberturaRejas: false,
  aberturaMosquitero: false,
  aberturaCortinas: false,
  lavarropas: "sin_preinstalacion",
  energiaSolar: "sin",
  calefon: "sin",
  galeria: "sin",
  mejoraParedes100: false,
  mejoraTripleVidrio: false,
  mejoraTechoSandwich: false,
};

function base64ToBlob(base64: string, type: string): Blob {
  const bytes = atob(base64);
  const array = new Uint8Array(bytes.length);
  for (let i = 0; i < bytes.length; i++) array[i] = bytes.charCodeAt(i);
  return new Blob([array], { type });
}

function SectionCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-2xl border border-[#E5E5E5] p-5 space-y-4">
      <h2 className="text-sm font-bold uppercase tracking-widest text-sage-600">{title}</h2>
      {children}
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block space-y-1.5">
      <span className="text-sm font-medium text-[#2F2F2F]">{label}</span>
      {children}
    </label>
  );
}

const selectClass =
  "w-full rounded-lg border border-[#E5E5E5] px-3 py-2.5 text-sm text-[#2F2F2F] bg-white focus:outline-none focus:ring-2 focus:ring-sage-500";

const checkboxRowClass = "flex items-center gap-2.5 text-sm text-[#2F2F2F]";

export default function ConfiguradorPedidoForm() {
  const [form, setForm] = useState<PedidoInput>(DEFAULT_VALUES);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [pdfBase64, setPdfBase64] = useState<string | null>(null);

  function update<K extends keyof PedidoInput>(key: K, value: PedidoInput[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function validateContact(): boolean {
    const next: Record<string, string> = {};
    const nombreErr = validateField(nombreSchema, form.clienteNombre);
    if (nombreErr) next.clienteNombre = nombreErr;
    const telErr = validateField(telefonoSchema, form.clienteWhatsapp);
    if (telErr) next.clienteWhatsapp = telErr;
    if (form.clienteEmail) {
      const emailErr = validateField(emailSchema, form.clienteEmail);
      if (emailErr) next.clienteEmail = emailErr;
    }
    setErrors(next);
    return Object.keys(next).length === 0;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitError(null);

    if (!validateContact()) return;

    const parsed = pedidoSchema.safeParse(form);
    if (!parsed.success) {
      setSubmitError("Revisá los datos ingresados.");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/pedido", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(parsed.data),
      });
      if (!res.ok) {
        throw new Error("request-failed");
      }
      const json = await res.json();
      setPdfBase64(json.pdfBase64);
    } catch {
      setSubmitError("No pudimos enviar tu configuración. Probá de nuevo en unos minutos.");
    } finally {
      setSubmitting(false);
    }
  }

  function downloadPdf() {
    if (!pdfBase64) return;
    const blob = base64ToBlob(pdfBase64, "application/pdf");
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `pedido-movara-${form.clienteNombre.trim().replace(/\s+/g, "-").toLowerCase() || "detalle"}.pdf`;
    a.click();
    URL.revokeObjectURL(url);
  }

  if (pdfBase64) {
    return (
      <div className="max-w-lg mx-auto px-6 py-16 text-center">
        <div className="bg-[#2F2F2F] rounded-2xl p-8">
          <p className="text-sage-500 text-xs font-bold uppercase tracking-widest mb-3">
            Configuración recibida
          </p>
          <h1 className="text-white text-xl font-bold mb-3">¡Gracias, {form.clienteNombre}!</h1>
          <p className="text-stone-300 text-sm leading-relaxed mb-6">
            Recibimos tu configuración. Te dejamos una copia del detalle. Luciano se va a
            contactar para coordinar los próximos pasos.
          </p>
          <button
            type="button"
            onClick={downloadPdf}
            className="w-full py-3.5 bg-sage-500 hover:bg-sage-600 text-[#2F2F2F] font-bold text-sm rounded-xl transition-colors"
          >
            Descargar comprobante (PDF)
          </button>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="max-w-2xl mx-auto px-6 py-12 space-y-6">
      <div className="bg-[#2F2F2F] rounded-2xl px-6 py-8 text-center">
        <p className="text-sage-500 text-xs font-bold uppercase tracking-widest mb-2">
          Configurador de pedido
        </p>
        <h1 className="text-white text-xl font-bold">Detalle final de tu módulo MOVARA</h1>
        <p className="text-stone-300 text-sm mt-2">
          Completá las especificaciones exactas para avanzar con tu pedido.
        </p>
      </div>

      <SectionCard title="Tus datos">
        <Field label="Nombre completo">
          <input
            className={selectClass}
            value={form.clienteNombre}
            onChange={(e) => update("clienteNombre", e.target.value)}
            placeholder="Ej: Juan García"
          />
          {errors.clienteNombre && (
            <p className="text-xs text-red-600">{errors.clienteNombre}</p>
          )}
        </Field>
        <Field label="WhatsApp">
          <input
            className={selectClass}
            value={form.clienteWhatsapp}
            onChange={(e) => update("clienteWhatsapp", e.target.value)}
            placeholder="Ej: +54 9 11 1234-5678"
          />
          {errors.clienteWhatsapp && (
            <p className="text-xs text-red-600">{errors.clienteWhatsapp}</p>
          )}
        </Field>
        <Field label="Email (opcional)">
          <input
            className={selectClass}
            value={form.clienteEmail}
            onChange={(e) => update("clienteEmail", e.target.value)}
            placeholder="Ej: juan@example.com"
          />
          {errors.clienteEmail && <p className="text-xs text-red-600">{errors.clienteEmail}</p>}
        </Field>
      </SectionCard>

      <SectionCard title="Modelo y zona">
        <Field label="Modelo">
          <select
            className={selectClass}
            value={form.modelo}
            onChange={(e) => update("modelo", e.target.value as PedidoInput["modelo"])}
          >
            {modeloOptions.map((v) => (
              <option key={v} value={v}>
                {modeloLabelsEs[v]}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Zona climática de instalación">
          <select
            className={selectClass}
            value={form.zonaClimatica}
            onChange={(e) =>
              update("zonaClimatica", e.target.value as PedidoInput["zonaClimatica"])
            }
          >
            {zonaClimaticaOptions.map((v) => (
              <option key={v} value={v}>
                {zonaClimaticaLabelsEs[v]}
              </option>
            ))}
          </select>
        </Field>
      </SectionCard>

      <SectionCard title="Baño">
        <Field label="Inodoro">
          <select
            className={selectClass}
            value={form.banoInodoro}
            onChange={(e) => update("banoInodoro", e.target.value as PedidoInput["banoInodoro"])}
          >
            {banoInodoroOptions.map((v) => (
              <option key={v} value={v}>
                {banoInodoroLabelsEs[v]}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Espejo">
          <select
            className={selectClass}
            value={form.banoEspejo}
            onChange={(e) => update("banoEspejo", e.target.value as PedidoInput["banoEspejo"])}
          >
            {banoEspejoOptions.map((v) => (
              <option key={v} value={v}>
                {banoEspejoLabelsEs[v]}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Cabina de ducha">
          <select
            className={selectClass}
            value={form.banoDucha}
            onChange={(e) => update("banoDucha", e.target.value as PedidoInput["banoDucha"])}
          >
            {banoDuchaOptions.map((v) => (
              <option key={v} value={v}>
                {banoDuchaLabelsEs[v]}
              </option>
            ))}
          </select>
        </Field>
      </SectionCard>

      <SectionCard title="Cocina">
        <Field label="Tipo de cocción">
          <select
            className={selectClass}
            value={form.cocinaTipo}
            onChange={(e) => update("cocinaTipo", e.target.value as PedidoInput["cocinaTipo"])}
          >
            {cocinaTipoOptions.map((v) => (
              <option key={v} value={v}>
                {cocinaTipoLabelsEs[v]}
              </option>
            ))}
          </select>
        </Field>
        <label className={checkboxRowClass}>
          <input
            type="checkbox"
            checked={form.cocinaExtractor}
            onChange={(e) => update("cocinaExtractor", e.target.checked)}
          />
          Extractor de olores
        </label>
        <label className={checkboxRowClass}>
          <input
            type="checkbox"
            checked={form.cocinaAlacena}
            onChange={(e) => update("cocinaAlacena", e.target.checked)}
          />
          Alacena superior
        </label>
        <label className={checkboxRowClass}>
          <input
            type="checkbox"
            checked={form.cocinaVentana}
            onChange={(e) => update("cocinaVentana", e.target.checked)}
          />
          Ventana cerca de la zona de cocción
        </label>
      </SectionCard>

      <SectionCard title="Aberturas">
        <label className={checkboxRowClass}>
          <input
            type="checkbox"
            checked={form.aberturaRejas}
            onChange={(e) => update("aberturaRejas", e.target.checked)}
          />
          Rejas de seguridad
        </label>
        <label className={checkboxRowClass}>
          <input
            type="checkbox"
            checked={form.aberturaMosquitero}
            onChange={(e) => update("aberturaMosquitero", e.target.checked)}
          />
          Mosquiteros
        </label>
        <label className={checkboxRowClass}>
          <input
            type="checkbox"
            checked={form.aberturaCortinas}
            onChange={(e) => update("aberturaCortinas", e.target.checked)}
          />
          Cortinas incluidas
        </label>
      </SectionCard>

      <SectionCard title="Lavarropas, energía y confort">
        <Field label="Lavarropas">
          <select
            className={selectClass}
            value={form.lavarropas}
            onChange={(e) => update("lavarropas", e.target.value as PedidoInput["lavarropas"])}
          >
            {lavarropasOptions.map((v) => (
              <option key={v} value={v}>
                {lavarropasLabelsEs[v]}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Energía solar">
          <select
            className={selectClass}
            value={form.energiaSolar}
            onChange={(e) =>
              update("energiaSolar", e.target.value as PedidoInput["energiaSolar"])
            }
          >
            {energiaSolarOptions.map((v) => (
              <option key={v} value={v}>
                {energiaSolarLabelsEs[v]}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Calefón">
          <select
            className={selectClass}
            value={form.calefon}
            onChange={(e) => update("calefon", e.target.value as PedidoInput["calefon"])}
          >
            {calefonOptions.map((v) => (
              <option key={v} value={v}>
                {calefonLabelsEs[v]}
              </option>
            ))}
          </select>
        </Field>
      </SectionCard>

      <SectionCard title="Galería y balcón">
        <Field label="Configuración exterior">
          <select
            className={selectClass}
            value={form.galeria}
            onChange={(e) => update("galeria", e.target.value as PedidoInput["galeria"])}
          >
            {galeriaOptions.map((v) => (
              <option key={v} value={v}>
                {galeriaLabelsEs[v]}
              </option>
            ))}
          </select>
        </Field>
      </SectionCard>

      <SectionCard title="Mejoras de eficiencia térmica">
        <label className={checkboxRowClass}>
          <input
            type="checkbox"
            checked={form.mejoraParedes100}
            onChange={(e) => update("mejoraParedes100", e.target.checked)}
          />
          Paneles de pared 100mm
        </label>
        <label className={checkboxRowClass}>
          <input
            type="checkbox"
            checked={form.mejoraTripleVidrio}
            onChange={(e) => update("mejoraTripleVidrio", e.target.checked)}
          />
          Triple vidrio
        </label>
        <label className={checkboxRowClass}>
          <input
            type="checkbox"
            checked={form.mejoraTechoSandwich}
            onChange={(e) => update("mejoraTechoSandwich", e.target.checked)}
          />
          Techo panel sándwich
        </label>
      </SectionCard>

      {submitError && (
        <p className="text-sm text-red-600 text-center">{submitError}</p>
      )}

      <button
        type="submit"
        disabled={submitting}
        className="w-full py-4 bg-sage-500 hover:bg-sage-600 disabled:opacity-60 text-[#2F2F2F] font-bold text-sm rounded-xl transition-colors"
      >
        {submitting ? "Enviando..." : "Enviar configuración"}
      </button>
    </form>
  );
}
