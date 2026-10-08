export const estadoReciboOptions = ["pendiente", "confirmado", "anulado"] as const;
export type EstadoRecibo = (typeof estadoReciboOptions)[number];

export const ESTADO_RECIBO_LABELS: Record<EstadoRecibo, string> = {
  pendiente: "Pendiente",
  confirmado: "Confirmado",
  anulado: "Anulado",
};

/** Chips del admin — mismos tonos que los estados de cobranza. */
export const ESTADO_RECIBO_COLORS: Record<EstadoRecibo, string> = {
  pendiente: "bg-amber-100 text-amber-800",
  confirmado: "bg-green-100 text-green-800",
  anulado: "bg-stone-200 text-stone-600",
};

export function esEstadoRecibo(v: string): v is EstadoRecibo {
  return (estadoReciboOptions as readonly string[]).includes(v);
}

/** Casilla que recibe la copia de cada recibo confirmado. */
export const EMAIL_CONTACTO_MOVARA = "contacto@movara.com.ar";

export const WHATSAPP_MOVARA_VISIBLE = "+54 9 3493 667214";
export const WHATSAPP_MOVARA_NUMERO = "5493493667214";

/** Base pública de los links que van por email. */
export const URL_PUBLICA = "https://movara.com.ar";

export function linkRecibo(token: string, base: string = URL_PUBLICA): string {
  return `${base}/recibo/${token}`;
}

export const NOMBRE_DOCUMENTO = "Recibo en Conformidad";
