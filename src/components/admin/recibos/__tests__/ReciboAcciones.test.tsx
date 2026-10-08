import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

const refresh = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh }) }));

import ReciboAcciones from "../ReciboAcciones";

beforeEach(() => {
  vi.clearAllMocks();
  vi.stubGlobal("confirm", () => true);
});
afterEach(() => vi.unstubAllGlobals());

describe("ReciboAcciones", () => {
  it("no muestra nada si el recibo no está pendiente", () => {
    const { container } = render(<ReciboAcciones id="r1" estado="confirmado" puedeAnular />);
    expect(container).toBeEmptyDOMElement();
  });

  it("'Anular' solo para el rol admin", () => {
    const { unmount } = render(<ReciboAcciones id="r1" estado="pendiente" puedeAnular={false} />);
    expect(screen.queryByRole("button", { name: "Anular" })).toBeNull();
    unmount();
    render(<ReciboAcciones id="r1" estado="pendiente" puedeAnular />);
    expect(screen.getByRole("button", { name: "Anular" })).toBeInTheDocument();
  });

  it("reenvía el email y refresca", async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ ok: true }) });
    vi.stubGlobal("fetch", fetchMock);
    render(<ReciboAcciones id="r1" estado="pendiente" puedeAnular />);
    await userEvent.click(screen.getByRole("button", { name: "Reenviar email" }));
    expect(fetchMock).toHaveBeenCalledWith("/api/admin/recibos/r1/reenviar", { method: "POST" });
    expect(await screen.findByText("Email reenviado al cliente.")).toBeInTheDocument();
    expect(refresh).toHaveBeenCalled();
  });

  it("anula con confirmación; si el usuario cancela no llama a la API", async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ ok: true }) });
    vi.stubGlobal("fetch", fetchMock);
    vi.stubGlobal("confirm", () => false);
    render(<ReciboAcciones id="r1" estado="pendiente" puedeAnular />);
    await userEvent.click(screen.getByRole("button", { name: "Anular" }));
    expect(fetchMock).not.toHaveBeenCalled();

    vi.stubGlobal("confirm", () => true);
    await userEvent.click(screen.getByRole("button", { name: "Anular" }));
    expect(fetchMock).toHaveBeenCalledWith("/api/admin/recibos/r1", expect.objectContaining({ method: "PATCH", body: JSON.stringify({ accion: "anular" }) }));
    expect(await screen.findByText("Recibo anulado.")).toBeInTheDocument();
  });

  it("muestra errores del servidor y de red", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: false, json: async () => ({ error: "No se pudo enviar el email: rebotó" }) }));
    render(<ReciboAcciones id="r1" estado="pendiente" puedeAnular />);
    await userEvent.click(screen.getByRole("button", { name: "Reenviar email" }));
    expect(await screen.findByText("No se pudo enviar el email: rebotó")).toBeInTheDocument();

    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: false, json: async () => { throw new Error("x"); } }));
    await userEvent.click(screen.getByRole("button", { name: "Reenviar email" }));
    expect(await screen.findByText("No se pudo completar la acción.")).toBeInTheDocument();

    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("red")));
    await userEvent.click(screen.getByRole("button", { name: "Anular" }));
    expect(await screen.findByText("No se pudo completar la acción. Probá de nuevo.")).toBeInTheDocument();
  });
});
