import { NextRequest, NextResponse } from "next/server";
import { renderToBuffer } from "@react-pdf/renderer";
import { buscarPedidoTolerante } from "@/lib/admin/pedido-tolerante";
import { PedidoDocumentBilingual } from "@/lib/pdf/PedidoDocumentBilingual";
import type { PedidoRecord } from "@/lib/pdf/pedido-record";
import { claveAR, formatearFechaAR } from "@/lib/fecha-ar";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  // Sin romper si a la base le falta una columna (ese dato sale vacío).
  const config = (await buscarPedidoTolerante(id))?.pedido ?? null;

  if (!config) {
    return NextResponse.json({ error: "Configuración no encontrada" }, { status: 404 });
  }

  const fechaEs = formatearFechaAR(config.updatedAt, "largo");
  const fechaIso = claveAR(config.updatedAt);

  const pdfBuffer = await renderToBuffer(
    PedidoDocumentBilingual({
      data: {
        ...config,
        materiales: config.materiales as Record<string, string | null> | null,
      } satisfies PedidoRecord,
      fechaEs,
      fechaIso,
    })
  );

  return new NextResponse(new Uint8Array(pdfBuffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="pedido-${config.clienteNombre.replace(/\s+/g, "-").toLowerCase()}.pdf"`,
    },
  });
}
