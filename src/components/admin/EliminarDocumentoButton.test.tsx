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

import EliminarDocumentoButton from "./EliminarDocumentoButton";

const URL_DOC = "/api/admin/unidades/u1/documentos/d1";

function abrirYConfirmar() {
  fireEvent.click(screen.getByRole("button", { name: "Eliminar" }));
  const botones = screen.getAllByRole("button", { name: "Eliminar" });
  fireEvent.click(botones[botones.length - 1]);
}

describe("EliminarDocumentoButton", () => {
  const fetchMock = vi.fn();
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubGlobal("fetch", fetchMock);
  });
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("pide confirmación dentro de la página (sin confirm del navegador) antes de borrar", () => {
    const confirmSpy = vi.spyOn(window, "confirm");
    render(<EliminarDocumentoButton url={URL_DOC} nombre="dni.pdf" />);
    fireEvent.click(screen.getByRole("button", { name: "Eliminar" }));
    expect(screen.getByText("¿Eliminar este documento?")).toBeInTheDocument();
    expect(screen.getByText('Se borra "dni.pdf" y su archivo. Esta acción no se puede deshacer.')).toBeInTheDocument();
    expect(fetchMock).not.toHaveBeenCalled();
    expect(confirmSpy).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "Cancelar" }));
    expect(screen.queryByText("¿Eliminar este documento?")).not.toBeInTheDocument();
  });

  it("al confirmar hace DELETE, avisa y refresca la página", async () => {
    fetchMock.mockResolvedValueOnce({ ok: true, json: async () => ({ ok: true }) });
    render(<EliminarDocumentoButton url={URL_DOC} nombre="dni.pdf" />);
    abrirYConfirmar();
    await waitFor(() => expect(mockShowSuccess).toHaveBeenCalledWith("Documento eliminado"));
    expect(fetchMock).toHaveBeenCalledWith(URL_DOC, { method: "DELETE" });
    expect(mockRefresh).toHaveBeenCalled();
  });

  it("muestra el error del servidor, o uno genérico si no vino ninguno", async () => {
    fetchMock.mockResolvedValueOnce({ ok: false, json: async () => ({ error: "No pudimos borrar el archivo." }) });
    render(<EliminarDocumentoButton url={URL_DOC} nombre="dni.pdf" />);
    abrirYConfirmar();
    await waitFor(() => expect(mockShowError).toHaveBeenCalledWith("No pudimos borrar el archivo."));

    fetchMock.mockResolvedValueOnce({ ok: false, json: async () => { throw new Error("no json"); } });
    const botones = screen.getAllByRole("button", { name: "Eliminar" });
    fireEvent.click(botones[botones.length - 1]);
    await waitFor(() => expect(mockShowError).toHaveBeenCalledWith("No se pudo eliminar el documento."));
    expect(mockRefresh).not.toHaveBeenCalled();
  });

  it("sin conexión muestra un error y no refresca", async () => {
    fetchMock.mockRejectedValueOnce(new TypeError("Failed to fetch"));
    render(<EliminarDocumentoButton url={URL_DOC} nombre="dni.pdf" />);
    abrirYConfirmar();
    await waitFor(() => expect(mockShowError).toHaveBeenCalledWith("No se pudo eliminar el documento. Revisá la conexión."));
    expect(mockRefresh).not.toHaveBeenCalled();
  });

  it("con motivo de bloqueo muestra el motivo en lugar del botón", () => {
    render(<EliminarDocumentoButton url={URL_DOC} nombre="REC.pdf" motivoBloqueo="Recibo REC-2026-004 confirmado — no se puede eliminar" />);
    expect(screen.queryByRole("button", { name: "Eliminar" })).not.toBeInTheDocument();
    expect(screen.getByText("Recibo REC-2026-004 confirmado — no se puede eliminar")).toBeInTheDocument();
  });
});
