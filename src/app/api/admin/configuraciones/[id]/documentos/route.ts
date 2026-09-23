import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getAdminUser } from "@/lib/admin/current-user";
import { validateFile } from "@/lib/admin/file-validation";
import { buildStoragePath, uploadDocument, BUCKET_PEDIDOS } from "@/lib/admin/storage";
import { tipoDocumentoOptions, campoDestinoOptions } from "@/lib/validators/documentos";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: pedidoId } = await params;

  const session = await getAdminUser();
  if (!session) {
    return NextResponse.json({ error: "Sesión inválida" }, { status: 401 });
  }

  const pedido = await db.configuracionPedido.findUnique({ where: { id: pedidoId } });
  if (!pedido) {
    return NextResponse.json({ error: "Pedido no encontrado" }, { status: 404 });
  }

  const form = await req.formData().catch(() => null);
  if (!form) {
    return NextResponse.json({ error: "Formulario inválido" }, { status: 400 });
  }

  const file = form.get("file");
  const tipo = form.get("tipo");
  const nombre = form.get("nombre");
  const notas = form.get("notas");
  const campo = form.get("campo");

  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Falta el archivo" }, { status: 400 });
  }
  if (typeof tipo !== "string" || !tipoDocumentoOptions.includes(tipo as (typeof tipoDocumentoOptions)[number])) {
    return NextResponse.json({ error: "Tipo de documento inválido" }, { status: 400 });
  }
  if (campo !== null && (typeof campo !== "string" || !campoDestinoOptions.includes(campo as (typeof campoDestinoOptions)[number]))) {
    return NextResponse.json({ error: "Campo de destino inválido" }, { status: 400 });
  }

  const validation = validateFile({ size: file.size, type: file.type });
  if (!validation.valid) {
    return NextResponse.json({ error: validation.error }, { status: 400 });
  }

  const path = buildStoragePath("pedidos", pedidoId, file.name);
  const bytes = await file.arrayBuffer();

  try {
    await uploadDocument(BUCKET_PEDIDOS, path, bytes, file.type);
  } catch (err) {
    console.error("[documentos]", err);
    return NextResponse.json({ error: "No pudimos subir el archivo" }, { status: 500 });
  }

  const [documento] = await db.$transaction([
    db.documentoPedido.create({
      data: {
        pedidoId,
        tipo,
        nombre: typeof nombre === "string" && nombre.trim() ? nombre.trim() : file.name,
        url: path,
        notas: typeof notas === "string" && notas.trim() ? notas.trim() : null,
        subidoPor: session.email,
      },
    }),
    ...(campo ? [db.configuracionPedido.update({ where: { id: pedidoId }, data: { [campo as string]: path } })] : []),
  ]);

  return NextResponse.json({ ok: true, id: documento.id, path }, { status: 201 });
}
