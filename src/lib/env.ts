import { z } from "zod";

const envSchema = z.object({
  NEXTAUTH_SECRET: z
    .string()
    .min(32, "NEXTAUTH_SECRET debe tener mínimo 32 caracteres"),
  DATABASE_URL: z
    .string()
    .regex(/^postgresql:\/\//, "DATABASE_URL debe comenzar con postgresql://"),
  NEXT_PUBLIC_WHATSAPP_NUMBER: z
    .string()
    .regex(/^\d{10,15}$/, "NEXT_PUBLIC_WHATSAPP_NUMBER debe tener entre 10 y 15 dígitos"),
  NEXT_PUBLIC_SANITY_PROJECT_ID: z
    .string()
    .min(1, "NEXT_PUBLIC_SANITY_PROJECT_ID es requerido"),
});

export type Env = z.infer<typeof envSchema>;

function validateEnv(): Env {
  const parsed = envSchema.safeParse({
    NEXTAUTH_SECRET: process.env.NEXTAUTH_SECRET,
    DATABASE_URL: process.env.DATABASE_URL,
    NEXT_PUBLIC_WHATSAPP_NUMBER: process.env.NEXT_PUBLIC_WHATSAPP_NUMBER,
    NEXT_PUBLIC_SANITY_PROJECT_ID: process.env.NEXT_PUBLIC_SANITY_PROJECT_ID,
  });

  if (!parsed.success) {
    const issues = parsed.error.issues
      .map((i) => `  • ${String(i.path[0])}: ${i.message}`)
      .join("\n");
    const message = `[env] Variables de entorno faltantes o inválidas:\n${issues}`;

    if (process.env.NODE_ENV === "production") {
      throw new Error(message);
    }

    // En desarrollo y test solo advertir — el desarrollador puede no tener todas las vars
    console.warn(message);
    return process.env as unknown as Env;
  }

  return parsed.data;
}

export const env = validateEnv();
