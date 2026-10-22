import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

vi.mock("next/image", () => ({
  // eslint-disable-next-line @next/next/no-img-element, @typescript-eslint/no-unused-vars
  default: ({ fill, priority, quality, alt, ...rest }: Record<string, unknown>) => <img alt={alt as string} {...(rest as object)} />,
}));

const trackInitiateCheckout = vi.fn();
const trackLead = vi.fn();
const trackContact = vi.fn();
vi.mock("@/lib/meta-pixel", () => ({
  trackInitiateCheckout: (...a: unknown[]) => trackInitiateCheckout(...a),
  trackLead: (...a: unknown[]) => trackLead(...a),
  trackContact: (...a: unknown[]) => trackContact(...a),
}));

import ConfiguradorMovara from "../ConfiguradorMovara";

// Cada caso recorre los 6 pasos del configurador con animaciones reales.
vi.setConfig({ testTimeout: 15_000 });

let fetchMock: ReturnType<typeof vi.fn>;

beforeEach(() => {
  trackInitiateCheckout.mockClear();
  trackLead.mockClear();
  trackContact.mockClear();
  fetchMock = vi.fn();
  vi.stubGlobal("fetch", fetchMock);
  vi.stubGlobal("open", vi.fn());
});
afterEach(() => vi.unstubAllGlobals());

const siguiente = () => screen.getByRole("button", { name: "Siguiente" });

async function paso1(user: ReturnType<typeof userEvent.setup>) {
  await user.click(screen.getAllByRole("button").find((b) => b.textContent?.includes("MOVARA Flex 38"))!);
  await user.click(siguiente());
}

async function completarHastaEnviar(user: ReturnType<typeof userEvent.setup>) {
  await paso1(user);
  await user.click(await screen.findByRole("button", { name: /Inversor/ }));
  await user.click(siguiente());
  await vi.waitFor(() => expect(document.querySelector("#cfg-localidad")).not.toBeNull());
  await user.type(document.querySelector("#cfg-localidad")!, "La Plata");
  await user.selectOptions(document.querySelector("#cfg-provincia")!, "Buenos Aires");
  await user.click(siguiente());
  await user.click(await screen.findByRole("button", { name: "2 hab." }));
  await user.click(siguiente());
  await screen.findByRole("heading", { name: "Mejoras para tu MOVARA" });
  await user.click(siguiente());
  await user.type(await screen.findByPlaceholderText("Ej: Juan García"), "Juan García");
  await user.type(screen.getByPlaceholderText("Ej: +54 9 11 1234-5678"), "+5491112345678");
  await user.type(screen.getByPlaceholderText("tu@email.com"), "juan@example.com");
  const enviar = screen.getByRole("button", { name: "Ver mi configuración" });
  await vi.waitFor(() => expect(enviar).toBeEnabled());
  await user.click(enviar);
}

describe("ConfiguradorMovara — eventos del píxel", () => {
  it("InitiateCheckout una sola vez al avanzar del paso 1, aunque vuelva y avance de nuevo", async () => {
    const user = userEvent.setup();
    render(<ConfiguradorMovara />);
    expect(trackInitiateCheckout).not.toHaveBeenCalled();
    await paso1(user);
    await screen.findByRole("button", { name: /Inversor/ });
    await user.click(screen.getByRole("button", { name: /Atrás/ }));
    await screen.findByRole("button", { name: "Siguiente", hidden: false });
    await vi.waitFor(() => expect(screen.queryByRole("button", { name: /Inversor/ })).toBeNull());
    await user.click(siguiente());
    expect(trackInitiateCheckout.mock.calls).toEqual([["MOVARA Flex 38"]]);
  });

  it("Lead una sola vez y solo cuando el servidor confirma que se guardó, sin datos personales", async () => {
    fetchMock.mockResolvedValue({ ok: true, status: 201, json: async () => ({ numeroConsulta: "C-1", tokenSeguimiento: "t" }) });
    const user = userEvent.setup();
    render(<ConfiguradorMovara />);
    await completarHastaEnviar(user);
    await vi.waitFor(() => expect(trackLead).toHaveBeenCalledTimes(1));
    expect(trackLead).toHaveBeenCalledWith("configurador", {
      modelo: "MOVARA Flex 38",
      finalidad: "inversor",
      provincia: "Buenos Aires",
    });
  });

  it.each([
    ["rechaza", () => fetchMock.mockResolvedValueOnce({ ok: false, status: 400, json: async () => ({ error: "x" }) })],
    ["no responde", () => fetchMock.mockRejectedValueOnce(new TypeError("offline"))],
  ])("sin Lead si el servidor %s", async (_, respuesta) => {
    respuesta();
    const user = userEvent.setup();
    render(<ConfiguradorMovara />);
    await completarHastaEnviar(user);
    await vi.waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
    expect((await screen.findAllByText(/No pudimos|error/i)).length).toBeGreaterThan(0);
    expect(trackLead).not.toHaveBeenCalled();
  });

  it("el botón final de WhatsApp manda un Contact", async () => {
    fetchMock.mockResolvedValue({ ok: true, status: 201, json: async () => ({}) });
    const user = userEvent.setup();
    render(<ConfiguradorMovara />);
    await completarHastaEnviar(user);
    await user.click(await screen.findByRole("button", { name: /Enviar por WhatsApp/ }));
    expect(trackContact).toHaveBeenCalledTimes(1);
    expect(window.open).toHaveBeenCalledTimes(1);
  });
});
