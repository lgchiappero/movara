import { NextRequest, NextResponse } from "next/server";
import { tokenReciboSchema } from "@/lib/validators/recibo";
import { nombreArchivoPdf, obtenerPdfRecibo, reciboPorToken } from "@/lib/recibos/servicio";
import { respuestaPdf } from "@/lib/recibos/http";

/** Copia del cliente: solo con el token y solo si el recibo está confirmado.
 * Todo lo demás da el mismo 404 genérico. */
export async function GET(_req: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const recibo = tokenReciboSchema.safeParse(token).success ? await reciboPorToken(token) : null;
  if (!recibo || recibo.estado !== "confirmado") {
    return NextResponse.json({ error: "No encontrado" }, { status: 404 });
  }
  return respuestaPdf(await obtenerPdfRecibo(recibo), nombreArchivoPdf(recibo));
}
