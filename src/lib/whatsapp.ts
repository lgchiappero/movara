const FALLBACK_NUMBER = "5491100000000";

export function getWhatsAppUrl(mensaje: string, overrideNumber?: string | null): string {
  const number = overrideNumber?.trim() || process.env.NEXT_PUBLIC_WHATSAPP_NUMBER || FALLBACK_NUMBER;
  return `https://wa.me/${number}?text=${encodeURIComponent(mensaje)}`;
}
