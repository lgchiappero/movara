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
  lavarropaUbicacionOptions,
  energiaSolarOptions,
  calefonOptions,
  galeriaOptions,
  paredInteriorColorOptions,
  paredInteriorRevestimientoOptions,
  paredExteriorColorOptions,
  paredExteriorRevestimientoOptions,
  banoRevestimientoOptions,
  banoColorSanitariosOptions,
  cocinaRevestimientoOptions,
  cocinaColorMueblesOptions,
  puertaPrincipalTipoOptions,
  puertaPrincipalMaterialOptions,
  puertaPrincipalColorOptions,
  puertaInteriorTipoOptions,
  puertaInteriorColorOptions,
  ventanaTipoOptions,
} from "@/lib/validators/pedido";
import {
  nombreSchema,
  telefonoSchema,
  emailSchema,
  validateField,
} from "@/lib/validators/configurador";
import {
  modeloLabelsEs,
  zonaClimaticaLabelsEs,
  banoInodoroLabelsEs,
  banoEspejoLabelsEs,
  banoDuchaLabelsEs,
  cocinaTipoLabelsEs,
  lavarropaUbicacionLabelsEs,
  energiaSolarLabelsEs,
  calefonLabelsEs,
  galeriaLabelsEs,
  paredInteriorColorLabelsEs,
  paredInteriorRevestimientoLabelsEs,
  paredExteriorColorLabelsEs,
  paredExteriorRevestimientoLabelsEs,
  banoRevestimientoLabelsEs,
  banoColorSanitariosLabelsEs,
  cocinaRevestimientoLabelsEs,
  cocinaColorMueblesLabelsEs,
  puertaPrincipalTipoLabelsEs,
  puertaPrincipalMaterialLabelsEs,
  puertaPrincipalColorLabelsEs,
  puertaInteriorTipoLabelsEs,
  puertaInteriorColorLabelsEs,
  ventanaTipoLabelsEs,
} from "@/lib/pdf/pedido-labels-es";

function getDefaultValues(
  configId: string,
  initialNombre: string,
  initialWhatsapp: string
): PedidoInput {
  return {
  configId,
  clienteNombre: initialNombre,
  clienteWhatsapp: initialWhatsapp,
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
  lavarropaIncluye: false,
  lavarropaUbicacion: undefined,
  energiaSolar: "sin",
  calefon: "sin",
  galeria: "sin",
  mejoraParedes100: false,
  mejoraTripleVidrio: false,
  mejoraTechoSandwich: false,
  paredInteriorColor: "blanco",
  paredInteriorRevestimiento: "pintura_lisa",
  paredExteriorColor: "blanco",
  paredExteriorRevestimiento: "chapa_prepintada",
  banoRevestimiento: "ceramico_blanco",
  banoColorSanitarios: "blanco",
  cocinaRevestimiento: "ceramico_blanco",
  cocinaColorMuebles: "blanco",
  puertaPrincipalTipo: "placa_simple",
  puertaPrincipalMaterial: "acero_pintado",
  puertaPrincipalColor: "blanco",
  puertaInteriorTipo: "placa",
  puertaInteriorColor: "blanco",
  ventanaTipo: "tipo_a",
  };
}

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

type Props = {
  configId: string;
  initialNombre?: string;
  initialWhatsapp?: string;
};

export default function ConfiguradorPedidoForm({
  configId,
  initialNombre = "",
  initialWhatsapp = "",
}: Props) {
  const [form, setForm] = useState<PedidoInput>(() =>
    getDefaultValues(configId, initialNombre, initialWhatsapp)
  );
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
            ¡Listo!
          </p>
          <h1 className="text-white text-xl font-bold mb-3">¡Gracias, {form.clienteNombre}!</h1>
          <p className="text-stone-300 text-sm leading-relaxed mb-6">
            Recibimos tu configuración. Luciano se va a poner en contacto para coordinar los
            próximos pasos.
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
        <Field label="Modelo de tu MOVARA">
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
        <Field label="¿En qué zona lo vas a instalar?">
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
          Extractor de cocina
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
          Ventana cerca de la cocción
        </label>
      </SectionCard>

      <SectionCard title="Aberturas">
        <label className={checkboxRowClass}>
          <input
            type="checkbox"
            checked={form.aberturaRejas}
            onChange={(e) => update("aberturaRejas", e.target.checked)}
          />
          Rejas
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
          Cortinas
        </label>
      </SectionCard>

      <SectionCard title="Lavarropas, energía y confort">
        <label className={checkboxRowClass}>
          <input
            type="checkbox"
            checked={form.lavarropaIncluye}
            onChange={(e) => {
              const incluye = e.target.checked;
              setForm((prev) => ({
                ...prev,
                lavarropaIncluye: incluye,
                lavarropaUbicacion: incluye ? prev.lavarropaUbicacion ?? "bano" : undefined,
              }));
            }}
          />
          ¿Incluye espacio para lavarropas?
        </label>
        {form.lavarropaIncluye && (
          <Field label="¿Dónde?">
            <select
              className={selectClass}
              value={form.lavarropaUbicacion}
              onChange={(e) =>
                update("lavarropaUbicacion", e.target.value as PedidoInput["lavarropaUbicacion"])
              }
            >
              {lavarropaUbicacionOptions.map((v) => (
                <option key={v} value={v}>
                  {lavarropaUbicacionLabelsEs[v]}
                </option>
              ))}
            </select>
          </Field>
        )}
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

      <SectionCard title="Acabados y diseño">
        <p className="text-xs font-bold uppercase tracking-widest text-sage-500">
          Paredes interiores
        </p>
        <Field label="Color de paredes interiores">
          <select
            className={selectClass}
            value={form.paredInteriorColor}
            onChange={(e) =>
              update("paredInteriorColor", e.target.value as PedidoInput["paredInteriorColor"])
            }
          >
            {paredInteriorColorOptions.map((v) => (
              <option key={v} value={v}>
                {paredInteriorColorLabelsEs[v]}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Tipo de revestimiento interior">
          <select
            className={selectClass}
            value={form.paredInteriorRevestimiento}
            onChange={(e) =>
              update(
                "paredInteriorRevestimiento",
                e.target.value as PedidoInput["paredInteriorRevestimiento"]
              )
            }
          >
            {paredInteriorRevestimientoOptions.map((v) => (
              <option key={v} value={v}>
                {paredInteriorRevestimientoLabelsEs[v]}
              </option>
            ))}
          </select>
        </Field>

        <p className="text-xs font-bold uppercase tracking-widest text-sage-500 pt-2">
          Paredes exteriores
        </p>
        <Field label="Color exterior">
          <select
            className={selectClass}
            value={form.paredExteriorColor}
            onChange={(e) =>
              update("paredExteriorColor", e.target.value as PedidoInput["paredExteriorColor"])
            }
          >
            {paredExteriorColorOptions.map((v) => (
              <option key={v} value={v}>
                {paredExteriorColorLabelsEs[v]}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Tipo de revestimiento exterior">
          <select
            className={selectClass}
            value={form.paredExteriorRevestimiento}
            onChange={(e) =>
              update(
                "paredExteriorRevestimiento",
                e.target.value as PedidoInput["paredExteriorRevestimiento"]
              )
            }
          >
            {paredExteriorRevestimientoOptions.map((v) => (
              <option key={v} value={v}>
                {paredExteriorRevestimientoLabelsEs[v]}
              </option>
            ))}
          </select>
        </Field>

        <p className="text-xs font-bold uppercase tracking-widest text-sage-500 pt-2">Baño</p>
        <Field label="Revestimiento de paredes baño">
          <select
            className={selectClass}
            value={form.banoRevestimiento}
            onChange={(e) =>
              update("banoRevestimiento", e.target.value as PedidoInput["banoRevestimiento"])
            }
          >
            {banoRevestimientoOptions.map((v) => (
              <option key={v} value={v}>
                {banoRevestimientoLabelsEs[v]}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Color de sanitarios">
          <select
            className={selectClass}
            value={form.banoColorSanitarios}
            onChange={(e) =>
              update(
                "banoColorSanitarios",
                e.target.value as PedidoInput["banoColorSanitarios"]
              )
            }
          >
            {banoColorSanitariosOptions.map((v) => (
              <option key={v} value={v}>
                {banoColorSanitariosLabelsEs[v]}
              </option>
            ))}
          </select>
        </Field>

        <p className="text-xs font-bold uppercase tracking-widest text-sage-500 pt-2">Cocina</p>
        <Field label="Revestimiento de paredes cocina">
          <select
            className={selectClass}
            value={form.cocinaRevestimiento}
            onChange={(e) =>
              update(
                "cocinaRevestimiento",
                e.target.value as PedidoInput["cocinaRevestimiento"]
              )
            }
          >
            {cocinaRevestimientoOptions.map((v) => (
              <option key={v} value={v}>
                {cocinaRevestimientoLabelsEs[v]}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Color de muebles de cocina">
          <select
            className={selectClass}
            value={form.cocinaColorMuebles}
            onChange={(e) =>
              update("cocinaColorMuebles", e.target.value as PedidoInput["cocinaColorMuebles"])
            }
          >
            {cocinaColorMueblesOptions.map((v) => (
              <option key={v} value={v}>
                {cocinaColorMueblesLabelsEs[v]}
              </option>
            ))}
          </select>
        </Field>
      </SectionCard>

      <SectionCard title="Puertas y aberturas">
        <p className="text-xs font-bold uppercase tracking-widest text-sage-500">
          Puerta de ingreso principal
        </p>
        <Field label="Tipo">
          <select
            className={selectClass}
            value={form.puertaPrincipalTipo}
            onChange={(e) =>
              update("puertaPrincipalTipo", e.target.value as PedidoInput["puertaPrincipalTipo"])
            }
          >
            {puertaPrincipalTipoOptions.map((v) => (
              <option key={v} value={v}>
                {puertaPrincipalTipoLabelsEs[v]}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Material">
          <select
            className={selectClass}
            value={form.puertaPrincipalMaterial}
            onChange={(e) =>
              update(
                "puertaPrincipalMaterial",
                e.target.value as PedidoInput["puertaPrincipalMaterial"]
              )
            }
          >
            {puertaPrincipalMaterialOptions.map((v) => (
              <option key={v} value={v}>
                {puertaPrincipalMaterialLabelsEs[v]}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Color">
          <select
            className={selectClass}
            value={form.puertaPrincipalColor}
            onChange={(e) =>
              update(
                "puertaPrincipalColor",
                e.target.value as PedidoInput["puertaPrincipalColor"]
              )
            }
          >
            {puertaPrincipalColorOptions.map((v) => (
              <option key={v} value={v}>
                {puertaPrincipalColorLabelsEs[v]}
              </option>
            ))}
          </select>
        </Field>

        <p className="text-xs font-bold uppercase tracking-widest text-sage-500 pt-2">
          Puerta interior (entre ambientes)
        </p>
        <Field label="Tipo">
          <select
            className={selectClass}
            value={form.puertaInteriorTipo}
            onChange={(e) =>
              update("puertaInteriorTipo", e.target.value as PedidoInput["puertaInteriorTipo"])
            }
          >
            {puertaInteriorTipoOptions.map((v) => (
              <option key={v} value={v}>
                {puertaInteriorTipoLabelsEs[v]}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Color">
          <select
            className={selectClass}
            value={form.puertaInteriorColor}
            onChange={(e) =>
              update("puertaInteriorColor", e.target.value as PedidoInput["puertaInteriorColor"])
            }
          >
            {puertaInteriorColorOptions.map((v) => (
              <option key={v} value={v}>
                {puertaInteriorColorLabelsEs[v]}
              </option>
            ))}
          </select>
        </Field>

        <p className="text-xs font-bold uppercase tracking-widest text-sage-500 pt-2">
          Aberturas (ventanas)
        </p>
        <Field label="Tipo de abertura">
          <select
            className={selectClass}
            value={form.ventanaTipo}
            onChange={(e) => update("ventanaTipo", e.target.value as PedidoInput["ventanaTipo"])}
          >
            {ventanaTipoOptions.map((v) => (
              <option key={v} value={v}>
                {ventanaTipoLabelsEs[v]}
              </option>
            ))}
          </select>
        </Field>
        <p className="text-xs text-[#888888] italic">
          Las ventanas incluyen DVH (doble vidrio hermético) y mosquitero en todos los tipos.
        </p>
      </SectionCard>

      {submitError && (
        <p className="text-sm text-red-600 text-center">{submitError}</p>
      )}

      <button
        type="submit"
        disabled={submitting}
        className="w-full py-4 bg-sage-500 hover:bg-sage-600 disabled:opacity-60 text-[#2F2F2F] font-bold text-sm rounded-xl transition-colors"
      >
        {submitting ? "Enviando..." : "Completar mi pedido"}
      </button>
    </form>
  );
}
