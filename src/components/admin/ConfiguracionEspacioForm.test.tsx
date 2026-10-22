import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";

vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: vi.fn(), push: vi.fn() }) }));
vi.mock("@/components/admin/Toast", () => ({ useToast: () => ({ showSuccess: vi.fn(), showError: vi.fn() }) }));

import ConfiguracionEspacioForm from "./ConfiguracionEspacioForm";

const INICIAL = {
  modelo: "20ft",
  finalidad: "vivienda",
  provincia: "Santa Fe",
  localidad: "Sunchales",
  habitaciones: 2,
  incluyeCocina: true,
  tipoCocina: "electrico",
  incluyeBano: true,
  tipoAgua: "calefon-electrico",
  lavarropas: "sin",
  materiales: null,
  notasConfiguracion: "Necesito rampa",
};

let fetchMock: ReturnType<typeof vi.fn>;
beforeEach(() => {
  fetchMock = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ ok: true }) });
  vi.stubGlobal("fetch", fetchMock);
});
afterEach(() => vi.unstubAllGlobals());

describe("ConfiguracionEspacioForm — mejoras de pedidos viejos", () => {
  it("muestra las mejoras del configurador anterior y las reenvía al guardar", async () => {
    render(<ConfiguracionEspacioForm id="p1" initial={{ ...INICIAL, upgrades: ["banera", "balcon-delantero", "kit-solar"] }} />);
    expect(screen.getByText("Elegidas en el configurador anterior")).toBeInTheDocument();
    expect(screen.getByText("Balcón delantero (configuración anterior)")).toBeInTheDocument();
    expect(screen.getByText("Kit solar básico (opción discontinuada)")).toBeInTheDocument();
    expect(screen.getByRole("checkbox", { name: "Bañera" })).toBeChecked();
    expect(screen.getByDisplayValue("Necesito rampa")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Guardar configuración" }));
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
    const body = JSON.parse(fetchMock.mock.calls[0][1].body);
    expect(body.upgrades).toEqual(["banera", "balcon-delantero", "kit-solar"]);
  });

  it("sin mejoras viejas no muestra la sección", () => {
    render(<ConfiguracionEspacioForm id="p1" initial={{ ...INICIAL, upgrades: ["banera"] }} />);
    expect(screen.queryByText("Elegidas en el configurador anterior")).toBeNull();
  });
});
