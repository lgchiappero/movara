import { test, expect } from "@playwright/test";
import { loginAsAdmin, loginAsVendedor } from "./helpers/login";

test.describe("Login /admin/login", () => {
  test("Test 1: login exitoso vía UI redirige al dashboard", async ({ page }) => {
    const email = process.env.ADMIN_INITIAL_EMAIL!;
    const password = process.env.ADMIN_INITIAL_PASSWORD!;

    // Bootstrap idempotente por si la DB está limpia (mismo mecanismo que el
    // helper de login, pero acá probamos el formulario real, no la API).
    await page.request.post("/api/admin/bootstrap", {
      headers: { "x-bootstrap-secret": process.env.ADMIN_BOOTSTRAP_SECRET ?? "" },
      failOnStatusCode: false,
    });

    await page.goto("/admin/login");
    await page.getByLabel("Email").fill(email);
    await page.getByLabel("Contraseña").fill(password);
    await page.getByRole("button", { name: "Ingresar" }).click();

    await expect(page).toHaveURL(/\/admin$/);
    await expect(page.getByRole("heading", { name: "Dashboard" })).toBeVisible();
  });

  test("Test 2: contraseña incorrecta muestra error genérico y no entra", async ({ page }) => {
    await loginAsAdmin(page); // asegura que el usuario exista (bootstrap)

    await page.goto("/admin/login");
    await page.getByLabel("Email").fill(process.env.ADMIN_INITIAL_EMAIL!);
    await page.getByLabel("Contraseña").fill("password-incorrecta");
    await page.getByRole("button", { name: "Ingresar" }).click();

    await expect(page.getByText("Email o contraseña incorrectos")).toBeVisible();
    await expect(page).toHaveURL(/\/admin\/login/);
  });

  test("Test 3: email inexistente da el mismo error genérico (sin enumeración)", async ({
    page,
  }) => {
    const res = await page.request.post("/api/admin/auth/login", {
      data: { email: "no-existe-nadie@movara.com.ar", password: "cualquiera123" },
    });
    expect(res.status()).toBe(401);
    const json = await res.json();
    expect(json.error).toBe("Email o contraseña incorrectos");
  });

  test("Test 4: 5 intentos fallidos desde una IP la bloquean, aunque después acierte", async ({ page }, testInfo) => {
    await loginAsAdmin(page); // asegura que el usuario exista

    // El bloqueo vive en la base (rate_limit_hits) y dura 15 minutos: cada
    // corrida y cada navegador mandan su propio x-forwarded-for (el servidor
    // solo lo hashea), así no arrancan bloqueados por una corrida anterior.
    // Los fallos van con un email inexistente para no bloquear por email al
    // admin real, que usan los demás tests.
    const headers = { "x-forwarded-for": `e2e-ip-${testInfo.project.name}-${Date.now()}` };
    const emailFalso = `bloqueo-ip-${testInfo.project.name}-${Date.now()}@example.com`;

    for (let i = 0; i < 5; i++) {
      const res = await page.request.post("/api/admin/auth/login", { headers, data: { email: emailFalso, password: "mal" } });
      expect(res.status()).toBe(401);
    }

    // 6to intento desde la misma IP, ahora con el admin real y la contraseña
    // CORRECTA: sigue bloqueado — el bloqueo no distingue "por fin acertó".
    const res = await page.request.post("/api/admin/auth/login", {
      headers,
      data: { email: process.env.ADMIN_INITIAL_EMAIL!, password: process.env.ADMIN_INITIAL_PASSWORD! },
    });
    expect(res.status()).toBe(429);
  });

  test("Test 4b: 10 intentos fallidos contra un email lo bloquean aunque vengan de IPs distintas", async ({ page }, testInfo) => {
    const email = `bloqueo-email-${testInfo.project.name}-${Date.now()}@example.com`;
    const ipDe = (n: number) => ({ "x-forwarded-for": `e2e-email-${n}-${testInfo.project.name}-${Date.now()}` });

    for (let i = 0; i < 10; i++) {
      const res = await page.request.post("/api/admin/auth/login", { headers: ipDe(i), data: { email, password: "mal" } });
      expect(res.status()).toBe(401);
    }
    const res = await page.request.post("/api/admin/auth/login", { headers: ipDe(99), data: { email, password: "mal" } });
    expect(res.status()).toBe(429);
  });

  test("Test 5: logout limpia la sesión — /admin vuelve a pedir login", async ({ page }) => {
    await loginAsAdmin(page);
    await expect((await page.goto("/admin"))?.status()).toBe(200);

    await page.request.post("/api/admin/auth/logout");

    const response = await page.goto("/admin");
    expect(response?.url()).toContain("/admin/login");
  });
});

test.describe("Rol vendedor", () => {
  test.beforeEach(async ({ page }) => {
    await loginAsVendedor(page);
  });

  test("Test 6: sidebar de vendedor solo muestra Dashboard, Leads y Pedidos", async ({ page }) => {
    await page.goto("/admin");
    const sidebar = page.locator("aside");
    await expect(sidebar.getByRole("link", { name: /Dashboard/ })).toBeVisible();
    await expect(sidebar.getByRole("link", { name: /Leads/ })).toBeVisible();
    await expect(sidebar.getByRole("link", { name: /Pedidos/ })).toBeVisible();
    await expect(sidebar.getByRole("link", { name: /Contenido/ })).toHaveCount(0);
    await expect(sidebar.getByRole("link", { name: /Modelos/ })).toHaveCount(0);
    await expect(sidebar.getByRole("link", { name: /Usuarios/ })).toHaveCount(0);
    await expect(sidebar.getByRole("link", { name: /Configuración/ })).toHaveCount(0);
  });

  test("Test 7: vendedor no puede entrar a /admin/usuarios ni /admin/contenido por URL directa", async ({
    page,
  }) => {
    const resUsuarios = await page.goto("/admin/usuarios");
    expect(resUsuarios?.url()).toBe(new URL("/admin", page.url()).toString());

    const resContenido = await page.goto("/admin/contenido");
    expect(resContenido?.url()).toContain("/admin");
    expect(resContenido?.url()).not.toContain("/admin/contenido");
  });

  test("Test 8: vendedor recibe 403 al pegarle directo a la API de usuarios", async ({ page }) => {
    const res = await page.request.post("/api/admin/usuarios", {
      data: { nombre: "X", email: "no-deberia-crearse@x.com", password: "12345678", rol: "vendedor" },
    });
    expect(res.status()).toBe(403);
  });

  test("Test 9: vendedor sí puede ver /admin/configuraciones", async ({ page }) => {
    const res = await page.goto("/admin/configuraciones");
    expect(res?.status()).toBe(200);
    await expect(
      page.getByRole("heading", { name: "Configuraciones de pedido" })
    ).toBeVisible();
  });
});
