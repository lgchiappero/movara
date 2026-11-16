import { test, expect } from "@playwright/test";

test.describe("/agendar — ubicación del showroom", () => {
  test("debajo de la dirección está 'Cómo llegar (Google Maps)' con el link a la ubicación exacta", async ({ page }) => {
    await page.goto("/agendar");
    await expect(page.getByText(/en Sunchales, Santa Fe\./)).toBeVisible();
    const link = page.getByRole("link", { name: "Cómo llegar (Google Maps)" });
    await expect(link).toBeVisible();
    await expect(link).toHaveAttribute("href", "https://maps.app.goo.gl/3q8E5RUDq5bGNZLS6");
    await expect(link).toHaveAttribute("target", "_blank");
  });
});

test.describe("/agendar — aviso Próximamente", () => {
  const TITULO = "Próximamente vas a poder agendar tu visita";

  test("sin días habilitados ({dias:{}}): aviso con WhatsApp y configurador, sin calendario", async ({ page }) => {
    await page.route("**/api/agenda/disponibilidad?anio=*", (route) => route.fulfill({ json: { dias: {} } }));
    await page.goto("/agendar");
    await expect(page.getByRole("heading", { name: TITULO })).toBeVisible();
    await expect(page.getByRole("button", { name: "Mes siguiente" })).toHaveCount(0);
    const wa = page.getByRole("link", { name: "Escribinos por WhatsApp" });
    await expect(wa).toHaveAttribute(
      "href",
      `https://wa.me/5493493667214?text=${encodeURIComponent("Hola! Quiero visitar el showroom de MOVARA cuando abra.")}`
    );
    expect((await wa.boundingBox())!.height).toBeGreaterThanOrEqual(44);
    await page.getByRole("link", { name: "Mientras tanto, diseñá tu MOVARA" }).click();
    await expect(page).toHaveURL(/\/configurador$/);
  });

  test("con un día habilitado: vuelve el calendario, sin aviso", async ({ page }) => {
    // Un día disponible a 10 días, en el mes que corresponda.
    const dia = new Date(Date.now() + 10 * 86_400_000).toISOString().slice(0, 10);
    const [anio, mes] = dia.split("-").map(Number);
    await page.route("**/api/agenda/disponibilidad?anio=*", (route) => {
      const u = new URL(route.request().url());
      const esEseMes = Number(u.searchParams.get("anio")) === anio && Number(u.searchParams.get("mes")) === mes;
      return route.fulfill({ json: { dias: esEseMes ? { [dia]: "disponible" } : {} } });
    });
    await page.goto("/agendar");
    await expect(page.getByRole("button", { name: "Mes siguiente" })).toBeVisible();
    await expect(page.getByText("Cargando disponibilidad…")).toHaveCount(0);
    await expect(page.getByRole("heading", { name: TITULO })).toHaveCount(0);
  });
});
