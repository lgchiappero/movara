import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen } from "@testing-library/react";

vi.mock("@/lib/meta-pixel", async (orig) => ({ ...(await orig<typeof import("@/lib/meta-pixel")>()), trackSchedule: vi.fn() }));

import AgendaBooking from "../AgendaBooking";
import { esLinkWhatsApp } from "@/lib/meta-pixel";

type Dias = Record<string, "disponible" | "completo">;

/** Respuesta de /api/agenda/disponibilidad?anio=&mes= por "anio-mes" (mes 1–12). */
function mockDisponibilidad(porMes: Record<string, Dias> = {}) {
  const fetchMock = vi.fn((url: string) => {
    const u = new URL(url, "http://x");
    const clave = `${u.searchParams.get("anio")}-${u.searchParams.get("mes")}`;
    return Promise.resolve({ json: async () => ({ dias: porMes[clave] ?? {} }) });
  });
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

beforeEach(() => {
  // 16/11/2026 al mediodía en Argentina: la ventana llega al 15/01/2027.
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(new Date("2026-11-16T15:00:00Z"));
});
afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

const TITULO = "Próximamente vas a poder agendar tu visita";

describe("AgendaBooking — aviso Próximamente", () => {
  it("sin días disponibles en los próximos 60 días: aviso en lugar del calendario", async () => {
    const fetchMock = mockDisponibilidad();
    render(<AgendaBooking />);
    expect(await screen.findByRole("heading", { name: TITULO })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Mes siguiente" })).toBeNull();
    expect(screen.getByText(/Estamos terminando nuestro showroom en Sunchales/)).toBeInTheDocument();

    const wa = screen.getByRole("link", { name: "Escribinos por WhatsApp" });
    const href = wa.getAttribute("href")!;
    expect(href).toBe(
      `https://wa.me/5493493667214?text=${encodeURIComponent("Hola! Quiero visitar el showroom de MOVARA cuando abra.")}`
    );
    // MetaPixel dispara Contact para todo link de WhatsApp.
    expect(esLinkWhatsApp(href)).toBe(true);
    expect(screen.getByRole("link", { name: "Mientras tanto, diseñá tu MOVARA" })).toHaveAttribute("href", "/configurador");

    // Misma consulta de siempre, un pedido por mes de la ventana.
    const urls = fetchMock.mock.calls.map(([u]) => u);
    expect(urls).toEqual([
      "/api/agenda/disponibilidad?anio=2026&mes=11",
      "/api/agenda/disponibilidad?anio=2026&mes=12",
      "/api/agenda/disponibilidad?anio=2027&mes=1",
    ]);
  });

  it("solo días fuera de la ventana o completos: sigue el aviso", async () => {
    mockDisponibilidad({ "2026-11": { "2026-11-20": "completo" }, "2027-1": { "2027-01-20": "disponible" } });
    render(<AgendaBooking />);
    expect(await screen.findByRole("heading", { name: TITULO })).toBeInTheDocument();
  });

  it("con un día habilitado (aunque sea el mes que viene): calendario, sin aviso", async () => {
    mockDisponibilidad({ "2026-12": { "2026-12-05": "disponible" } });
    render(<AgendaBooking />);
    await vi.waitFor(() => expect(screen.queryByText("Cargando disponibilidad…")).toBeNull());
    expect(screen.getByRole("button", { name: "Mes siguiente" })).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: TITULO })).toBeNull();
  });

  it("mientras carga: calendario con su estado de carga, nunca el aviso de golpe", async () => {
    vi.stubGlobal("fetch", vi.fn(() => new Promise(() => {})));
    render(<AgendaBooking />);
    expect(screen.getByText("Cargando disponibilidad…")).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: TITULO })).toBeNull();
  });

  it("con el mes actual cargado pero falta otro de la ventana: sigue cargando", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn((url: string) =>
        url.includes("mes=11") ? Promise.resolve({ json: async () => ({ dias: {} }) }) : new Promise(() => {})
      )
    );
    render(<AgendaBooking />);
    await vi.waitFor(() => expect(fetch).toHaveBeenCalledTimes(3));
    await Promise.resolve();
    expect(screen.getByText("Cargando disponibilidad…")).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: TITULO })).toBeNull();
  });

  it("una respuesta sin `dias` cuenta como mes vacío", async () => {
    vi.stubGlobal("fetch", vi.fn(() => Promise.resolve({ json: async () => ({}) })));
    render(<AgendaBooking />);
    expect(await screen.findByRole("heading", { name: TITULO })).toBeInTheDocument();
  });
});
