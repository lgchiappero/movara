import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { nombreSchema, telefonoSchema } from "@/lib/validators/configurador";

const NuevaConfigSchema = z.object({
  clienteNombre: nombreSchema,
  clienteWhatsapp: telefonoSchema.optional().or(z.literal("")),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = NuevaConfigSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Datos inválidos" }, { status: 400 });
    }

    const config = await db.configuracionPedido.create({
      data: {
        clienteNombre: parsed.data.clienteNombre,
        clienteWhatsapp: parsed.data.clienteWhatsapp || null,
        estado: "pendiente",
      },
    });

    return NextResponse.json({ ok: true, id: config.id }, { status: 201 });
  } catch (err) {
    console.error("[admin/configuraciones]", err);
    return NextResponse.json({ error: "Error al crear la configuración" }, { status: 500 });
  }
}
