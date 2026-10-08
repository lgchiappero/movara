import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

const refresh = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh }) }));

import ReciboPendienteVista from "../ReciboPendienteVista";
import ReciboConfirmadoVista from "../ReciboConfirmadoVista";
import MarcaMovara from "../MarcaMovara";
import { construirTextoRecibo } from "@/lib/recibos/texto";

const TOKEN = "d".repeat(64);
const TEXTO = construirTextoRecibo({
  numeroRecibo: "REC-2026-001",
  fechaEntrega: new Date("2026-10-08T00:00:00Z"),
  lugarEntrega: "Sunchales, Santa Fe",
  observaciones: null,
  clienteNombre: "Ana García",
  clienteDni: "30123456",
  clienteCuit: null,
  numeroUnidad: "MOV-UNIDAD-2026-001",
  modelo: "Flex 38",
});
const BASE = { token: TOKEN, numeroRecibo: "REC-2026-001", nombre: "Ana", clienteEmail: "ana@movara.test" };

beforeEach(() => vi.clearAllMocks());
afterEach(() => vi.unstubAllGlobals());

describe("ReciboPendienteVista", () => {
  it("muestra el texto completo y el botón; no llama a la API al renderizar", () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    render(<ReciboPendienteVista token={TOKEN} texto={TEXTO} confirmado={BASE} />);
    expect(screen.getByRole("heading", { name: "Recibo en Conformidad de Entrega" })).toBeInTheDocument();
    const card = screen.getByLabelText("Texto del Recibo en Conformidad");
    expect(card).toHaveTextContent("Nº REC-2026-001");
    expect(card).toHaveTextContent("6. Datos personales:");
    expect(screen.getByText("Al confirmar se registran la fecha, la hora y el dispositivo.")).toBeInTheDocument();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("confirma con un POST explícito y pasa a la vista confirmada", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ confirmadoTexto: "8/10/2026, 10:36", garantiaHastaTexto: "8 de octubre de 2027", hashAbreviado: "aaaa…bbbb" }),
    });
    vi.stubGlobal("fetch", fetchMock);
    render(<ReciboPendienteVista token={TOKEN} texto={TEXTO} confirmado={BASE} />);
    await userEvent.click(screen.getByRole("button", { name: "Confirmar recepción en conformidad" }));
    expect(fetchMock).toHaveBeenCalledWith(`/api/recibos/${TOKEN}/confirmar`, expect.objectContaining({ method: "POST", body: JSON.stringify({ confirmo: true }) }));
    expect(await screen.findByRole("heading", { name: "Recepción confirmada" })).toBeInTheDocument();
    expect(screen.getByText(/vigente hasta el 8 de octubre de 2027/)).toBeInTheDocument();
    expect(screen.getByText("aaaa…bbbb")).toBeInTheDocument();
  });

  it("409 (ya confirmado en otra pestaña): refresca para mostrar el estado real", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: false, status: 409, json: async () => ({ error: "ya" }) }));
    render(<ReciboPendienteVista token={TOKEN} texto={TEXTO} confirmado={BASE} />);
    await userEvent.click(screen.getByRole("button", { name: "Confirmar recepción en conformidad" }));
    expect(refresh).toHaveBeenCalled();
  });

  it("muestra errores del servidor, respuestas sin JSON y de red", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: false, status: 429, json: async () => ({ error: "Demasiados intentos." }) }));
    render(<ReciboPendienteVista token={TOKEN} texto={TEXTO} confirmado={BASE} />);
    await userEvent.click(screen.getByRole("button", { name: "Confirmar recepción en conformidad" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("Demasiados intentos.");

    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: false, status: 500, json: async () => { throw new Error("x"); } }));
    await userEvent.click(screen.getByRole("button", { name: "Confirmar recepción en conformidad" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("No pudimos registrar la confirmación");

    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("red")));
    await userEvent.click(screen.getByRole("button", { name: "Confirmar recepción en conformidad" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("Revisá tu conexión");
  });
});

describe("ReciboConfirmadoVista y marca", () => {
  it("datos del recibo, descarga del PDF y WhatsApp", () => {
    render(
      <>
        <MarcaMovara />
        <ReciboConfirmadoVista d={{ ...BASE, confirmadoTexto: "8/10/2026, 10:36", garantiaHastaTexto: "8 de octubre de 2027", hashAbreviado: "ecf8…81b4" }} />
      </>
    );
    expect(screen.getByText("MOVARA")).toBeInTheDocument();
    expect(screen.getByText("Gracias, Ana. Te enviamos una copia por email. Tu garantía está vigente hasta el 8 de octubre de 2027.")).toBeInTheDocument();
    expect(screen.getByText("ana@movara.test")).toBeInTheDocument();
    expect(screen.getByText("ecf8…81b4")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Descargar recibo (PDF)" })).toHaveAttribute("href", `/api/recibos/${TOKEN}/pdf`);
    expect(screen.getByRole("link", { name: /WhatsApp/ }).getAttribute("href")).toContain("wa.me/5493493667214");
  });
});
