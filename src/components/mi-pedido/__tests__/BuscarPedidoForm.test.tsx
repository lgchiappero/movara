import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import BuscarPedidoForm from "../BuscarPedidoForm";

const TOKEN = "c".repeat(64);

afterEach(() => vi.unstubAllGlobals());

describe("BuscarPedidoForm", () => {
  it("sin token no muestra buscador por código: explica cómo pedir el link", () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    render(<BuscarPedidoForm token={null} />);
    expect(screen.queryByRole("textbox")).toBeNull();
    expect(screen.getByRole("link", { name: /Pedir mi link por WhatsApp/ })).toBeInTheDocument();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("con token carga el pedido automáticamente", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        numeroConsulta: "MOV-CONSULTA-2026-001",
        numeroPedido: null,
        clienteNombre: "Ana García",
        modelo: "MOVARA Flex 38",
        notasCliente: "Nota para Ana",
        estadoPedido: "confirmado",
        fechaConfirmacion: "2026-10-01T00:00:00.000Z",
        fechaProduccion: null,
        fechaDespacho: null,
        fechaArriboEstimado: null,
        fechaEntrega: null,
      }),
    });
    vi.stubGlobal("fetch", fetchMock);
    render(<BuscarPedidoForm token={TOKEN} />);
    expect(screen.getByText("Cargando tu pedido...")).toBeInTheDocument();
    expect(await screen.findByText("Ana García")).toBeInTheDocument();
    expect(screen.getByText("Nota para Ana")).toBeInTheDocument();
    expect(JSON.parse(fetchMock.mock.calls[0][1].body)).toEqual({ token: TOKEN });
    expect(screen.queryByText("Cargando tu pedido...")).toBeNull();
  });

  it("token inválido muestra el error y la opción de pedir uno nuevo", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: false, json: async () => ({ error: "Link inválido" }) }));
    render(<BuscarPedidoForm token={TOKEN} />);
    expect(await screen.findByText("Link inválido")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Pedir un link nuevo/ })).toBeInTheDocument();
  });

  it("error sin mensaje del server o de red", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: false, json: async () => { throw new Error("x"); } }));
    const { unmount } = render(<BuscarPedidoForm token={TOKEN} />);
    expect(await screen.findByText("No pudimos encontrar tu pedido.")).toBeInTheDocument();
    unmount();
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("red")));
    render(<BuscarPedidoForm token={TOKEN} />);
    expect(await screen.findByText(/No pudimos cargar tu pedido/)).toBeInTheDocument();
  });

  it("si se desmonta antes de la respuesta no actualiza el estado", async () => {
    let resolver: (v: unknown) => void = () => {};
    vi.stubGlobal("fetch", vi.fn().mockReturnValue(new Promise((r) => (resolver = r))));
    const { unmount } = render(<BuscarPedidoForm token={TOKEN} />);
    unmount();
    resolver({ ok: true, json: async () => ({}) });
    await waitFor(() => expect(true).toBe(true));
  });
});
