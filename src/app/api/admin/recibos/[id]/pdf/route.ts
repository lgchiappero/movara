import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { nombreArchivoPdf, obtenerPdfRecibo } from "@/lib/recibos/servicio";
import { respuestaPdf } from "@/lib/recibos/http";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const recibo = await db.reciboConformidad.findUnique({ where: { id } });
  if (!recibo) return NextResponse.json({ error: "Recibo no encontrado" }, { status: 404 });
  if (recibo.estado !== "confirmado") {
    return NextResponse.json({ error: "El PDF está disponible cuando el cliente confirma" }, { status: 409 });
  }
  return respuestaPdf(await obtenerPdfRecibo(recibo), nombreArchivoPdf(recibo));
}
