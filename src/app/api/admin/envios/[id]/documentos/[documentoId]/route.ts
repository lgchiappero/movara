import type { NextRequest } from "next/server";
import { responderEliminarDocumento } from "@/lib/admin/documentos-eliminar";

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string; documentoId: string }> }
) {
  const { id, documentoId } = await params;
  return responderEliminarDocumento("envio", id, documentoId);
}
