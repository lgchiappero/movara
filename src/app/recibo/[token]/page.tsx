import { tokenReciboSchema } from "@/lib/validators/recibo";
import { reciboPorToken } from "@/lib/recibos/servicio";
import { construirTextoRecibo, fechaFinGarantia, fechaHoraAR, fechaLargaUTC } from "@/lib/recibos/texto";
import { hashAbreviado } from "@/lib/recibos/hash";
import { datosTexto } from "@/lib/recibos/servicio";
import { primerNombre } from "@/lib/email/recibo-emails";
import { getWhatsAppUrl } from "@/lib/whatsapp";
import { WHATSAPP_MOVARA_NUMERO, WHATSAPP_MOVARA_VISIBLE } from "@/lib/recibos/constantes";
import MarcaMovara from "@/components/recibo/MarcaMovara";
import ReciboPendienteVista from "@/components/recibo/ReciboPendienteVista";
import ReciboConfirmadoVista from "@/components/recibo/ReciboConfirmadoVista";
import { serif } from "@/components/recibo/estilos";

export const dynamic = "force-dynamic";

/** Página pública del Recibo en Conformidad. Solo LEE: renderizarla nunca
 * confirma nada (los escáneres de correo abren los links solos). */
export default async function ReciboPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const recibo = tokenReciboSchema.safeParse(token).success ? await reciboPorToken(token) : null;

  return (
    <main className="mx-auto max-w-md px-5 pt-10 pb-12 space-y-8">
      <MarcaMovara />
      {!recibo ? (
        <div className="text-center space-y-4 pt-6">
          <h1 className="text-2xl text-stone-50" style={serif}>
            Link no válido
          </h1>
          <p className="text-sm text-stone-400 leading-relaxed">
            Este link no es válido o ya no está disponible. Si necesitás confirmar la recepción de tu MOVARA, escribinos y te ayudamos.
          </p>
          <a
            href={getWhatsAppUrl("Hola! Mi link del Recibo en Conformidad no funciona.", WHATSAPP_MOVARA_NUMERO)}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-block py-3 px-6 rounded-xl border border-[#D4B36A] text-[#D4B36A] text-sm font-semibold"
          >
            Escribinos por WhatsApp
          </a>
        </div>
      ) : recibo.estado === "confirmado" ? (
        <ReciboConfirmadoVista
          d={{
            token,
            numeroRecibo: recibo.numeroRecibo,
            nombre: primerNombre(recibo.clienteNombre),
            confirmadoTexto: fechaHoraAR(recibo.confirmadoAt!),
            clienteEmail: recibo.clienteEmail,
            hashAbreviado: hashAbreviado(recibo.hashContenido ?? ""),
            garantiaHastaTexto: fechaLargaUTC(fechaFinGarantia(recibo.fechaEntrega)),
          }}
        />
      ) : (
        <ReciboPendienteVista
          token={token}
          texto={construirTextoRecibo(datosTexto(recibo))}
          confirmado={{
            token,
            numeroRecibo: recibo.numeroRecibo,
            nombre: primerNombre(recibo.clienteNombre),
            clienteEmail: recibo.clienteEmail,
          }}
        />
      )}
      <p className="text-center text-[11px] text-stone-600">
        MOVARA · <a href={`https://wa.me/${WHATSAPP_MOVARA_NUMERO}`} className="hover:text-stone-400">{WHATSAPP_MOVARA_VISIBLE}</a>
      </p>
    </main>
  );
}
