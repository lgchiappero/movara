import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { clienteSchema } from "@/lib/validators/cliente";
import { clavesContacto } from "@/lib/clientes/normalizar";

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const parsed = clienteSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Datos inválidos", details: parsed.error.issues },
      { status: 400 }
    );
  }

  try {
    const cliente = await db.cliente.create({
      data: { ...parsed.data, ...clavesContacto(parsed.data.email, parsed.data.telefono) },
    });
    return NextResponse.json({ ok: true, id: cliente.id }, { status: 201 });
  } catch (err) {
    console.error("[admin/clientes POST]", err);
    return NextResponse.json({ error: "Error al crear el cliente" }, { status: 500 });
  }
}
