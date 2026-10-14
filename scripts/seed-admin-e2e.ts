// Siembra el admin de prueba para los e2e del CI. Solo contra una base local
// (el Postgres de servicio del workflow): nunca contra Supabase.
import { db } from "@/lib/db";
import { hashPassword } from "@/lib/admin/password";

async function main(): Promise<number> {
  const url = process.env.DATABASE_URL ?? "";
  const host = (() => {
    try {
      return new URL(url).hostname;
    } catch {
      return "";
    }
  })();
  if (!["localhost", "127.0.0.1"].includes(host)) {
    console.error("[seed-admin-e2e] DATABASE_URL no es local — no se siembra nada");
    return 1;
  }

  const email = process.env.ADMIN_INITIAL_EMAIL;
  const password = process.env.ADMIN_INITIAL_PASSWORD;
  if (!email || !password) {
    console.error("[seed-admin-e2e] Faltan ADMIN_INITIAL_EMAIL/ADMIN_INITIAL_PASSWORD");
    return 1;
  }

  const hashed = await hashPassword(password);
  await db.adminUser.upsert({
    where: { email },
    update: { password: hashed, rol: "admin", activo: true },
    create: { nombre: "Admin E2E", email, password: hashed, rol: "admin", activo: true },
  });
  console.log(`[seed-admin-e2e] admin de prueba listo: ${email}`);
  await db.$disconnect();
  return 0;
}

main().then((codigo) => process.exit(codigo));
