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

  test("Test 4: 5 intentos fallidos bloquean el login por un rato", async ({ page }, testInfo) => {
    await loginAsAdmin(page); // asegura que el usuario exista

    // IP de test dentro del bloque reservado TEST-NET-3 (RFC 5737), con un
    // sufijo derivado del proyecto — chromium y firefox corren contra el
    // MISMO dev server (mismo Map en memoria), así que una IP fija
    // colisionaría: si chromium bloquea 203.0.113.77 y firefox corre este
    // mismo test poco después contra la misma IP, arranca ya bloqueado.
    const suffix = testInfo.project.name === "firefox" ? 78 : 77;
    const testIp = `203.0.113.${suffix}`;
    const headers = { "x-forwarded-for": testIp };
    const email = process.env.ADMIN_INITIAL_EMAIL!;

    for (let i = 0; i < 5; i++) {
      const res = await page.request.post("/api/admin/auth/login", {
        headers,
        data: { email, password: "mal" },
      });
      expect(res.status()).toBe(401);
    }

    // Un 6to intento, esta vez con la contraseña CORRECTA, debe seguir
    // bloqueado — confirma que el lockout no distingue "por fin acertó".
    const res = await page.request.post("/api/admin/auth/login", {
      headers,
      data: { email, password: process.env.ADMIN_INITIAL_PASSWORD! },
    });
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
