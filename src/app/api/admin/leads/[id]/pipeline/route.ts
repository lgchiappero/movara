import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { leadPipelineSchema } from "@/lib/validators/lead";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await req.json().catch(() => null);
  const parsed = leadPipelineSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Datos inválidos", details: parsed.error.issues },
      { status: 400 }
    );
  }

  try {
    const lead = await db.lead.update({ where: { id }, data: parsed.data });
    return NextResponse.json({ ok: true, lead });
  } catch (err) {
    console.error("[admin/leads/:id/pipeline PATCH]", err);
    return NextResponse.json({ error: "Error al guardar" }, { status: 500 });
  }
}
