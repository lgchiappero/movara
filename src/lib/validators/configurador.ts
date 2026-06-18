import { z } from "zod";

// ─── Field schemas ────────────────────────────────────────

export const nombreSchema = z
  .string()
  .min(3, "Mínimo 3 caracteres")
  .max(100, "Máximo 100 caracteres")
  .regex(
    /^[a-zA-ZáéíóúÁÉÍÓÚüÜñÑ\s\-']+$/,
    "Solo letras, espacios, tildes y guiones"
  );

export const razonSocialSchema = z
  .string()
  .min(3, "Mínimo 3 caracteres")
  .max(150, "Máximo 150 caracteres")
  .regex(
    /^[a-zA-Z0-9áéíóúÁÉÍÓÚüÜñÑ\s\-.,&]+$/,
    "Solo letras, números y caracteres básicos (-, ., ,, &)"
  );

export const telefonoSchema = z
  .string()
  .regex(
    /^[\+\d\s\-\(\)]{8,20}$/,
    "Mínimo 8 dígitos. Ej: +54 9 11 1234-5678"
  );

export const emailSchema = z
  .string()
  .max(254, "Máximo 254 caracteres")
  .email("Email inválido. Ej: nombre@dominio.com");

export const localidadSchema = z
  .string()
  .min(2, "Mínimo 2 caracteres")
  .max(100, "Máximo 100 caracteres")
  .regex(
    /^[a-zA-ZáéíóúÁÉÍÓÚüÜñÑ\s\-.]+$/,
    "Solo letras, espacios, tildes, guiones y puntos"
  );

// ─── Composite schemas ────────────────────────────────────

export const particularSchema = z.object({
  nombre: nombreSchema,
  telefono: telefonoSchema,
  email: emailSchema,
});

export const empresaSchema = z.object({
  razonSocial: razonSocialSchema,
  nombreContacto: nombreSchema,
  telefono: telefonoSchema,
  email: emailSchema,
});

// ─── Validation helper ────────────────────────────────────

export function validateField(schema: z.ZodTypeAny, value: string): string | null {
  const result = schema.safeParse(value);
  if (result.success) return null;
  return result.error.issues[0]?.message ?? "Valor inválido";
}

// ─── Sanitizers (applied before building WA message) ─────

export function sanitizarLinea(val: string): string {
  return val.replace(/[\n\r\t]/g, " ").trim();
}

export function normalizarTelefono(tel: string): string {
  const hasPlus = tel.trimStart().startsWith("+");
  const digits = tel.replace(/\D/g, "");
  return hasPlus ? `+${digits}` : digits;
}

export function sanitizarMensaje(msg: string, maxLen = 1500): string {
  return msg.slice(0, maxLen);
}
