import { NextRequest, NextResponse } from "next/server";
import { downloadDocument, usaStorageLocal } from "@/lib/admin/storage";

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
