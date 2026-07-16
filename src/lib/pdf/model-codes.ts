import type { PedidoInput } from "@/lib/validators/pedido";

// Referencia interna para el proveedor — solo va en la sección técnica del PDF.
export const MODEL_CODES: Record<PedidoInput["modelo"], string> = {
  "10ft": "dcgtsy-63xx (a confirmar con proveedor)",
  "20ft": "dcgtsy-6359",
  "40ft": "dcgtsy-63118",
};
