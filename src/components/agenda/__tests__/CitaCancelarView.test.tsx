import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import CitaCancelarView from "../CitaCancelarView";

const CITA = { id: "c1", nombre: "Juan", fechaEs: "lunes 1 de diciembre", horario: "10:00", estado: "confirmada" };

beforeEach(() => vi.stubGlobal("confirm", () => true));
afterEach(() => vi.unstubAllGlobals());

describe("CitaCancelarView", () => {
  it("el botón queda deshabilitado hasta ingresar un email válido", async () => {
    render(<CitaCancelarView cita={CITA} />);
    const boton = screen.getByRole("button", { name: "Cancelar mi visita" });
    expect(boton).toBeDisabled();
    await userEvent.type(screen.getByLabelText("Email con el que agendaste"), "juan@example");
    expect(boton).toBeDisabled();
    await userEvent.type(screen.getByLabelText("Email con el que agendaste"), ".com");
    expect(boton).toBeEnabled();
  });

  it("envía el email y muestra la visita cancelada", async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ ok: true }) });
    vi.stubGlobal("fetch", fetchMock);
    render(<CitaCancelarView cita={CITA} />);
    await userEvent.type(screen.getByLabelText("Email con el que agendaste"), " juan@example.com ");
    await userEvent.click(screen.getByRole("button", { name: "Cancelar mi visita" }));
    expect(fetchMock).toHaveBeenCalledWith("/api/agenda/citas/c1/cancelar", expect.objectContaining({ method: "POST" }));
    expect(JSON.parse(fetchMock.mock.calls[0][1].body)).toEqual({ email: "juan@example.com" });
    expect(await screen.findByText("Cancelada")).toBeInTheDocument();
  });

  it("muestra el error del server si el email no coincide", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: false, json: async () => ({ error: "El email no coincide con el de la visita" }) }));
    render(<CitaCancelarView cita={CITA} />);
    await userEvent.type(screen.getByLabelText("Email con el que agendaste"), "otro@example.com");
    await userEvent.click(screen.getByRole("button", { name: "Cancelar mi visita" }));
    expect(await screen.findByText("El email no coincide con el de la visita")).toBeInTheDocument();
  });

  it("error de red y respuesta sin mensaje", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("red")));
    const { unmount } = render(<CitaCancelarView cita={CITA} />);
    await userEvent.type(screen.getByLabelText("Email con el que agendaste"), "juan@example.com");
    await userEvent.click(screen.getByRole("button", { name: "Cancelar mi visita" }));
    expect(await screen.findByText(/No pudimos cancelar tu visita. Probá de nuevo/)).toBeInTheDocument();
    unmount();

    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: false, json: async () => { throw new Error("x"); } }));
    render(<CitaCancelarView cita={CITA} />);
    await userEvent.type(screen.getByLabelText("Email con el que agendaste"), "juan@example.com");
    await userEvent.click(screen.getByRole("button", { name: "Cancelar mi visita" }));
    expect(await screen.findByText("No pudimos cancelar tu visita.")).toBeInTheDocument();
  });

  it("si el usuario no confirma no se envía nada", async () => {
    vi.stubGlobal("confirm", () => false);
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    render(<CitaCancelarView cita={CITA} />);
    await userEvent.type(screen.getByLabelText("Email con el que agendaste"), "juan@example.com");
    await userEvent.click(screen.getByRole("button", { name: "Cancelar mi visita" }));
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("una visita ya cancelada no muestra el formulario", () => {
    render(<CitaCancelarView cita={{ ...CITA, estado: "cancelada" }} />);
    expect(screen.queryByLabelText("Email con el que agendaste")).toBeNull();
  });
});
