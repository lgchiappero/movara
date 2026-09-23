import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { clienteSchema } from "@/lib/validators/cliente";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await req.json().catch(() => null);
  const parsed = clienteSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Datos inválidos", details: parsed.error.issues },
      { status: 400 }
    );
  }

  try {
    const cliente = await db.cliente.update({ where: { id }, data: parsed.data });
    return NextResponse.json({ ok: true, cliente });
  } catch (err) {
    console.error("[admin/clientes/:id PATCH]", err);
    return NextResponse.json({ error: "Error al guardar" }, { status: 500 });
  }
}
