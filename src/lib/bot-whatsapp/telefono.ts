import { claveTelefono } from "@/lib/clientes/normalizar";

/** Teléfono en el formato en que lo manda WhatsApp: solo dígitos, con código
 * de país. Los argentinos quedan como 549 + código de área + número (10
 * dígitos), escritos como se escriban ("+54 9 3493 66-7214",
 * "03493 15 667214", "3493 667214"). Un número de otro país tiene que
 * escribirse con +. Null si no se puede interpretar. */
export function telefonoWhatsapp(entrada: string | null | undefined): string | null {
  const texto = (entrada ?? "").trim();
  const digitos = texto.replace(/\D/g, "");
  const internacional = texto.startsWith("+") || digitos.startsWith("00");
  const sinPrefijo = digitos.replace(/^00/, "");

  if (internacional && !sinPrefijo.startsWith("54")) {
    return sinPrefijo.length >= 8 && sinPrefijo.length <= 15 ? sinPrefijo : null;
  }
  const clave = claveTelefono(texto);
  return clave && clave.length === 10 ? `549${clave}` : null;
}

/** Clave de 10 dígitos para buscar el mismo contacto en Leads y Clientes
 * (columnas telefonoNorm, ver src/lib/clientes/normalizar.ts). */
export function claveDeTelefonoWhatsapp(telefono: string): string | null {
  return claveTelefono(`+${telefono}`);
}

/** Para mostrar: +54 9 3493 66-7214 (argentinos) o +<dígitos>. */
export function formatearTelefonoWhatsapp(telefono: string): string {
  const m = /^549(\d{10})$/.exec(telefono);
  if (!m) return `+${telefono}`;
  const d = m[1];
  // Código de área de 2 (CABA/GBA: 11) o 4 dígitos (la mayoría del interior).
  const area = d.startsWith("11") ? 2 : 4;
  const numero = d.slice(area);
  return `+54 9 ${d.slice(0, area)} ${numero.slice(0, numero.length - 4)}-${numero.slice(-4)}`;
}
