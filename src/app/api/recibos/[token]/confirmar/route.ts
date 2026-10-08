import { NextRequest, NextResponse } from "next/server";
import { confirmarReciboSchema, tokenReciboSchema } from "@/lib/validators/recibo";
import { claveIP, consumirRateLimit } from "@/lib/rate-limit-db";
import { getClientIP } from "@/lib/rate-limit";
import { confirmarRecibo, despuesDeConfirmar } from "@/lib/recibos/servicio";
import { evidenciaRequest } from "@/lib/recibos/http";
import { fechaFinGarantia, fechaHoraAR, fechaLargaUTC } from "@/lib/recibos/texto";
import { hashAbreviado } from "@/lib/recibos/hash";

const CONFIRMACIONES_POR_HORA = 10;
const LINK_INVALIDO = "Este link no es válido. Escribinos por WhatsApp y te ayudamos.";

/** Confirmación del Recibo en Conformidad. Es el ÚNICO lugar donde se
 * confirma: exige un POST explícito con { confirmo: true }. Abrir la página
 * (GET) nunca confirma — los escáneres de correo abren los links solos. */
export async function POST(req: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  if (!tokenReciboSchema.safeParse(token).success) {
    return NextResponse.json({ error: LINK_INVALIDO }, { status: 404 });
  }
  if (!confirmarReciboSchema.safeParse(await req.json().catch(() => null)).success) {
    return NextResponse.json({ error: "Confirmación inválida" }, { status: 400 });
  }

  const permitido = await consumirRateLimit(claveIP("recibo-confirmar", getClientIP(req)), CONFIRMACIONES_POR_HORA, 60 * 60_000);
  if (!permitido) {
    return NextResponse.json({ error: "Demasiados intentos. Probá de nuevo en una hora." }, { status: 429 });
  }

  const res = await confirmarRecibo(token, evidenciaRequest(req));
  if (!res.ok) {
    return NextResponse.json({ error: res.status === 404 ? LINK_INVALIDO : res.error }, { status: res.status });
  }

  await despuesDeConfirmar(res.recibo);

  return NextResponse.json({
    ok: true,
    numeroRecibo: res.recibo.numeroRecibo,
    confirmadoTexto: fechaHoraAR(res.recibo.confirmadoAt!),
    garantiaHastaTexto: fechaLargaUTC(fechaFinGarantia(res.recibo.fechaEntrega)),
    hashAbreviado: hashAbreviado(res.recibo.hashContenido!),
  });
}
