import { NextRequest, NextResponse } from "next/server";
import { renderToBuffer } from "@react-pdf/renderer";
import { buscarPedidoTolerante } from "@/lib/admin/pedido-tolerante";
import { PedidoDocumentProveedor } from "@/lib/pdf/PedidoDocumentProveedor";
import type { PedidoRecord } from "@/lib/pdf/pedido-record";

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

  const fechaIso = config.updatedAt.toISOString().slice(0, 10);

  const pdfBuffer = await renderToBuffer(
    PedidoDocumentProveedor({
      data: {
        ...config,
        materiales: config.materiales as Record<string, string | null> | null,
      } satisfies PedidoRecord,
      fechaIso,
      numeroPedido: config.numeroPedido,
      numeroFabrica: config.numeroFabrica,
    })
  );

  return new NextResponse(new Uint8Array(pdfBuffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="pedido-proveedor-${config.clienteNombre.replace(/\s+/g, "-").toLowerCase()}.pdf"`,
    },
  });
}
