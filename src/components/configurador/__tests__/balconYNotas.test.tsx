import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, within } from "@testing-library/react";
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

// Cada caso recorre varios pasos con animaciones reales.
vi.setConfig({ testTimeout: 15_000 });

let fetchMock: ReturnType<typeof vi.fn>;

beforeEach(() => {
  fetchMock = vi.fn().mockResolvedValue({ ok: true, status: 201, json: async () => ({ numeroConsulta: "C-1", tokenSeguimiento: "t" }) });
  vi.stubGlobal("fetch", fetchMock);
  vi.stubGlobal("open", vi.fn());
});
afterEach(() => vi.unstubAllGlobals());

type User = ReturnType<typeof userEvent.setup>;
const siguiente = () => screen.getByRole("button", { name: "Siguiente" });
const seccionBalcon = () => screen.getByText("Balcón", { selector: "p" }).parentElement!;

async function hastaConfiguracion(user: User, modelo = "MOVARA Flex 38") {
  render(<ConfiguradorMovara />);
  expect(screen.getByText("Paso 1 de 6")).toBeInTheDocument();
  await user.click(screen.getAllByRole("button").find((b) => b.textContent?.includes(modelo))!);
  await user.click(siguiente());
  await user.click(await screen.findByRole("button", { name: /Inversor/ }));
  await user.click(siguiente());
  await vi.waitFor(() => expect(document.querySelector("#cfg-localidad")).not.toBeNull());
  await user.type(document.querySelector("#cfg-localidad")!, "La Plata");
  await user.selectOptions(document.querySelector("#cfg-provincia")!, "Buenos Aires");
  await user.click(siguiente());
  await screen.findByRole("heading", { name: "Configurá tu espacio" });
}

describe("Configurador — 6 pasos, sin el paso de mejoras", () => {
  it("el paso 3 ya no muestra la tarjeta de zona climática y el 4 es el último antes de los datos", async () => {
    const user = userEvent.setup();
    render(<ConfiguradorMovara />);
    expect(screen.getByText("6 pasos para encontrar el módulo ideal y recibir un presupuesto por WhatsApp.")).toBeInTheDocument();
    expect(screen.queryByText("Mejoras")).toBeNull();
    await user.click(screen.getAllByRole("button").find((b) => b.textContent?.includes("MOVARA Flex 38"))!);
    await user.click(siguiente());
    await user.click(await screen.findByRole("button", { name: /Inversor/ }));
    await user.click(siguiente());
    await vi.waitFor(() => expect(document.querySelector("#cfg-provincia")).not.toBeNull());
    await user.selectOptions(document.querySelector("#cfg-provincia")!, "Buenos Aires");
    expect(screen.getByText("Paso 3 de 6")).toBeInTheDocument();
    expect(screen.queryByText(/Zona climática/)).toBeNull();
  });
});

describe("Configurador — sección Balcón", () => {
  it("sin balcón no hay techo; al elegir uno aparece el techo con sus fotos y precio a consultar", async () => {
    const user = userEvent.setup();
    await hastaConfiguracion(user);
    expect(screen.getByText("Paso 4 de 6")).toBeInTheDocument();
    const balcon = within(seccionBalcon());
    expect(balcon.getByRole("button", { name: "No" })).toHaveClass("border-sage-500");
    expect(balcon.queryByText("Techo")).toBeNull();

    await user.click(balcon.getByRole("button", { name: "Frontal" }));
    expect(balcon.getByText("Techo")).toBeInTheDocument();
    expect(balcon.getAllByText("Precio a consultar")).toHaveLength(2);
    expect(balcon.getByRole("button", { name: /Sobretecho solo en el balcón/ })).toHaveAttribute("aria-pressed", "true");
    expect(balcon.getByAltText("Sobretecho completo: balcón y toda la unidad")).toHaveAttribute("src", expect.stringContaining("balcon%20con%20techocompleto.png"));

    await user.click(balcon.getByRole("button", { name: "No" }));
    expect(balcon.queryByText("Techo")).toBeNull();
  });

  it("el balcón no suma al precio estimado: se lista como 'lo cotizamos en tu presupuesto'", async () => {
    const user = userEvent.setup();
    await hastaConfiguracion(user);
    const precioAntes = screen.getAllByText(/USD [\d.]+/)[0].textContent;
    const balcon = within(seccionBalcon());
    await user.click(balcon.getByRole("button", { name: "Lateral" }));
    await user.click(balcon.getByRole("button", { name: /Sobretecho completo/ }));
    expect(screen.getAllByText("+ Balcón lateral: lo cotizamos en tu presupuesto").length).toBeGreaterThan(0);
    expect(
      screen.getAllByText("+ Sobretecho completo: balcón y toda la unidad: lo cotizamos en tu presupuesto").length
    ).toBeGreaterThan(0);
    expect(screen.getAllByText(/USD [\d.]+/)[0].textContent).toBe(precioAntes);
  });

  it("en Flex 18 no se ofrece el balcón lateral", async () => {
    const user = userEvent.setup();
    await hastaConfiguracion(user, "MOVARA Flex 18");
    const balcon = within(seccionBalcon());
    expect(balcon.queryByRole("button", { name: "Lateral" })).toBeNull();
    expect(balcon.getByText(/El balcón lateral está disponible para Flex 38 y Flex 77/)).toBeInTheDocument();
  });

  it("si vuelve al paso 1 y cambia a Flex 18, un balcón lateral vuelve a 'No'", async () => {
    const user = userEvent.setup();
    await hastaConfiguracion(user);
    await user.click(within(seccionBalcon()).getByRole("button", { name: "Lateral" }));
    for (let i = 0; i < 3; i++) {
      await user.click(screen.getByRole("button", { name: /Atrás/ }));
    }
    await user.click(await screen.findByRole("button", { name: /MOVARA Flex 18/ }));
    expect(screen.queryByText(/Balcón lateral: lo cotizamos/)).toBeNull();
  });

  it("el muro cortina se muestra sin foto, con descripción y precio a consultar", async () => {
    const user = userEvent.setup();
    await hastaConfiguracion(user);
    const muro = screen.getByRole("button", { name: /Muro cortina de vidrio/ });
    expect(within(muro).queryByRole("img")).toBeNull();
    expect(within(muro).getByText("Precio a consultar")).toBeInTheDocument();
    expect(within(muro).getByText(/Pared de vidrio/)).toBeInTheDocument();
    expect(screen.queryByText(/Galería con sobretecho/)).toBeNull();
  });
});

describe("Configurador — notas y envío", () => {
  it("cuenta los caracteres, manda las notas y el balcón al servidor y la pantalla final avisa que se cotiza", async () => {
    const user = userEvent.setup();
    await hastaConfiguracion(user);
    await user.click(within(seccionBalcon()).getByRole("button", { name: "Frontal" }));
    const notas = screen.getByLabelText(/¿Algo más que necesitemos saber\?/);
    expect(notas).toHaveAttribute("maxLength", "1000");
    expect(notas).toHaveAttribute("placeholder", expect.stringContaining("accesibilidad, orientación del terreno"));
    expect(screen.getByText("0/1000")).toBeInTheDocument();
    await user.type(notas, "Necesito rampa");
    expect(screen.getByText("14/1000")).toBeInTheDocument();

    await user.click(siguiente());
    expect(await screen.findByText("Paso 5 de 6")).toBeInTheDocument();
    await user.type(screen.getByPlaceholderText("Ej: Juan García"), "Juan García");
    await user.type(screen.getByPlaceholderText("Ej: +54 9 11 1234-5678"), "+5491112345678");
    await user.type(screen.getByPlaceholderText("tu@email.com"), "juan@example.com");
    const enviar = screen.getByRole("button", { name: "Ver mi configuración" });
    await vi.waitFor(() => expect(enviar).toBeEnabled());
    await user.click(enviar);

    expect(await screen.findByText("Paso 6 de 6 — Tu configuración")).toBeInTheDocument();
    expect(screen.getByText("+ Balcón frontal: lo cotizamos en tu presupuesto")).toBeInTheDocument();
    expect(screen.queryByText("Mejoras seleccionadas")).toBeNull();
    const mensaje = (screen.getByRole("textbox") as HTMLTextAreaElement).value;
    expect(mensaje).toContain("Para cotizar en el presupuesto:\nBalcón frontal, Sobretecho solo en el balcón");
    expect(mensaje).not.toContain("Mejoras a cotizar");

    await vi.waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
    const body = JSON.parse(fetchMock.mock.calls[0][1].body);
    expect(body.notasConfiguracion).toBe("Necesito rampa");
    expect(body.materiales).toMatchObject({ balcon: "frontal", techoBalcon: "solo-balcon" });
    expect(body).not.toHaveProperty("upgrades");
  });
});
