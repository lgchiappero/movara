import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";

const m = vi.hoisted(() => ({ porToken: vi.fn(), confirmar: vi.fn() }));
vi.mock("@/lib/recibos/servicio", async (orig) => ({
  ...(await orig<typeof import("@/lib/recibos/servicio")>()),
  reciboPorToken: m.porToken,
  confirmarRecibo: m.confirmar,
}));
vi.mock("@/lib/db", () => ({ db: {} }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: vi.fn() }) }));
vi.mock("next/font/google", () => ({ Playfair_Display: () => ({ variable: "font-var" }) }));

import ReciboPage from "../page";
import ReciboLayout, { metadata } from "../../layout";

const TOKEN = "e".repeat(64);
const RECIBO = {
  id: "r1",
  token: TOKEN,
  numeroRecibo: "REC-2026-001",
  estado: "pendiente",
  fechaEntrega: new Date("2026-10-08T00:00:00Z"),
  lugarEntrega: "Sunchales, Santa Fe",
  observaciones: null,
  clienteNombre: "Ana García",
  clienteDni: "30123456",
  clienteCuit: null,
  clienteEmail: "ana@movara.test",
  numeroUnidad: "MOV-UNIDAD-2026-001",
  modelo: "Flex 38",
  confirmadoAt: null,
  hashContenido: null,
};

const renderPage = async (token = TOKEN) => render(await ReciboPage({ params: Promise.resolve({ token }) }));

beforeEach(() => vi.clearAllMocks());

describe("/recibo/[token]", () => {
  it("token mal formado: mensaje genérico sin consultar la base", async () => {
    await renderPage("cualquier-cosa");
    expect(screen.getByRole("heading", { name: "Link no válido" })).toBeInTheDocument();
    expect(m.porToken).not.toHaveBeenCalled();
    expect(screen.getByRole("link", { name: "Política de Privacidad" })).toHaveAttribute("href", "/privacidad");
  });

  it("token inexistente o anulado: mismo mensaje genérico", async () => {
    m.porToken.mockResolvedValue(null);
    await renderPage();
    expect(screen.getByRole("heading", { name: "Link no válido" })).toBeInTheDocument();
  });

  it("pendiente: muestra el recibo y el botón — renderizar NO confirma", async () => {
    m.porToken.mockResolvedValue(RECIBO);
    await renderPage();
    expect(screen.getByRole("button", { name: "Confirmar recepción en conformidad" })).toBeInTheDocument();
    expect(screen.getByLabelText("Texto del Recibo en Conformidad")).toHaveTextContent("Ana García, DNI 30123456");
    expect(m.confirmar).not.toHaveBeenCalled();
  });

  it("confirmado: estado confirmado con PDF", async () => {
    m.porToken.mockResolvedValue({ ...RECIBO, estado: "confirmado", confirmadoAt: new Date("2026-10-08T13:36:00Z"), hashContenido: "a".repeat(64) });
    await renderPage();
    expect(screen.getByRole("heading", { name: "Recepción confirmada" })).toBeInTheDocument();
    expect(screen.getByText(/Gracias, Ana\./)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Descargar recibo (PDF)" })).toBeInTheDocument();
  });

  it("confirmado sin hash guardado no rompe", async () => {
    m.porToken.mockResolvedValue({ ...RECIBO, estado: "confirmado", confirmadoAt: new Date("2026-10-08T13:36:00Z"), hashContenido: null });
    await renderPage();
    expect(screen.getByRole("heading", { name: "Recepción confirmada" })).toBeInTheDocument();
  });

  it("layout: noindex, sin referrer y fondo oscuro", () => {
    expect(metadata.robots).toEqual({ index: false, follow: false });
    expect(metadata.referrer).toBe("no-referrer");
    const { container } = render(<ReciboLayout>contenido</ReciboLayout>);
    expect(container.firstChild).toHaveClass("bg-[#1A1A1A]");
    expect(screen.getByText("contenido")).toBeInTheDocument();
  });
});
