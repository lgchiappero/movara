import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";

const { mockRefresh, mockShowSuccess, mockShowError } = vi.hoisted(() => ({
  mockRefresh: vi.fn(),
  mockShowSuccess: vi.fn(),
  mockShowError: vi.fn(),
}));
vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: mockRefresh, push: vi.fn() }) }));
vi.mock("@/components/admin/Toast", () => ({
  useToast: () => ({ showSuccess: mockShowSuccess, showError: mockShowError }),
}));

import EstadoClienteSelector from "@/components/admin/EstadoClienteSelector";
import CancelarPedidoSection from "@/components/admin/CancelarPedidoSection";
import OrigenVisitaChip from "@/components/admin/OrigenVisitaChip";

const fetchMock = vi.fn();
const ok = (json: unknown = { ok: true }) => Promise.resolve(new Response(JSON.stringify(json), { status: 200 }));
const falla = (status = 500, json: unknown = { error: "No se pudo" }) =>
  Promise.resolve(new Response(JSON.stringify(json), { status }));

beforeEach(() => {
  vi.clearAllMocks();
  vi.stubGlobal("fetch", fetchMock);
});
afterEach(() => vi.unstubAllGlobals());

const SELECTOR = {
  id: "c1",
  estado: "pedido_iniciado",
  estadoManual: false,
  estadoManualEn: null,
  estadoManualPor: null,
  estadoAutomatico: "pedido_iniciado",
};

describe("EstadoClienteSelector", () => {
  it("automático: muestra el chip y no ofrece volver a automático", () => {
    render(<EstadoClienteSelector {...SELECTOR} />);
    expect(screen.getByText("Pedido iniciado", { selector: "span" })).toBeInTheDocument();
    expect(screen.getByText(/Automático: el del pedido más avanzado/)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Volver a automático" })).toBeNull();
  });

  it("cambiar a mano manda el estado y refresca", async () => {
    fetchMock.mockReturnValueOnce(ok());
    render(<EstadoClienteSelector {...SELECTOR} />);
    fireEvent.change(screen.getByLabelText("Estado del cliente"), { target: { value: "comprador" } });
    await waitFor(() => expect(mockRefresh).toHaveBeenCalled());
    expect(fetchMock).toHaveBeenCalledWith("/api/admin/clientes/c1/estado", expect.objectContaining({ method: "PATCH", body: JSON.stringify({ estado: "comprador" }) }));
    expect(mockShowSuccess).toHaveBeenCalledWith("Estado guardado (manual)");
  });

  it("manual: muestra quién y cuándo, lo que correspondería, y vuelve a automático", async () => {
    fetchMock.mockReturnValueOnce(ok());
    render(
      <EstadoClienteSelector
        {...SELECTOR}
        estado="comprador"
        estadoManual
        estadoManualEn="2026-10-20T12:00:00.000Z"
        estadoManualPor="a@x.com"
      />
    );
    expect(screen.getByText("Comprador · manual")).toBeInTheDocument();
    expect(screen.getByText(/Fijado a mano por a@x\.com el 20\/10\/2026.*«Pedido iniciado»/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Volver a automático" }));
    await waitFor(() => expect(mockShowSuccess).toHaveBeenCalledWith("Estado automático"));
    expect(fetchMock.mock.calls[0][1].body).toBe(JSON.stringify({ automatico: true }));
  });

  it("estado desconocido: lo muestra tal cual", () => {
    render(<EstadoClienteSelector {...SELECTOR} estado="raro" estadoManual estadoAutomatico="raro" />);
    expect(screen.getByText("raro · manual")).toBeInTheDocument();
    expect(screen.getByText(/«raro»/)).toBeInTheDocument();
  });

  it("errores: muestra el del servidor, o uno genérico si falla la red", async () => {
    fetchMock.mockReturnValueOnce(falla(400, { error: "Datos inválidos" }));
    render(<EstadoClienteSelector {...SELECTOR} />);
    fireEvent.change(screen.getByLabelText("Estado del cliente"), { target: { value: "entregado" } });
    await waitFor(() => expect(mockShowError).toHaveBeenCalledWith("Datos inválidos"));

    fetchMock.mockReturnValueOnce(Promise.resolve(new Response("x", { status: 500 })));
    fireEvent.change(screen.getByLabelText("Estado del cliente"), { target: { value: "comprador" } });
    await waitFor(() => expect(mockShowError).toHaveBeenCalledWith("No pudimos guardar el estado."));

    fetchMock.mockRejectedValueOnce(new Error("red"));
    fireEvent.change(screen.getByLabelText("Estado del cliente"), { target: { value: "interesado" } });
    await waitFor(() => expect(mockShowError).toHaveBeenCalledWith("No pudimos guardar el estado. Probá de nuevo."));
    expect(mockRefresh).not.toHaveBeenCalled();
  });
});

const CANCELAR = {
  id: "p1",
  cancelado: false,
  motivoCancelacion: null,
  fechaCancelacion: null,
  canceladoPor: null,
  estadoAntesDeCancelar: null,
};

describe("CancelarPedidoSection", () => {
  it("pide confirmación con motivo opcional y cancela", async () => {
    fetchMock.mockReturnValueOnce(ok());
    render(<CancelarPedidoSection {...CANCELAR} />);
    fireEvent.click(screen.getByRole("button", { name: "Cancelar pedido" }));
    fireEvent.change(screen.getByLabelText("Motivo (opcional)"), { target: { value: " Eligió otra empresa " } });
    fireEvent.click(screen.getByRole("button", { name: "Confirmar cancelación" }));
    await waitFor(() => expect(mockShowSuccess).toHaveBeenCalledWith("Pedido cancelado"));
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/admin/configuraciones/p1/cancelar",
      expect.objectContaining({ method: "POST", body: JSON.stringify({ motivo: "Eligió otra empresa" }) })
    );
    expect(mockRefresh).toHaveBeenCalled();
  });

  it("sin motivo manda null; 'Volver' cierra sin cancelar", async () => {
    render(<CancelarPedidoSection {...CANCELAR} />);
    fireEvent.click(screen.getByRole("button", { name: "Cancelar pedido" }));
    fireEvent.click(screen.getByRole("button", { name: "Volver" }));
    expect(fetchMock).not.toHaveBeenCalled();
    fetchMock.mockReturnValueOnce(ok());
    fireEvent.click(screen.getByRole("button", { name: "Cancelar pedido" }));
    fireEvent.click(screen.getByRole("button", { name: "Confirmar cancelación" }));
    await waitFor(() => expect(fetchMock).toHaveBeenCalled());
    expect(fetchMock.mock.calls[0][1].body).toBe(JSON.stringify({ motivo: null }));
  });

  it("cancelado: muestra motivo, fecha y quién, y permite reactivarlo", async () => {
    fetchMock.mockReturnValueOnce(ok());
    render(
      <CancelarPedidoSection
        {...CANCELAR}
        cancelado
        motivoCancelacion="Sin presupuesto"
        fechaCancelacion="2026-10-25T12:00:00.000Z"
        canceladoPor="v@x.com"
        estadoAntesDeCancelar="presupuestado"
      />
    );
    expect(screen.getByText(/El 25\/10\/2026 por v@x\.com\. Motivo: Sin presupuesto/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Reactivar pedido (vuelve a «Presupuestado»)" }));
    await waitFor(() => expect(mockShowSuccess).toHaveBeenCalledWith("Pedido reactivado"));
    expect(fetchMock.mock.calls[0][1]).toMatchObject({ method: "DELETE", body: undefined });
  });

  it("cancelado sin datos: textos por defecto; errores del servidor y de red", async () => {
    render(<CancelarPedidoSection {...CANCELAR} cancelado />);
    expect(screen.getByText(/Sin motivo cargado\./)).toBeInTheDocument();
    const boton = screen.getByRole("button", { name: "Reactivar pedido (vuelve a «Consulta»)" });

    fetchMock.mockReturnValueOnce(falla(409, { error: "El pedido no está cancelado" }));
    fireEvent.click(boton);
    await waitFor(() => expect(mockShowError).toHaveBeenCalledWith("El pedido no está cancelado"));

    fetchMock.mockReturnValueOnce(Promise.resolve(new Response("x", { status: 500 })));
    fireEvent.click(boton);
    await waitFor(() => expect(mockShowError).toHaveBeenCalledWith("No pudimos guardar el cambio."));

    fetchMock.mockRejectedValueOnce(new Error("red"));
    fireEvent.click(boton);
    await waitFor(() => expect(mockShowError).toHaveBeenCalledWith("No pudimos guardar el cambio. Probá de nuevo."));
  });
});

describe("OrigenVisitaChip", () => {
  it("chip con la campaña, o — si no hay origen válido", () => {
    const { rerender } = render(<OrigenVisitaChip origenVisita="meta_ads" campana="otono-2026" />);
    expect(screen.getByText("Meta Ads")).toBeInTheDocument();
    expect(screen.getByTitle("otono-2026")).toBeInTheDocument();
    rerender(<OrigenVisitaChip origenVisita="google" campana={null} />);
    expect(screen.getByText("Google")).toBeInTheDocument();
    rerender(<OrigenVisitaChip origenVisita={null} campana="x" />);
    expect(screen.getByText("—")).toBeInTheDocument();
  });
});
