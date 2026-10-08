import { getWhatsAppUrl } from "@/lib/whatsapp";
import { WHATSAPP_MOVARA_NUMERO, WHATSAPP_MOVARA_VISIBLE } from "@/lib/recibos/constantes";
import { serif } from "./estilos";

export type DatosConfirmado = {
  token: string;
  numeroRecibo: string;
  nombre: string;
  confirmadoTexto: string;
  clienteEmail: string;
  hashAbreviado: string;
  garantiaHastaTexto: string;
};

export default function ReciboConfirmadoVista({ d }: { d: DatosConfirmado }) {
  const filas: [string, string, string?][] = [
    ["Recibo", d.numeroRecibo],
    ["Confirmado", d.confirmadoTexto],
    ["Enviado a", d.clienteEmail],
    ["Código de integridad", d.hashAbreviado, "font-mono text-xs"],
  ];
  return (
    <div className="space-y-7 text-center">
      <div className="mx-auto w-16 h-16 rounded-full border-2 border-[#D4B36A] flex items-center justify-center" aria-hidden>
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#D4B36A" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M5 12.5l4.5 4.5L19 7.5" />
        </svg>
      </div>
      <div>
        <h1 className="text-3xl text-stone-50" style={serif}>
          Recepción confirmada
        </h1>
        <p className="mt-3 text-sm text-stone-400 leading-relaxed">
          Gracias, {d.nombre}. Te enviamos una copia por email. Tu garantía está vigente hasta el {d.garantiaHastaTexto}.
        </p>
      </div>

      <dl className="bg-[#222] border border-white/5 rounded-2xl p-5 text-left text-sm divide-y divide-white/5">
        {filas.map(([label, valor, extra]) => (
          <div key={label} className="flex justify-between gap-4 py-2.5 first:pt-0 last:pb-0">
            <dt className="text-stone-500 shrink-0">{label}</dt>
            <dd className={`text-stone-100 text-right break-all ${extra ?? ""}`}>{valor}</dd>
          </div>
        ))}
      </dl>

      <a
        href={`/api/recibos/${d.token}/pdf`}
        className="block w-full py-3.5 rounded-xl border border-[#D4B36A] text-[#D4B36A] font-semibold text-sm hover:bg-[#D4B36A]/10 transition-colors"
      >
        Descargar recibo (PDF)
      </a>

      <a
        href={getWhatsAppUrl(`Hola! Tengo una consulta sobre mi Recibo en Conformidad ${d.numeroRecibo}.`, WHATSAPP_MOVARA_NUMERO)}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-block text-xs text-stone-500 hover:text-stone-300"
      >
        ¿Dudas? Escribinos por WhatsApp al {WHATSAPP_MOVARA_VISIBLE}
      </a>
    </div>
  );
}
