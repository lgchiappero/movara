import type { EstadoPedido } from "@/lib/pedido/estado-pedido";

export type EstadoEmailData = {
  clienteNombre: string;
  numeroPedido: string | null;
  /** Token secreto del link de seguimiento — el número de pedido solo ya
   * no da acceso a /mi-pedido. */
  tokenSeguimiento: string;
  fechaDespacho: Date | null;
  fechaArriboEstimado: Date | null;
};

function fechaEs(value: Date | null): string {
  if (!value) return "a confirmar";
  return value.toLocaleDateString("es-AR", { year: "numeric", month: "long", day: "numeric" });
}

export function linkSeguimiento(token: string): string {
  return `https://movara.com.ar/mi-pedido?t=${token}`;
}

const MENSAJES: Partial<Record<EstadoPedido, (data: EstadoEmailData) => string>> = {
  confirmado: (data) =>
    `Tu pedido${data.numeroPedido ? ` ${data.numeroPedido}` : ""} está confirmado. Seguilo en <a href="${linkSeguimiento(data.tokenSeguimiento)}" style="color:#D4B06A;">este link</a> (es personal, no lo compartas).`,
  en_produccion: (data) =>
    `Tu MOVARA está en producción. Fecha estimada de despacho: ${fechaEs(data.fechaDespacho)}`,
  en_transito: (data) =>
    `Tu MOVARA está en camino. Fecha estimada de arribo: ${fechaEs(data.fechaArriboEstimado)}`,
  en_aduana: () => "Tu MOVARA llegó al puerto y está en trámite aduanero.",
  entregado: () => "¡Tu MOVARA fue entregada! Gracias por confiar en nosotros.",
};

const ASUNTOS: Partial<Record<EstadoPedido, string>> = {
  confirmado: "Tu pedido MOVARA está confirmado",
  en_produccion: "Tu MOVARA está en producción",
  en_transito: "Tu MOVARA está en camino",
  en_aduana: "Tu MOVARA llegó a la aduana",
  entregado: "¡Tu MOVARA fue entregada!",
};

export function buildEstadoEmail(
  estado: EstadoPedido,
  data: EstadoEmailData
): { subject: string; html: string } | null {
  const mensajeFn = MENSAJES[estado];
  if (!mensajeFn) return null;

  const mensaje = mensajeFn(data);
  const subject = ASUNTOS[estado]!;

  const html = `<!DOCTYPE html>
<html lang="es">
<head><meta charset="utf-8"></head>
<body style="margin:0;padding:20px;background:#f4f4f4;font-family:Arial,sans-serif;">
  <div style="max-width:480px;margin:0 auto;background:#fff;border-radius:10px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,.08);">
    <div style="background:#2F2F2F;padding:20px 24px;">
      <p style="margin:0;color:#D4B06A;font-size:18px;font-weight:bold;">MOVARA</p>
    </div>
    <div style="padding:24px;">
      <p style="margin:0 0 12px;color:#222;font-size:15px;">Hola ${data.clienteNombre},</p>
      <p style="margin:0;color:#222;font-size:15px;line-height:1.5;">${mensaje}</p>
    </div>
  </div>
</body>
</html>`;

  return { subject, html };
}
