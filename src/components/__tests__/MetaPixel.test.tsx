import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { StrictMode } from "react";
import { render, fireEvent } from "@testing-library/react";
import { MetaPixel } from "@/components/MetaPixel";

let pathname = "/";
vi.mock("next/navigation", () => ({ usePathname: () => pathname }));

const locationOriginal = window.location;

function irA(ruta: string, host = "www.movara.com.ar") {
  pathname = ruta;
  Object.defineProperty(window, "location", { configurable: true, value: new URL(`https://${host}${ruta}`) });
}

const eventos = (nombre: string) =>
  (window.fbq?.queue ?? []).filter((a) => a[0] === "track" && a[1] === nombre);

const scriptsDelPixel = () =>
  document.querySelectorAll('script[src="https://connect.facebook.net/en_US/fbevents.js"]');

beforeEach(() => {
  delete window.fbq;
  delete window._fbq;
  scriptsDelPixel().forEach((s) => s.remove());
  Object.defineProperty(navigator, "webdriver", { configurable: true, get: () => false });
  irA("/");
});

afterEach(() => {
  Object.defineProperty(window, "location", { configurable: true, value: locationOriginal });
});

describe("MetaPixel — dónde se carga", () => {
  it("en producción y en el dominio propio carga el píxel una vez y manda un PageView", () => {
    render(<MetaPixel vercelEnv="production" />);
    expect(scriptsDelPixel()).toHaveLength(1);
    expect(eventos("PageView")).toHaveLength(1);
  });

  it.each([
    ["desarrollo / e2e", undefined, "www.movara.com.ar"],
    ["preview de Vercel", "preview", "movara-abc.vercel.app"],
    ["build de producción en localhost", "production", "localhost"],
  ])("no carga en %s", (_, env, host) => {
    irA("/", host);
    render(<MetaPixel vercelEnv={env} />);
    expect(window.fbq).toBeUndefined();
    expect(scriptsDelPixel()).toHaveLength(0);
  });

  it.each(["/admin", "/admin/pedidos", "/studio", "/recibo/tok", "/mi-pedido", "/mi-pedido/tok", "/agendar/cancelar/1"])(
    "no carga en la ruta excluida %s",
    (ruta) => {
      irA(ruta);
      render(<MetaPixel vercelEnv="production" />);
      expect(window.fbq).toBeUndefined();
      expect(scriptsDelPixel()).toHaveLength(0);
    }
  );

  it("no carga en un navegador automatizado", () => {
    Object.defineProperty(navigator, "webdriver", { configurable: true, get: () => true });
    render(<MetaPixel vercelEnv="production" />);
    expect(window.fbq).toBeUndefined();
  });
});

describe("MetaPixel — PageView", () => {
  it("no duplica el PageView en StrictMode", () => {
    render(
      <StrictMode>
        <MetaPixel vercelEnv="production" />
      </StrictMode>
    );
    expect(eventos("PageView")).toHaveLength(1);
  });

  it("manda un PageView por navegación y ninguno al re-renderizar la misma ruta", () => {
    const { rerender } = render(<MetaPixel vercelEnv="production" />);
    rerender(<MetaPixel vercelEnv="production" />);
    irA("/modelos");
    rerender(<MetaPixel vercelEnv="production" />);
    expect(eventos("PageView")).toHaveLength(2);
  });

  it("al entrar por una ruta excluida no mide, y al pasar a una pública carga y mide una vez", () => {
    irA("/mi-pedido/tok");
    const { rerender } = render(<MetaPixel vercelEnv="production" />);
    expect(window.fbq).toBeUndefined();
    irA("/");
    rerender(<MetaPixel vercelEnv="production" />);
    expect(scriptsDelPixel()).toHaveLength(1);
    expect(eventos("PageView")).toHaveLength(1);
  });
});

describe("MetaPixel — Contact en links de WhatsApp", () => {
  function renderConLinks() {
    return render(
      <>
        <MetaPixel vercelEnv="production" />
        <a href="https://wa.me/5491100000000?text=hola">
          <span>Escribinos</span>
        </a>
        <a href="#modelos">Modelos</a>
        <button>Sin link</button>
      </>
    );
  }

  it("un clic en un link de WhatsApp (o en algo adentro) manda un Contact con la página", () => {
    const { getByText } = renderConLinks();
    fireEvent.click(getByText("Escribinos"));
    expect(eventos("Contact")).toEqual([["track", "Contact", { content_name: "/" }]]);
  });

  it("otros clics no mandan Contact", () => {
    const { getByText } = renderConLinks();
    fireEvent.click(getByText("Modelos"));
    fireEvent.click(getByText("Sin link"));
    expect(eventos("Contact")).toHaveLength(0);
  });

  it("deja de escuchar al desmontarse", () => {
    const { getByText, unmount } = renderConLinks();
    const link = getByText("Escribinos").closest("a")!;
    unmount();
    document.body.appendChild(link);
    fireEvent.click(link);
    link.remove();
    expect(eventos("Contact")).toHaveLength(0);
  });
});
