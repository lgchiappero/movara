import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

vi.mock("next/image", () => ({
  // eslint-disable-next-line @next/next/no-img-element, @typescript-eslint/no-unused-vars
  default: ({ fill, priority, quality, alt, ...rest }: Record<string, unknown>) => <img alt={alt as string} {...(rest as object)} />,
}));
vi.mock("@/lib/meta-pixel", () => ({
  trackInitiateCheckout: vi.fn(),
  trackLead: vi.fn(),
  trackContact: vi.fn(),
}));

import ConfiguradorMovara from "../ConfiguradorMovara";

vi.setConfig({ testTimeout: 15_000 });

let scrollTo: ReturnType<typeof vi.fn>;
beforeEach(() => {
  scrollTo = vi.fn();
  vi.stubGlobal("scrollTo", scrollTo);
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: true, status: 201, json: async () => ({ numeroConsulta: "C-1", tokenSeguimiento: "t" }) }));
});
afterEach(() => vi.unstubAllGlobals());

const siguiente = () => screen.getByRole("button", { name: "Siguiente" });
// Cada cambio de paso fija la posición dos veces: al montarse y en el frame siguiente.
const POR_CAMBIO = 2;
const scrollsInstantaneos = () => scrollTo.mock.calls.filter(([o]) => o?.behavior === "instant").length;

describe("Configurador — scroll al cambiar de paso", () => {
  it("al montar no scrollea; con Siguiente y Atrás vuelve al inicio del configurador, sin animar", async () => {
    const user = userEvent.setup();
    render(<ConfiguradorMovara />);
    expect(scrollTo).not.toHaveBeenCalled();
    expect(document.querySelector("[data-cfg-inicio]")).not.toBeNull();

    await user.click(screen.getAllByRole("button").find((b) => b.textContent?.includes("MOVARA Flex 38"))!);
    await user.click(siguiente());
    await screen.findByText("Paso 2 de 6");
    await vi.waitFor(() => expect(scrollsInstantaneos()).toBe(POR_CAMBIO));

    await user.click(screen.getByRole("button", { name: /Atrás/ }));
    await screen.findByText("Paso 1 de 6");
    await vi.waitFor(() => expect(scrollsInstantaneos()).toBe(2 * POR_CAMBIO));
  });

  it("al mostrar el resultado y al volver de él también", async () => {
    const user = userEvent.setup();
    render(<ConfiguradorMovara />);
    await user.click(screen.getAllByRole("button").find((b) => b.textContent?.includes("MOVARA Flex 38"))!);
    await user.click(siguiente());
    await user.click(await screen.findByRole("button", { name: /Inversor/ }));
    await user.click(siguiente());
    await vi.waitFor(() => expect(document.querySelector("#cfg-provincia")).not.toBeNull());
    await user.type(document.querySelector("#cfg-localidad")!, "La Plata");
    await user.selectOptions(document.querySelector("#cfg-provincia")!, "Buenos Aires");
    await user.click(siguiente());
    await screen.findByRole("heading", { name: "Configurá tu espacio" });
    await user.click(siguiente());
    await screen.findByText("Paso 5 de 6");
    await user.type(screen.getByPlaceholderText("Ej: Juan García"), "Juan García");
    await user.type(screen.getByPlaceholderText("Ej: +54 9 11 1234-5678"), "+5491112345678");
    await user.type(screen.getByPlaceholderText("tu@email.com"), "juan@example.com");
    const enviar = screen.getByRole("button", { name: "Ver mi configuración" });
    await vi.waitFor(() => expect(enviar).toBeEnabled());
    const antes = scrollsInstantaneos();

    await user.click(enviar);
    await screen.findByText("Paso 6 de 6 — Tu configuración");
    await vi.waitFor(() => expect(scrollsInstantaneos()).toBe(antes + POR_CAMBIO));

    await user.click(screen.getByRole("button", { name: "Modificar configuración" }));
    await screen.findByText("Paso 5 de 6");
    await vi.waitFor(() => expect(scrollsInstantaneos()).toBe(antes + 2 * POR_CAMBIO));
  });
});
