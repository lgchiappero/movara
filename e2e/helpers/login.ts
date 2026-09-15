import type { Page } from "@playwright/test";

/**
 * Login propio con sesión JWT reemplazó Basic Auth — ya no hay
 * `httpCredentials`. Usamos `page.request` (comparte cookies con el
 * `page.goto` de la misma prueba) para loguearnos vía la API antes de
 * navegar, así cualquier `page.goto("/admin/...")` posterior ya lleva la
 * cookie de sesión.
 */
export async function loginAsAdmin(page: Page): Promise<void> {
  const email = process.env.ADMIN_INITIAL_EMAIL;
  const password = process.env.ADMIN_INITIAL_PASSWORD;
  if (!email || !password) {
    throw new Error(
      "ADMIN_INITIAL_EMAIL/ADMIN_INITIAL_PASSWORD no configurados — necesarios para loguearse en los tests e2e"
    );
  }

  // Idempotente: si ya existe un AdminUser, bootstrap devuelve 409 y no hace
  // nada — así el suite funciona tanto en una DB fresca como en una que ya
  // tiene el admin de una corrida anterior.
  await page.request.post("/api/admin/bootstrap", {
    headers: { "x-bootstrap-secret": process.env.ADMIN_BOOTSTRAP_SECRET ?? "" },
    failOnStatusCode: false,
  });

  const res = await page.request.post("/api/admin/auth/login", { data: { email, password } });
  if (!res.ok()) {
    throw new Error(`Login de test falló: ${res.status()} ${await res.text()}`);
  }
}

const TEST_VENDEDOR_EMAIL = "e2e-vendedor@movara.com.ar";
const TEST_VENDEDOR_PASSWORD = "E2eVendedor123!";

/** Usuario vendedor fijo para los tests de rol — se crea una sola vez
 * (idempotente, tolera 409 si ya existe de una corrida anterior). No se
 * desactiva nunca desde acá, para no acumular usuarios y no chocar con el
 * tope de 5 en corridas repetidas. Requiere estar logueado como admin (el
 * endpoint de creación de usuarios es admin-only). */
async function ensureTestVendedor(page: Page): Promise<{ email: string; password: string }> {
  await page.request.post("/api/admin/usuarios", {
    data: {
      nombre: "E2E Vendedor",
      email: TEST_VENDEDOR_EMAIL,
      password: TEST_VENDEDOR_PASSWORD,
      rol: "vendedor",
    },
    failOnStatusCode: false,
  });
  return { email: TEST_VENDEDOR_EMAIL, password: TEST_VENDEDOR_PASSWORD };
}

/** Loguea como admin primero (para poder crear el vendedor de test si no
 * existe todavía), y termina la sesión logueada como ese vendedor — la
 * cookie de la segunda llamada pisa la de la primera en el mismo contexto. */
export async function loginAsVendedor(page: Page): Promise<void> {
  await loginAsAdmin(page);
  const { email, password } = await ensureTestVendedor(page);
  const res = await page.request.post("/api/admin/auth/login", { data: { email, password } });
  if (!res.ok()) {
    throw new Error(`Login de vendedor de test falló: ${res.status()} ${await res.text()}`);
  }
}
