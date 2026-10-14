import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getAdminUser } from "@/lib/admin/current-user";
import { archivoDelFormulario } from "@/lib/admin/subidas";
import { seccionUnidadKeys } from "@/lib/envios/constantes";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: unidadId } = await params;

  const session = await getAdminUser();
  if (!session) {
    return NextResponse.json({ error: "Sesión inválida" }, { status: 401 });
  }

  const unidad = await db.unidad.findUnique({ where: { id: unidadId } });
  if (!unidad) {
    return NextResponse.json({ error: "Unidad no encontrada" }, { status: 404 });
  }

  const form = await req.formData().catch(() => null);
  if (!form) {
    return NextResponse.json({ error: "Formulario inválido" }, { status: 400 });
  }

  const seccion = form.get("seccion");
  const descripcion = form.get("descripcion");

  if (typeof seccion !== "string" || !(seccionUnidadKeys as string[]).includes(seccion)) {
    return NextResponse.json({ error: "Sección inválida" }, { status: 400 });
  }

  const archivo = await archivoDelFormulario(form, "file", "unidades", unidadId);
  if (!archivo.ok) {
    return NextResponse.json({ error: archivo.error }, { status: archivo.status });
  }
  if (!archivo.value) {
    return NextResponse.json({ error: "Falta el archivo" }, { status: 400 });
  }
  const { path, nombre, tipo } = archivo.value;

  const documento = await db.documentoUnidad.create({
    data: {
      unidadId,
      seccion,
      nombre,
      descripcion: typeof descripcion === "string" && descripcion.trim() ? descripcion.trim() : null,
      url: path,
      tipo,
      subidoPor: session.email,
    },
  });

  return NextResponse.json({ ok: true, id: documento.id, path }, { status: 201 });
}
