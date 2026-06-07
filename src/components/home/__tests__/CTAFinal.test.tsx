import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import CTAFinal from "../CTAFinal";

// ── Mocks ────────────────────────────────────────────────────────────────────

const mockOpen = vi.fn();

beforeEach(() => {
  vi.stubGlobal("open", mockOpen);
});

afterEach(() => {
  vi.unstubAllGlobals();
  mockOpen.mockClear();
});

// ── Helpers ──────────────────────────────────────────────────────────────────

async function fillAndSubmit(nombre = "Ana García", telefono = "+5491155554444", mensaje = "Quiero info") {
  const user = userEvent.setup();
  await user.type(screen.getByLabelText(/nombre/i), nombre);
  await user.type(screen.getByLabelText(/teléfono/i), telefono);
  await user.type(screen.getByLabelText(/tenés en mente/i), mensaje);
  await user.click(screen.getByRole("button", { name: /enviar por whatsapp/i }));
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe("CTAFinal", () => {
  it("renderiza el formulario de contacto", () => {
    render(<CTAFinal />);
    expect(screen.getByLabelText(/nombre/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/teléfono/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/tenés en mente/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /enviar por whatsapp/i })).toBeInTheDocument();
  });

  it("los campos tienen maxLength para prevenir payloads excesivos", () => {
    render(<CTAFinal />);
    expect(screen.getByLabelText(/nombre/i)).toHaveAttribute("maxLength", "100");
    expect(screen.getByLabelText(/teléfono/i)).toHaveAttribute("maxLength", "30");
    expect(screen.getByLabelText(/tenés en mente/i)).toHaveAttribute("maxLength", "1000");
  });

  it("abre WhatsApp con el mensaje codificado al enviar el formulario", async () => {
    render(<CTAFinal />);
    await fillAndSubmit();

    expect(mockOpen).toHaveBeenCalledOnce();
    const [url, target, features] = mockOpen.mock.calls[0];
    expect(url).toMatch(/^https:\/\/wa\.me\//);
    // encodeURIComponent encodes spaces as %20 (not +)
    expect(url).toContain("Ana%20Garc%C3%ADa");
    expect(target).toBe("_blank");
    expect(features).toBe("noopener,noreferrer");
  });

  it("el mensaje pre-cargado incluye nombre, teléfono y consulta", async () => {
    render(<CTAFinal />);
    await fillAndSubmit("Test User", "+549111", "consulta de prueba");

    const url = mockOpen.mock.calls[0][0] as string;
    const decoded = decodeURIComponent(url.split("?text=")[1]);
    expect(decoded).toContain("Test User");
    expect(decoded).toContain("+549111");
    expect(decoded).toContain("consulta de prueba");
  });

  it("muestra el estado de éxito tras enviar", async () => {
    render(<CTAFinal />);
    await fillAndSubmit();
    expect(screen.getByText(/mensaje enviado/i)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /enviar por whatsapp/i })).not.toBeInTheDocument();
  });

  it("permite enviar otra consulta desde el estado de éxito", async () => {
    render(<CTAFinal />);
    await fillAndSubmit();
    await userEvent.setup().click(screen.getByRole("button", { name: /enviar otra consulta/i }));
    expect(screen.getByRole("button", { name: /enviar por whatsapp/i })).toBeInTheDocument();
  });

  it("el enlace directo de WhatsApp tiene rel=noopener noreferrer", () => {
    render(<CTAFinal />);
    const link = screen.getByRole("link", { name: /consultar por whatsapp/i });
    expect(link).toHaveAttribute("rel", "noopener noreferrer");
    expect(link).toHaveAttribute("target", "_blank");
  });
});
