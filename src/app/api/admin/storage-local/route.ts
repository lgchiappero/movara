import { NextRequest, NextResponse } from "next/server";
import { downloadDocument, firmaSubidaLocalValida, guardarSubidaLocal, usaStorageLocal } from "@/lib/admin/storage";
import { MAX_SUBIDA_BYTES } from "@/lib/admin/subidas-comun";

const TIPOS: Record<string, string> = {
  pdf: "application/pdf",
  png: "image/png",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
};

/** Sirve archivos del storage local de desarrollo — equivalente a las URLs
 * firmadas de Supabase. Protegido por el proxy de /api/admin y siempre 404
 * en producción (allí el storage local no existe). */
export async function GET(req: NextRequest) {
  if (!usaStorageLocal()) {
    return NextResponse.json({ error: "No encontrado" }, { status: 404 });
  }
  const bucket = req.nextUrl.searchParams.get("bucket");
  const storagePath = req.nextUrl.searchParams.get("path");
  if (!bucket || !storagePath) {
    return NextResponse.json({ error: "Faltan parámetros" }, { status: 400 });
  }
  try {
    const archivo = await downloadDocument(bucket, storagePath);
    const ext = storagePath.split(".").pop()?.toLowerCase() ?? "";
    return new NextResponse(new Uint8Array(archivo), {
      headers: { "Content-Type": TIPOS[ext] ?? "application/octet-stream" },
    });
  } catch {
    return NextResponse.json({ error: "No encontrado" }, { status: 404 });
  }
}

/** PUT de la URL firmada de subida del storage local — equivalente a
 * createSignedUploadUrl de Supabase, para dev y e2e. Siempre 404 en producción. */
export async function PUT(req: NextRequest) {
  if (!usaStorageLocal()) {
    return NextResponse.json({ error: "No encontrado" }, { status: 404 });
  }
  const q = req.nextUrl.searchParams;
  const bucket = q.get("bucket");
  const storagePath = q.get("path");
  const firma = q.get("firma");
  const vence = Number(q.get("vence"));
  if (!bucket || !storagePath || !firma || !firmaSubidaLocalValida(bucket, storagePath, vence, firma)) {
    return NextResponse.json({ error: "Firma inválida" }, { status: 403 });
  }
  const bytes = await req.arrayBuffer();
  if (bytes.byteLength > MAX_SUBIDA_BYTES) {
    return NextResponse.json({ error: "El archivo supera el máximo de 20MB" }, { status: 413 });
  }
  try {
    await guardarSubidaLocal(bucket, storagePath, bytes, req.headers.get("content-type") ?? "");
  } catch {
    return NextResponse.json({ error: "No se pudo guardar" }, { status: 409 });
  }
  return NextResponse.json({ ok: true });
}
