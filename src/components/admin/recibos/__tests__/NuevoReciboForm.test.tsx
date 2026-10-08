import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

const push = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ push }) }));

import NuevoReciboForm, { faltantesUnidad, type UnidadParaRecibo } from "../NuevoReciboForm";

const U = (o: Partial<UnidadParaRecibo> = {}): UnidadParaRecibo => ({
  id: "u1",
  numeroUnidad: "MOV-UNIDAD-2026-001",
  modelo: "Flex 38",
  lugarPorDefecto: "Ruta 34, Sunchales, Santa Fe",
  reciboVigente: null,
  cliente: { nombre: "Ana García", dni: "30123456", cuit: null, email: "ana@movara.test", telefono: null },
  ...o,
});

const UNIDADES = [
  U(),
  U({ id: "u2", numeroUnidad: null, modelo: null, lugarPorDefecto: "", cliente: { nombre: "Beto", dni: null, cuit: null, email: null, telefono: null } }),
  U({ id: "u3", numeroUnidad: "MOV-UNIDAD-2026-003", reciboVigente: "REC-2026-009", cliente: { nombre: "Carla", dni: null, cuit: null, email: "c@x.com", telefono: null } }),
];

beforeEach(() => vi.clearAllMocks());
afterEach(() => vi.unstubAllGlobals());

describe("faltantesUnidad", () => {
  it("Nº, modelo y email del cliente", () => {
    expect(faltantesUnidad(U())).toEqual([]);
    expect(faltantesUnidad(UNIDADES[1])).toEqual(["Nº de unidad", "modelo", "email del cliente"]);
  });
});

describe("NuevoReciboForm", () => {
  it("precarga los datos de la unidad inicial y el lugar por defecto", () => {
    render(<NuevoReciboForm unidades={UNIDADES} unidadInicial="u1" />);
    const datos = screen.getByLabelText("Datos precargados");
    expect(datos).toHaveTextContent("Ana García");
    expect(datos).toHaveTextContent("ana@movara.test");
    expect(screen.getByPlaceholderText("Dirección, localidad, provincia")).toHaveValue("Ruta 34, Sunchales, Santa Fe");
    expect(screen.getByRole("button", { name: "Crear y enviar al cliente" })).toBeEnabled();
  });

  it("avisa lo que falta y no deja crear", async () => {
    const user = userEvent.setup();
    render(<NuevoReciboForm unidades={UNIDADES} />);
    expect(screen.getByRole("button", { name: "Crear y enviar al cliente" })).toBeDisabled();
    await user.click(screen.getByPlaceholderText("Buscar unidad..."));
    await user.click(await screen.findByRole("button", { name: "Sin número · Beto" }));
    expect(screen.getByRole("alert")).toHaveTextContent("Para emitir el recibo falta: Nº de unidad, modelo, email del cliente");
    expect(screen.getAllByText("Falta")).toHaveLength(3);
    expect(screen.getByRole("button", { name: "Crear y enviar al cliente" })).toBeDisabled();
  });

  it("avisa si la unidad ya tiene un recibo vigente", () => {
    render(<NuevoReciboForm unidades={UNIDADES} unidadInicial="u3" />);
    expect(screen.getByRole("alert")).toHaveTextContent("ya tiene el recibo REC-2026-009 sin anular");
    expect(screen.getByRole("button", { name: "Crear y enviar al cliente" })).toBeDisabled();
  });

  it("crea el recibo y va al detalle informando si salió el email", async () => {
    const user = userEvent.setup();
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ id: "r1", emailEnviado: true }) });
    vi.stubGlobal("fetch", fetchMock);
    render(<NuevoReciboForm unidades={UNIDADES} unidadInicial="u1" />);
    await user.type(screen.getByPlaceholderText(/Si hay algo para dejar asentado/), "Raspón leve");
    await user.click(screen.getByRole("button", { name: "Crear y enviar al cliente" }));
    const body = JSON.parse(fetchMock.mock.calls[0][1].body);
    expect(body).toMatchObject({ unidadId: "u1", lugarEntrega: "Ruta 34, Sunchales, Santa Fe", observaciones: "Raspón leve" });
    expect(body.fechaEntrega).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(push).toHaveBeenCalledWith("/admin/recibos/r1?email=enviado");

    fetchMock.mockResolvedValueOnce({ ok: true, json: async () => ({ id: "r2", emailEnviado: false }) });
    await user.click(screen.getByRole("button", { name: "Crear y enviar al cliente" }));
    expect(push).toHaveBeenLastCalledWith("/admin/recibos/r2?email=error");
  });

  it("muestra el error del servidor o de red", async () => {
    const user = userEvent.setup();
    vi.stubGlobal("fetch", vi.fn().mockResolvedValueOnce({ ok: false, json: async () => ({ error: "La unidad ya tiene el recibo X" }) }));
    render(<NuevoReciboForm unidades={UNIDADES} unidadInicial="u1" />);
    await user.click(screen.getByRole("button", { name: "Crear y enviar al cliente" }));
    expect(await screen.findByText("La unidad ya tiene el recibo X")).toBeInTheDocument();

    vi.stubGlobal("fetch", vi.fn().mockResolvedValueOnce({ ok: false, json: async () => { throw new Error("x"); } }));
    await user.click(screen.getByRole("button", { name: "Crear y enviar al cliente" }));
    expect(await screen.findByText("No pudimos crear el recibo.")).toBeInTheDocument();

    vi.stubGlobal("fetch", vi.fn().mockRejectedValueOnce(new Error("red")));
    await user.click(screen.getByRole("button", { name: "Crear y enviar al cliente" }));
    expect(await screen.findByText("No pudimos crear el recibo. Probá de nuevo.")).toBeInTheDocument();
  });

  it("cambiar de unidad recalcula el lugar; editar fecha y lugar", async () => {
    const user = userEvent.setup();
    render(<NuevoReciboForm unidades={UNIDADES} unidadInicial="u1" />);
    await user.click(screen.getByPlaceholderText("Buscar unidad..."));
    await user.click(await screen.findByRole("button", { name: "Sin número · Beto" }));
    expect(screen.getByPlaceholderText("Dirección, localidad, provincia")).toHaveValue("");
    await user.type(screen.getByPlaceholderText("Dirección, localidad, provincia"), "Rafaela");
    const fecha = document.querySelector('input[type="date"]') as HTMLInputElement;
    await user.clear(fecha);
    expect(fecha.value).toBe("");
  });
});
