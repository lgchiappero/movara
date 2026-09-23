import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { envioSchema } from "@/lib/validators/envio";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await req.json().catch(() => null);
  const parsed = envioSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Datos inválidos", details: parsed.error.issues },
      { status: 400 }
    );
  }

  try {
    const envio = await db.envio.update({ where: { id }, data: parsed.data });
    return NextResponse.json({ ok: true, envio });
  } catch (err) {
    console.error("[admin/envios/:id PATCH]", err);
    return NextResponse.json({ error: "Error al guardar" }, { status: 500 });
  }
}
