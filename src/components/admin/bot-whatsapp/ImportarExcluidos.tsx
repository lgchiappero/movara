"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/admin/Toast";
import ModalConfirmacion from "@/components/ui/ModalConfirmacion";
import { leerVcf, telefonosDeVcf } from "@/lib/bot-whatsapp/vcard";
import { CARACTERISTICA_POR_DEFECTO } from "@/lib/bot-whatsapp/importar-excluidos";
import { llamarApi } from "./api";

/** Tamaño máximo del .vcf (las fotos de los contactos lo agrandan mucho). */
export const MAX_VCF_BYTES = 30 * 1024 * 1024;

const URL_IMPORTAR = "/api/admin/bot-whatsapp/excluidos/importar";

type Resumen = {
  agregar: number;
  saltear: number;
  repetidos: number;
  yaExcluidos: number;
  invalidos: number;
  completados: number;
  caracteristica: string | null;
};
type Respuesta = { resumen: Resumen; agregados: number };
type Pendiente = { contactos: { telefono: string; nombre: string | null }[]; caracteristica: string; resumen: Resumen };

const plural = (n: number, uno: string, varios: string) => `${n} ${n === 1 ? uno : varios}`;

/** "Se saltean 5: 2 repetidos en el archivo, 1 que ya estaba, 2 sin teléfono válido." */
export function textoSalteados(r: Resumen): string {
  if (r.saltear === 0) return "No se saltea ninguno.";
  const partes = [
    r.repetidos && plural(r.repetidos, "repetido en el archivo", "repetidos en el archivo"),
    r.yaExcluidos && plural(r.yaExcluidos, "que ya estaba excluido", "que ya estaban excluidos"),
    r.invalidos && plural(r.invalidos, "sin teléfono válido", "sin teléfono válido"),
  ].filter(Boolean);
  return `Se ${r.saltear === 1 ? "saltea" : "saltean"} ${r.saltear}: ${partes.join(", ")}.`;
}

/** "De esos, 12 se completaron con la característica 3493." (vacío si ninguno). */
export function textoCompletados(r: Resumen): string {
  if (r.completados === 0) return "";
  return ` De esos, ${r.completados} ${r.completados === 1 ? "se completó" : "se completaron"} con la característica ${r.caracteristica}.`;
}

/** Mensaje del modal de confirmación. */
export function textoResumen(r: Resumen): string {
  return `Se ${r.agregar === 1 ? "agrega" : "agregan"} ${plural(r.agregar, "contacto", "contactos")}, con su nombre como etiqueta.${textoCompletados(r)} ${textoSalteados(r)}`;
}

/** Botón "Importar excluidos" (solo administrador; el servidor también lo
 * exige). El .vcf se lee en el navegador y no se sube: al servidor van solo
 * teléfono y nombre, primero para el resumen y, al confirmar, para guardar. */
export default function ImportarExcluidos() {
  const archivo = useRef<HTMLInputElement>(null);
  const [procesando, setProcesando] = useState(false);
  const [caracteristica, setCaracteristica] = useState(CARACTERISTICA_POR_DEFECTO);
  const [pendiente, setPendiente] = useState<Pendiente | null>(null);
  const toast = useToast();
  const router = useRouter();

  async function elegido(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = ""; // para poder elegir el mismo archivo otra vez
    if (!file) return;
    if (file.size > MAX_VCF_BYTES) {
      toast.showError("El archivo es demasiado grande (máximo 30 MB)");
      return;
    }
    setProcesando(true);
    try {
      const contactos = telefonosDeVcf(leerVcf(await file.text()));
      if (contactos.length === 0) {
        toast.showError("El archivo no tiene contactos con teléfono");
        return;
      }
      const { resumen } = await llamarApi<Respuesta>(URL_IMPORTAR, "POST", { contactos, caracteristica, confirmar: false });
      if (resumen.agregar === 0) toast.showError(`No hay contactos nuevos para agregar. ${textoSalteados(resumen)}`);
      else setPendiente({ contactos, caracteristica, resumen });
    } catch (err) {
      toast.showError((err as Error).message);
    } finally {
      setProcesando(false);
    }
  }

  async function confirmar({ contactos, caracteristica }: Pendiente) {
    setPendiente(null);
    setProcesando(true);
    try {
      const { agregados } = await llamarApi<Respuesta>(URL_IMPORTAR, "POST", { contactos, caracteristica, confirmar: true });
      toast.showSuccess(`${plural(agregados, "contacto agregado", "contactos agregados")} a excluidos`);
      router.refresh();
    } catch (err) {
      toast.showError((err as Error).message);
    } finally {
      setProcesando(false);
    }
  }

  return (
    <div className="flex flex-wrap items-end gap-2">
      <label className="text-xs font-medium text-stone-600">
        Característica por defecto
        <input
          type="text"
          inputMode="numeric"
          maxLength={5}
          value={caracteristica}
          onChange={(e) => setCaracteristica(e.target.value)}
          aria-describedby="ayuda-caracteristica"
          className="mt-1 block w-28 rounded-lg border border-[#E5E5E5] bg-white px-3 py-2.5 text-base sm:text-sm text-[#1A1A1A] focus:outline-none focus:ring-2 focus:ring-[#D4B36A]"
        />
      </label>
      <span id="ayuda-caracteristica" className="sr-only">
        Se usa para los números agendados sin código de área. Vacía: esos números se saltean.
      </span>
      <input
        ref={archivo}
        type="file"
        accept=".vcf,text/vcard,text/x-vcard"
        aria-label="Archivo de contactos (.vcf)"
        className="hidden"
        onChange={elegido}
      />
      <button
        type="button"
        disabled={procesando}
        onClick={() => archivo.current?.click()}
        className="min-h-11 rounded-xl border border-[#1A1A1A] px-4 text-sm font-bold text-[#1A1A1A] hover:bg-stone-50 disabled:opacity-50"
      >
        {procesando ? "Procesando…" : "Importar excluidos"}
      </button>
      {pendiente && (
        <ModalConfirmacion
          abierto
          titulo="¿Importar excluidos?"
          mensaje={textoResumen(pendiente.resumen)}
          confirmar="Importar"
          cancelar="Cancelar"
          onConfirmar={() => confirmar(pendiente)}
          onCancelar={() => setPendiente(null)}
        />
      )}
    </div>
  );
}
