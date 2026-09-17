import { NextRequest, NextResponse } from "next/server";
import { getEstadoDiasDelMes, getEstadoHorariosDelDia } from "@/lib/agenda/disponibilidad";
import { isFechaKeyValida } from "@/lib/agenda/fecha";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const fecha = searchParams.get("fecha");

  if (fecha) {
    if (!isFechaKeyValida(fecha)) {
      return NextResponse.json({ error: "Fecha inválida" }, { status: 400 });
    }
    const estado = await getEstadoHorariosDelDia(fecha);
    return NextResponse.json(estado);
  }

  const anio = Number(searchParams.get("anio"));
  const mes = Number(searchParams.get("mes"));
  if (!Number.isInteger(anio) || !Number.isInteger(mes) || mes < 1 || mes > 12) {
    return NextResponse.json({ error: "Parámetros inválidos" }, { status: 400 });
  }

  const dias = await getEstadoDiasDelMes(anio, mes);
  return NextResponse.json({ dias });
}
