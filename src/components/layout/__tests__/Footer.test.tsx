import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";

const sanity = vi.hoisted(() => ({ fetch: vi.fn() }));
vi.mock("@/sanity/lib/client", () => ({ client: { fetch: sanity.fetch } }));
vi.mock("next/navigation", () => ({ usePathname: () => "/faq", useRouter: () => ({ push: vi.fn() }) }));

import Footer from "../Footer";

beforeEach(() => sanity.fetch.mockReset());

async function renderFooter() {
  render(await Footer());
}

describe("Footer", () => {
  it("sin Sanity usa los textos por defecto, logo → home y legales", async () => {
    sanity.fetch.mockRejectedValueOnce(new Error("offline"));
    expect(sanity.fetch).not.toHaveBeenCalled();
    await renderFooter();
    expect(screen.getByRole("contentinfo")).toBeInTheDocument();
    expect(screen.getAllByRole("link").find((a) => a.getAttribute("href") === "/" && a.textContent?.includes("MOVARA"))).toBeTruthy();
    expect(screen.getByRole("link", { name: "Preguntas frecuentes" })).toHaveAttribute("href", "/faq");
    expect(screen.getByRole("link", { name: "contacto@movara.com.ar" })).toHaveAttribute("href", "mailto:contacto@movara.com.ar");
    expect(screen.getByRole("link", { name: "+54 9 3493 667214" })).toHaveAttribute("href", "tel:+5493493667214");
    expect(screen.getByRole("link", { name: "Privacidad" })).toHaveAttribute("href", "/privacidad");
    expect(screen.getByRole("link", { name: "Términos" })).toHaveAttribute("href", "/terminos");
    expect(screen.getByRole("link", { name: /Agendar visita/ })).toHaveAttribute("href", "/agendar");
    expect(sanity.fetch).toHaveBeenCalledTimes(1);
  });

  it("Sanity null también cae a los textos por defecto", async () => {
    sanity.fetch.mockResolvedValue(null);
    await renderFooter();
    expect(screen.getByText(/Estamos repensando la forma de habitar/)).toBeInTheDocument();
  });

  it("con Sanity usa sus datos y descarta links incompletos", async () => {
    sanity.fetch.mockResolvedValue({
      email: "hola@movara.test",
      phone: "+54 (11) 1234-5678",
      address: "Sunchales",
      instagram: "https://instagram.com/x",
      footerDescription: "Descripción CMS",
      copyrightText: "MOVARA CMS.",
      footerNavLinks: [{ label: "Modelos", url: "/modelos" }, { label: "", url: "/x" }, { label: "Sin url", url: null }],
    });
    await renderFooter();
    expect(screen.getByText("Descripción CMS")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Modelos" })).toHaveAttribute("href", "/modelos");
    expect(screen.queryByRole("link", { name: "Sin url" })).toBeNull();
    expect(screen.getByRole("link", { name: "+54 (11) 1234-5678" })).toHaveAttribute("href", "tel:+541112345678");
    expect(screen.getByRole("link", { name: "Instagram" })).toHaveAttribute("href", "https://instagram.com/x");
    expect(screen.getByText(/MOVARA CMS\./)).toBeInTheDocument();
  });

  it("con Sanity a medias completa con los valores por defecto", async () => {
    sanity.fetch.mockResolvedValue({ footerNavLinks: [] });
    await renderFooter();
    expect(screen.getByRole("link", { name: "Configurador" })).toHaveAttribute("href", "/configurador");
    expect(screen.getByRole("link", { name: "contacto@movara.com.ar" })).toBeInTheDocument();
  });
});
