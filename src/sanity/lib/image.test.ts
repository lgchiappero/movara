import { describe, it, expect, vi } from "vitest";

vi.mock("../env", () => ({ projectId: "test", dataset: "production" }));
import { urlImagenCompleta, posicionHotspot } from "./image";

const asset = { _ref: "image-abc123def456-2000x1000-jpg", _type: "reference" };

describe("urlImagenCompleta", () => {
  it("pide la foto entera: un solo eje, fit=max, formato automático, sin rect ni alto", () => {
    const url = new URL(urlImagenCompleta({ asset }, 900));
    expect(url.searchParams.get("w")).toBe("900");
    expect(url.searchParams.get("fit")).toBe("max");
    expect(url.searchParams.get("auto")).toBe("format");
    expect(url.searchParams.has("h")).toBe(false);
    expect(url.searchParams.has("rect")).toBe(false);
  });

  it("respeta el crop cargado en el Studio (rect=) y nada más", () => {
    const url = new URL(urlImagenCompleta({ asset, crop: { top: 0.1, bottom: 0, left: 0.25, right: 0 } }, 900));
    expect(url.searchParams.get("rect")).toBe("500,100,1500,900");
    expect(url.searchParams.get("fit")).toBe("max");
    expect(url.searchParams.has("h")).toBe(false);
  });

  it("ignora un crop incompleto o un hotspot (no recortan)", () => {
    expect(new URL(urlImagenCompleta({ asset, crop: { top: 0.2 }, hotspot: { x: 0.1, y: 0.9 } }, 600)).searchParams.has("rect")).toBe(false);
  });
});

describe("posicionHotspot", () => {
  it("convierte el hotspot en object-position", () => {
    expect(posicionHotspot({ x: 0.3, y: 0.75, width: 0.2, height: 0.2 })).toBe("30% 75%");
    expect(posicionHotspot({ x: 1.4, y: -0.2 })).toBe("100% 0%");
  });

  it("sin hotspot válido no fija posición", () => {
    expect(posicionHotspot(null)).toBeUndefined();
    expect(posicionHotspot({ x: 0.5 })).toBeUndefined();
    expect(posicionHotspot("x")).toBeUndefined();
  });
});
