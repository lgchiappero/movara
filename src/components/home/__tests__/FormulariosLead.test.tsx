import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

vi.mock("framer-motion", async (importOriginal) => {
  const actual = await importOriginal<typeof import("framer-motion")>();
  return { ...actual, useInView: () => true };
});
vi.stubGlobal(
  "IntersectionObserver",
  class {
    observe() {}
    unobserve() {}
    disconnect() {}
  }
);

const trackLead = vi.fn();
vi.mock("@/lib/meta-pixel", () => ({ trackLead: (...args: unknown[]) => trackLead(...args) }));

import ContactoForm from "../ContactoForm";
import DossierForm from "../DossierForm";

const WA = "5493410000000";
let fetchMock: ReturnType<typeof vi.fn>;

function responder(status: number) {
  fetchMock.mockResolvedValue({ ok: status >= 200 && status < 300, status });
}

// El jsdom de este entorno no trae localStorage: uno mínimo en memoria.
function crearStorage() {
  const datos = new Map<string, string>();
  return {
    getItem: (k: string) => datos.get(k) ?? null,
    setItem: (k: string, v: string) => void datos.set(k, v),
    removeItem: (k: string) => void datos.delete(k),
    clear: () => datos.clear(),
  };
}

beforeEach(() => {
  trackLead.mockClear();
  fetchMock = vi.fn();
  vi.stubGlobal("fetch", fetchMock);
  vi.stubGlobal("localStorage", crearStorage());
});
afterEach(() => {
  vi.unstubAllGlobals();
  vi.stubGlobal("IntersectionObserver", class { observe() {} unobserve() {} disconnect() {} });
});

function enlaceWhatsAppDelAviso() {
  const aviso = screen.getByRole("alert");
  expect(aviso).toHaveTextContent("No pudimos registrar tu consulta. Escribinos por WhatsApp");
  const link = screen.getByRole("link", { name: "Escribir por WhatsApp" });
  expect(aviso).toContainElement(link);
  return decodeURIComponent(link.getAttribute("href")!);
}

describe("ContactoForm", () => {
  async function completarYEnviar() {
    const user = userEvent.setup();
    render(<ContactoForm waNumber={WA} />);
    await user.type(screen.getByPlaceholderText("Tu nombre"), "Ana");
    await user.type(screen.getByPlaceholderText("+54 9 11..."), "+54 9 11 5555 4444");
    await user.type(screen.getByPlaceholderText(/Qué tipo de espacio/), "Quiero un Flex");
    await user.click(screen.getByRole("button", { name: "Solicitar asesoramiento privado" }));
  }

  it("503: muestra el aviso con el botón de WhatsApp que lleva la consulta", async () => {
    responder(503);
    await completarYEnviar();
    const href = await vi.waitFor(enlaceWhatsAppDelAviso);
    expect(href).toContain(WA);
    expect(href).toContain("Soy Ana.");
    expect(href).toContain("Mi teléfono es +54 9 11 5555 4444.");
    expect(href).toContain("Quiero un Flex");
    expect(screen.queryByText("¡Mensaje recibido!")).not.toBeInTheDocument();
    expect(localStorage.getItem("movara_exit_popup_submitted")).toBeNull();
    expect(trackLead).not.toHaveBeenCalled();
  });

  it("otro error: mensaje genérico, sin el aviso de 503", async () => {
    responder(500);
    await completarYEnviar();
    expect(await screen.findByText("Hubo un error. Intentá de nuevo o escribinos por WhatsApp.")).toBeInTheDocument();
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    expect(trackLead).not.toHaveBeenCalled();
  });

  it("201: confirma el envío", async () => {
    responder(201);
    await completarYEnviar();
    expect(await screen.findByText("¡Mensaje recibido!")).toBeInTheDocument();
    expect(JSON.parse(fetchMock.mock.calls[0][1].body)).toMatchObject({ nombre: "Ana", formulario: "contacto" });
    // Lead una sola vez, sin datos personales.
    expect(trackLead.mock.calls).toEqual([["contacto", { provincia: "" }]]);
  });
});

describe("DossierForm", () => {
  async function llegarAlPaso3() {
    const user = userEvent.setup();
    const { container } = render(<DossierForm waNumber={WA} />);
    await user.selectOptions(container.querySelector('select[name="provincia"]')!, "Santa Fe");
    await user.click(screen.getByRole("button", { name: /Continuar/ }));
    await user.click(screen.getByRole("button", { name: /Continuar/ }));
    await user.type(screen.getByPlaceholderText("Tu nombre"), "Ana");
    await user.type(screen.getByPlaceholderText("+54 9 11..."), "+54 9 11 5555 4444");
    return { user, container };
  }

  async function completarFormulario() {
    const ctx = await llegarAlPaso3();
    await ctx.user.type(screen.getByPlaceholderText("Tu apellido"), "Pérez");
    await ctx.user.type(screen.getByPlaceholderText("12345678"), "30123456");
    await ctx.user.type(screen.getByPlaceholderText("tu@email.com"), "ana@gmail.com");
    return ctx;
  }

  it("503 al enviar el formulario: NO muestra '¡Consulta recibida!' y ofrece WhatsApp con la consulta", async () => {
    responder(503);
    const { user } = await completarFormulario();
    await user.click(screen.getByRole("button", { name: "Quiero mi precio de lanzamiento" }));
    const href = await vi.waitFor(enlaceWhatsAppDelAviso);
    expect(href).toContain(WA);
    expect(href).toContain("Soy Ana Pérez, de Santa Fe.");
    expect(href).toContain("Origen: Carpeta de proyecto");
    expect(screen.queryByText("¡Consulta recibida!")).not.toBeInTheDocument();
    // Puede reintentar: el botón sigue ahí.
    expect(screen.getByRole("button", { name: "Quiero mi precio de lanzamiento" })).toBeEnabled();
    expect(trackLead).not.toHaveBeenCalled();
  });

  it("503 en 'Prefiero que me llamen': mismo aviso, sin '¡Listo, te llamamos!'", async () => {
    responder(503);
    const { user } = await llegarAlPaso3();
    await user.click(screen.getByRole("button", { name: /Prefiero que me llamen/ }));
    await vi.waitFor(enlaceWhatsAppDelAviso);
    expect(screen.queryByText("¡Listo, te llamamos!")).not.toBeInTheDocument();
    expect(JSON.parse(fetchMock.mock.calls[0][1].body).formulario).toBe("dossier-llamada");
    expect(trackLead).not.toHaveBeenCalled();
  });

  it("otro error (o sin conexión): mensaje genérico", async () => {
    fetchMock.mockRejectedValue(new TypeError("offline"));
    const { user } = await completarFormulario();
    await user.click(screen.getByRole("button", { name: "Quiero mi precio de lanzamiento" }));
    expect(await screen.findByText("Hubo un error. Intentá de nuevo o escribinos por WhatsApp.")).toBeInTheDocument();
    expect(screen.queryByText("¡Consulta recibida!")).not.toBeInTheDocument();
    expect(trackLead).not.toHaveBeenCalled();
  });

  it("201: '¡Consulta recibida!' y '¡Listo, te llamamos!' solo si la API respondió OK", async () => {
    responder(201);
    const { user } = await completarFormulario();
    await user.click(screen.getByRole("button", { name: "Quiero mi precio de lanzamiento" }));
    expect(await screen.findByText("¡Consulta recibida!")).toBeInTheDocument();
    expect(JSON.parse(fetchMock.mock.calls[0][1].body)).toMatchObject({ formulario: "dossier", dni: "30123456" });
    expect(trackLead.mock.calls).toEqual([["dossier", { provincia: "Santa Fe" }]]);

    await user.click(screen.getByRole("button", { name: "Hacer otra consulta" }));
    const ctx = await llegarAlPasoDesdeReset(user);
    await ctx.click(screen.getByRole("button", { name: /Prefiero que me llamen/ }));
    expect(await screen.findByText("¡Listo, te llamamos!")).toBeInTheDocument();
    expect(trackLead.mock.calls).toEqual([
      ["dossier", { provincia: "Santa Fe" }],
      ["dossier-llamada", { provincia: "Santa Fe" }],
    ]);
  });
});

async function llegarAlPasoDesdeReset(user: ReturnType<typeof userEvent.setup>) {
  const provincia = document.querySelector('select[name="provincia"]') as HTMLSelectElement;
  await user.selectOptions(provincia, "Santa Fe");
  await user.click(screen.getByRole("button", { name: /Continuar/ }));
  await user.click(screen.getByRole("button", { name: /Continuar/ }));
  await user.type(screen.getByPlaceholderText("Tu nombre"), "Ana");
  await user.type(screen.getByPlaceholderText("+54 9 11..."), "+54 9 11 5555 4444");
  return user;
}
