import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getAdminUser } from "@/lib/admin/current-user";
import { validateFileMovara } from "@/lib/admin/file-validation";
import { buildStoragePath, uploadDocument, BUCKET_MOVARA } from "@/lib/admin/storage";
import { seccionEnvioKeys } from "@/lib/envios/constantes";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: envioId } = await params;

  const session = await getAdminUser();
  if (!session) {
    return NextResponse.json({ error: "Sesión inválida" }, { status: 401 });
  }

  const envio = await db.envio.findUnique({ where: { id: envioId } });
  if (!envio) {
    return NextResponse.json({ error: "Envío no encontrado" }, { status: 404 });
  }

  const form = await req.formData().catch(() => null);
  if (!form) {
    return NextResponse.json({ error: "Formulario inválido" }, { status: 400 });
  }

  const file = form.get("file");
  const seccion = form.get("seccion");
  const descripcion = form.get("descripcion");

  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Falta el archivo" }, { status: 400 });
  }
  if (typeof seccion !== "string" || !(seccionEnvioKeys as string[]).includes(seccion)) {
    return NextResponse.json({ error: "Sección inválida" }, { status: 400 });
  }

  const validation = validateFileMovara({ size: file.size, type: file.type });
  if (!validation.valid) {
    return NextResponse.json({ error: validation.error }, { status: 400 });
  }

  const path = buildStoragePath("envios", envioId, file.name);
  const bytes = await file.arrayBuffer();

  try {
    await uploadDocument(BUCKET_MOVARA, path, bytes, file.type);
  } catch (err) {
    console.error("[envios/documentos]", err);
    return NextResponse.json({ error: "No pudimos subir el archivo" }, { status: 500 });
  }

  const documento = await db.documentoEnvio.create({
    data: {
      envioId,
      seccion,
      nombre: file.name,
      descripcion: typeof descripcion === "string" && descripcion.trim() ? descripcion.trim() : null,
      url: path,
      tipo: file.type,
      subidoPor: session.email,
    },
  });

  return NextResponse.json({ ok: true, id: documento.id, path }, { status: 201 });
}
