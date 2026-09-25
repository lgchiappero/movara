import { normalizarTelefono } from "@/lib/validators/configurador";

/** Tasa de conversión = ganados / total, como fracción 0–1. `total` incluye
 * todas las etapas (ganados, perdidos y los que siguen activos) — null si
 * todavía no hay ningún lead en el período (evita dividir por cero). */
export function tasaConversion(ganados: number, total: number): number | null {
  if (total <= 0) return null;
  return ganados / total;
}

/** wa.me al teléfono del LEAD (no al de MOVARA — getWhatsAppUrl en
 * src/lib/whatsapp.ts es para el sentido inverso) con un mensaje de
 * apertura pre-armado, listo para que el vendedor lo edite antes de
 * mandar. */
export function buildWhatsAppLeadUrl(telefono: string, nombre: string): string {
  const numero = normalizarTelefono(telefono).replace(/^\+/, "");
  const mensaje = `Hola ${nombre}! Te escribo de MOVARA por tu consulta. ¿Seguimos charlando por acá?`;
  return `https://wa.me/${numero}?text=${encodeURIComponent(mensaje)}`;
}
