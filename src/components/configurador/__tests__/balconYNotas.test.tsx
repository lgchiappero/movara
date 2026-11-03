import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, within, fireEvent } from "@testing-library/react";
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
  it("sin balcón no hay techo; al elegir uno aparece el techo con sus fotos: solo en el balcón + USD 3.100, completo a consultar", async () => {
    const user = userEvent.setup();
    await hastaConfiguracion(user);
    expect(screen.getByText("Paso 4 de 6")).toBeInTheDocument();
    const balcon = within(seccionBalcon());
    expect(balcon.getByRole("button", { name: "No" })).toHaveClass("border-sage-500");
    expect(balcon.queryByText("Techo")).toBeNull();

    await user.click(balcon.getByRole("button", { name: "Frontal" }));
    expect(balcon.getByText("Techo")).toBeInTheDocument();
    expect(within(balcon.getByRole("button", { name: /Sobretecho solo en el balcón/ })).getByText("+ USD 3.100")).toBeInTheDocument();
    expect(within(balcon.getByRole("button", { name: /Sobretecho completo/ })).getByText("Precio a consultar")).toBeInTheDocument();
    expect(balcon.getByText(/Con sobretecho solo en el balcón: \+ USD 3\.100/)).toBeInTheDocument();
    expect(balcon.getByText(/Precios en USD, IVA incluido\./)).toBeInTheDocument();
    expect(balcon.getByRole("button", { name: /Sobretecho solo en el balcón/ })).toHaveAttribute("aria-pressed", "true");
    // Con balcón el techo no se puede sacar.
    await user.click(balcon.getByRole("button", { name: /Sobretecho solo en el balcón/ }));
    expect(balcon.getByRole("button", { name: /Sobretecho solo en el balcón/ })).toHaveAttribute("aria-pressed", "true");
    expect(balcon.getByAltText("Sobretecho completo: balcón y toda la unidad")).toHaveAttribute("src", expect.stringContaining("balcon%20con%20techocompleto.png"));

    await user.click(balcon.getByRole("button", { name: "No" }));
    expect(balcon.queryByText("Techo")).toBeNull();
  });

  it("con sobretecho completo el balcón no suma al precio estimado: se lista como A consultar", async () => {
    const user = userEvent.setup();
    await hastaConfiguracion(user);
    const precioAntes = screen.getAllByText(/USD [\d.]+/)[0].textContent;
    const balcon = within(seccionBalcon());
    await user.click(balcon.getByRole("button", { name: "Lateral" }));
    await user.click(balcon.getByRole("button", { name: /Sobretecho completo/ }));
    expect(screen.getAllByText("+ Balcón lateral: A consultar").length).toBeGreaterThan(0);
    expect(screen.getAllByText("+ Sobretecho completo: balcón y toda la unidad: A consultar").length).toBeGreaterThan(0);
    // El monto se anima hasta el valor nuevo.
    await vi.waitFor(() => expect(screen.getAllByText(/USD [\d.]+/)[0].textContent).toBe(precioAntes));
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
    expect(screen.queryByText(/Balcón lateral de 2 m/)).toBeNull();
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
  it("cuenta los caracteres, manda las notas y el balcón al servidor y la pantalla final muestra el desglose", async () => {
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
    expect(screen.getByText("+ Balcón frontal de 2 m con sobretecho, deck y barandas")).toBeInTheDocument();
    expect(screen.queryByText("Mejoras seleccionadas")).toBeNull();
    const mensaje = (screen.getByRole("textbox") as HTMLTextAreaElement).value;
    expect(mensaje).toContain("⭐ Extras:\n- Balcón frontal de 2 m con sobretecho, deck y barandas: USD 3.100");
    expect(mensaje).not.toContain("A consultar:");
    expect(mensaje).not.toContain("Mejoras a cotizar");
    expect(mensaje).not.toContain("Zona climática");
    expect(screen.queryByText("Llanura Pampeana")).toBeNull();
    expect(
      screen.getByText("Precio estimado de la unidad terminada, llave en mano. Precios en USD, IVA incluido. El traslado hasta tu terreno se cotiza según tu ubicación.")
    ).toBeInTheDocument();
    expect(screen.queryByText(/transporte e instalación/)).toBeNull();

    await vi.waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
    const body = JSON.parse(fetchMock.mock.calls[0][1].body);
    expect(body.notasConfiguracion).toBe("Necesito rampa");
    expect(body.materiales).toMatchObject({ balcon: "frontal", techoBalcon: "solo-balcon" });
    expect(body).not.toHaveProperty("upgrades");
  });
});

async function hastaResultado(user: User) {
  await user.click(siguiente());
  await user.type(await screen.findByPlaceholderText("Ej: Juan García"), "Juan García");
  await user.type(screen.getByPlaceholderText("Ej: +54 9 11 1234-5678"), "+5491112345678");
  await user.type(screen.getByPlaceholderText("tu@email.com"), "juan@example.com");
  const enviar = screen.getByRole("button", { name: "Ver mi configuración" });
  await vi.waitFor(() => expect(enviar).toBeEnabled());
  await user.click(enviar);
  await screen.findByText("Paso 6 de 6 — Tu configuración");
}

const BASE_FLEX_38 = 38 * 680;
const usd = (n: number) => `USD ${n.toLocaleString("es-AR")}`;

describe("Configurador — precios de los extras", () => {
  it("el inodoro inteligente se elige en el baño y suma USD 580", async () => {
    const user = userEvent.setup();
    await hastaConfiguracion(user);
    const inodoro = screen.getByRole("button", { name: /Inodoro inteligente con bidet/ });
    expect(within(inodoro).getByText("+ USD 580")).toBeInTheDocument();
    expect(screen.getByText("Inodoro inteligente — costo adicional")).toBeInTheDocument();
    await user.click(inodoro);
    expect(inodoro).toHaveAttribute("aria-pressed", "true");
    await vi.waitFor(() => expect(screen.getAllByText(usd(BASE_FLEX_38 + 580)).length).toBeGreaterThan(0));
    // Se puede sacar.
    await user.click(inodoro);
    await vi.waitFor(() => expect(screen.getAllByText(usd(BASE_FLEX_38)).length).toBeGreaterThan(0));
  });

  it("sin baño no se muestra la sección del baño ni suma el inodoro elegido; al volver a elegir baño reaparece", async () => {
    const user = userEvent.setup();
    await hastaConfiguracion(user);
    await user.click(screen.getByRole("button", { name: /Inodoro inteligente con bidet/ }));
    await vi.waitFor(() => expect(screen.getAllByText(usd(BASE_FLEX_38 + 580)).length).toBeGreaterThan(0));

    const campoBano = screen.getByText("¿Incluye baño?").parentElement!;
    await user.click(within(campoBano).getByRole("button", { name: "No" }));
    expect(screen.queryByRole("button", { name: /Inodoro inteligente con bidet/ })).toBeNull();
    expect(screen.queryByText("Paneles de pared — sin costo")).toBeNull();
    await vi.waitFor(() => expect(screen.getAllByText(usd(BASE_FLEX_38)).length).toBeGreaterThan(0));

    await hastaResultado(user);
    const mensaje = (screen.getAllByRole("textbox").at(-1) as HTMLTextAreaElement).value;
    expect(mensaje).not.toContain("Inodoro");
    const body = JSON.parse(fetchMock.mock.calls[0][1].body);
    expect(body.materiales).toMatchObject({ inodoro: null, panelesBano: null });
  });

  it("amoblamiento del baño: sin costo, con placeholder mientras no hay foto; va al resumen, al WhatsApp y al pedido", async () => {
    const user = userEvent.setup();
    await hastaConfiguracion(user);
    expect(screen.getByText("Amoblamiento del baño — sin costo")).toBeInTheDocument();
    const opcion3 = screen.getByRole("button", { name: /Amoblamiento — opción 3/ });
    // La foto todavía no existe: la card muestra el placeholder.
    fireEvent.error(within(opcion3).getByRole("img", { name: "Amoblamiento — opción 3" }));
    expect(within(opcion3).getByText("Foto próximamente")).toBeInTheDocument();
    expect(within(opcion3).queryByText(/USD/)).toBeNull();
    await user.click(opcion3);
    expect(opcion3).toHaveAttribute("aria-pressed", "true");
    await vi.waitFor(() => expect(screen.getAllByText(usd(BASE_FLEX_38)).length).toBeGreaterThan(0));

    await hastaResultado(user);
    expect(screen.getByText("Amoblamiento del baño").nextElementSibling).toHaveTextContent("Amoblamiento — opción 3");
    const mensaje = (screen.getAllByRole("textbox").at(-1) as HTMLTextAreaElement).value;
    expect(mensaje).toContain("- Amoblamiento baño: Amoblamiento — opción 3");
    const body = JSON.parse(fetchMock.mock.calls[0][1].body);
    expect(body.materiales.amoblamientoBano).toBe("amoblamiento-03");
  });

  it("sin baño el WhatsApp no lista paneles, puerta ni amoblamiento del baño", async () => {
    const user = userEvent.setup();
    await hastaConfiguracion(user);
    await user.click(within(screen.getByText("¿Incluye baño?").parentElement!).getByRole("button", { name: "No" }));
    expect(screen.queryByText("Amoblamiento del baño — sin costo")).toBeNull();
    await hastaResultado(user);
    expect(screen.getByText("Amoblamiento del baño").nextElementSibling).toHaveTextContent("—");
    const mensaje = (screen.getAllByRole("textbox").at(-1) as HTMLTextAreaElement).value;
    expect(mensaje).not.toMatch(/Paneles baño|Puerta baño|Amoblamiento baño/);
  });

  it("los 4 extras con precio: total = base + 5.020, en el desglose, el resumen y el WhatsApp", async () => {
    const user = userEvent.setup();
    await hastaConfiguracion(user);
    await user.click(within(seccionBalcon()).getByRole("button", { name: "Frontal" }));
    await user.click(screen.getByRole("button", { name: /Gris con líneas/ }));
    await user.click(screen.getByRole("button", { name: /Inodoro inteligente con bidet/ }));
    await user.click(screen.getByRole("button", { name: /^8917/ }));
    await vi.waitFor(() => expect(screen.getAllByText(usd(BASE_FLEX_38 + 5020)).length).toBeGreaterThan(0));

    await hastaResultado(user);
    expect(screen.getByText(usd(BASE_FLEX_38 + 5020))).toBeInTheDocument();
    for (const linea of [
      "+ Panel metálico labrado: Gris con líneas",
      "+ Piso SPC 4 mm: 8917",
      "+ Inodoro inteligente con bidet",
      "+ Balcón frontal de 2 m con sobretecho, deck y barandas",
    ]) {
      expect(screen.getByText(linea)).toBeInTheDocument();
    }
    const mensaje = (screen.getAllByRole("textbox").at(-1) as HTMLTextAreaElement).value;
    expect(mensaje).toContain(
      "⭐ Extras:\n" +
        "- Panel metálico labrado: Gris con líneas: USD 950\n" +
        "- Piso SPC 4 mm: 8917: USD 390\n" +
        "- Inodoro inteligente con bidet: USD 580\n" +
        "- Balcón frontal de 2 m con sobretecho, deck y barandas: USD 3.100"
    );
    expect(mensaje).toContain(`💰 Precio estimado: ${usd(BASE_FLEX_38 + 5020)}\n(Precios en USD, IVA incluido.)`);
  });

  it("sobretecho completo + bañera + muro de vidrio: total = base, las tres A consultar en el resumen y el WhatsApp", async () => {
    const user = userEvent.setup();
    await hastaConfiguracion(user);
    await user.click(within(seccionBalcon()).getByRole("button", { name: "Frontal" }));
    await user.click(within(seccionBalcon()).getByRole("button", { name: /Sobretecho completo/ }));
    // La barra de precio del celular también lista lo elegido: se toman las cards antes.
    const banera = screen.getByRole("button", { name: /Bañera — opción 1/ });
    const muro = screen.getByRole("button", { name: /Muro cortina de vidrio/ });
    expect(within(banera).getByText("Precio a consultar")).toBeInTheDocument();
    await user.click(banera);
    await user.click(muro);
    await vi.waitFor(() => expect(screen.getAllByText(usd(BASE_FLEX_38)).length).toBeGreaterThan(0));

    await hastaResultado(user);
    // Total y precio base del desglose: son iguales.
    expect(screen.getAllByText(usd(BASE_FLEX_38))).toHaveLength(2);
    const resumen = screen.getByText("Presupuesto").parentElement!;
    expect(within(resumen).getAllByText("A consultar")).toHaveLength(4);
    const mensaje = (screen.getAllByRole("textbox").at(-1) as HTMLTextAreaElement).value;
    expect(mensaje).toContain("⭐ Extras:\nNinguno");
    expect(mensaje).toContain(
      "🏗️ A consultar:\n" +
        "- Bañera — opción 1: A consultar\n" +
        "- Muro cortina de vidrio: A consultar\n" +
        "- Balcón frontal: A consultar\n" +
        "- Sobretecho completo: balcón y toda la unidad: A consultar"
    );
    expect(mensaje).toContain(`💰 Precio estimado: ${usd(BASE_FLEX_38)}\n(sin lo que es a consultar)`);
  });
});

describe("Configurador — agua caliente", () => {
  it("el calefón eléctrico es un dato fijo del baño, sin selector ni opción a gas", async () => {
    const user = userEvent.setup();
    await hastaConfiguracion(user);
    expect(screen.queryByText("Agua caliente")).toBeNull();
    expect(screen.queryByText(/termotanque/i)).toBeNull();
    expect(screen.getByText("Calefón eléctrico incluido.")).toBeInTheDocument();

    const bano = within(screen.getByText("¿Incluye baño?").parentElement!);
    await user.click(bano.getByRole("button", { name: "No" }));
    expect(screen.queryByText("Calefón eléctrico incluido.")).toBeNull();
    await user.click(bano.getByRole("button", { name: "Sí" }));

    await user.click(siguiente());
    await user.type(await screen.findByPlaceholderText("Ej: Juan García"), "Juan García");
    await user.type(screen.getByPlaceholderText("Ej: +54 9 11 1234-5678"), "+5491112345678");
    await user.type(screen.getByPlaceholderText("tu@email.com"), "juan@example.com");
    await user.click(screen.getByRole("button", { name: "Ver mi configuración" }));
    await vi.waitFor(() => expect(fetchMock).toHaveBeenCalled());
    expect(JSON.parse(fetchMock.mock.calls[0][1].body).tipoAgua).toBe("calefon-electrico");
    expect((screen.getAllByRole("textbox").at(-1) as HTMLTextAreaElement).value).toContain("baño con calefón eléctrico");
  });
});
