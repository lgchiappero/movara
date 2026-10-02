import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }) }));
const { mockExportar } = vi.hoisted(() => ({ mockExportar: vi.fn() }));
vi.mock("@/lib/admin/exportar-excel", () => ({ exportarExcel: mockExportar }));

import { ToastProvider } from "@/components/admin/Toast";
import LogisticaGrid from "./LogisticaGrid";
import type { CostoLogisticaRow } from "@/lib/cobranza/logistica";
import type { AccionesLogistica } from "./useAccionesLogistica";

const HOY = new Date("2026-10-07T12:00:00");

const base: CostoLogisticaRow = {
  id: "c1",
  envioId: "e1",
  envioNumeroPI: "PI-001",
  envioContenedor: "MSCU1111111",
  concepto: "flete",
  descripcion: "Shanghai → BA",
  moneda: "USD",
  importe: 4200,
  fecha: "2026-09-10T00:00:00.000Z",
  estado: "pagado",
  comprobanteUrl: null,
  comprobanteSignedUrl: null,
  notas: "Pagado por banco",
  prorrateado: true,
  prorrateos: [{ unidadId: "u1", unidadNumero: "MOV-1", importe: 4200 }],
  createdAt: "2026-09-10T00:00:00.000Z",
};
const COSTOS: CostoLogisticaRow[] = [
  base,
  { ...base, id: "c2", concepto: "vep", descripcion: null, moneda: "ARS", importe: 150000, estado: "pendiente", fecha: "2026-10-02T00:00:00.000Z", notas: null, prorrateado: false, prorrateos: [] },
  { ...base, id: "c3", envioId: "e2", envioNumeroPI: "PI-002", envioContenedor: "TGHU2222222", concepto: "aduana", descripcion: null, importe: 900, fecha: "2026-10-01T00:00:00.000Z", prorrateado: false, prorrateos: [] },
];
const ENVIOS = [
  { id: "e1", numeroPI: "PI-001", numeroContenedor: "MSCU1111111", cantidadUnidades: 1 },
  { id: "e2", numeroPI: "PI-002", numeroContenedor: "TGHU2222222", cantidadUnidades: 2 },
];

function acciones(): AccionesLogistica {
  return { abrirNuevo: vi.fn(), abrirEditar: vi.fn(), eliminar: vi.fn(async () => ({ ok: true })) };
}

function renderGrid(costos = COSTOS) {
  const user = userEvent.setup();
  const a = acciones();
  render(
    <ToastProvider>
      <LogisticaGrid costos={costos} envios={ENVIOS} rol="admin" acciones={a} ahora={HOY} />
    </ToastProvider>
  );
  return { user, acciones: a };
}

const conceptos = () => screen.getAllByRole("row").slice(1).map((r) => (r as HTMLTableRowElement).cells[2].textContent);

describe("LogisticaGrid — tab 'Logística internacional'", () => {
  beforeEach(() => mockExportar.mockClear());

  it("lista todo, del más reciente al más viejo", () => {
    renderGrid();
    expect(conceptos()).toEqual(["VEP", "Aduana", "Flete marítimoShanghai → BAProrrateado ÷1"]);
  });

  it("filtro por concepto (los 7 de logística) y por estado", async () => {
    const { user } = renderGrid();
    const concepto = screen.getByLabelText("Filtrar por concepto") as HTMLSelectElement;
    expect(Array.from(concepto.options).map((o) => o.text)).toEqual([
      "Todos los conceptos",
      "Flete marítimo",
      "Seguro de carga",
      "Aduana",
      "Despachante",
      "Gastos portuarios",
      "VEP",
      "Otro",
    ]);
    await user.selectOptions(concepto, "aduana");
    expect(conceptos()).toEqual(["Aduana"]);
    await user.selectOptions(concepto, "todos");
    const estado = screen.getByLabelText("Filtrar por estado") as HTMLSelectElement;
    expect(Array.from(estado.options).map((o) => o.text)).toEqual(["Todos los estados", "Pendiente", "Pagado"]);
    await user.selectOptions(estado, "pendiente");
    expect(conceptos()).toEqual(["VEP"]);
  });

  it("filtro por período (por fecha del costo)", async () => {
    const { user } = renderGrid();
    await user.selectOptions(screen.getByLabelText("Filtrar por período"), "mes_actual");
    expect(conceptos()).toEqual(["VEP", "Aduana"]);
    await user.selectOptions(screen.getByLabelText("Filtrar por período"), "mes_anterior");
    expect(conceptos()).toEqual(["Flete marítimoShanghai → BAProrrateado ÷1"]);
  });

  it("filtro por envío con búsqueda por PI o contenedor, y vuelta a 'Todos los envíos'", async () => {
    const { user } = renderGrid();
    const selector = screen.getByPlaceholderText("Envío: buscar PI o contenedor...");
    await user.click(selector);
    await user.type(selector, "TGHU");
    await waitFor(() => expect(screen.getAllByRole("button", { name: /PI-002 · TGHU2222222/ })).toHaveLength(1));
    await user.click(screen.getByRole("button", { name: /PI-002/ }));
    expect(conceptos()).toEqual(["Aduana"]);
    await user.click(document.body);
    await user.click(selector);
    await user.click(screen.getByRole("button", { name: "Todos los envíos" }));
    expect(conceptos()).toHaveLength(3);
  });

  it("buscador por PI o contenedor; sin coincidencias muestra el aviso", async () => {
    const { user } = renderGrid();
    await user.type(screen.getByLabelText("Buscar"), "mscu");
    await waitFor(() => expect(conceptos()).toEqual(["VEP", "Flete marítimoShanghai → BAProrrateado ÷1"]));
    await user.clear(screen.getByLabelText("Buscar"));
    await user.type(screen.getByLabelText("Buscar"), "PI-999");
    await waitFor(() => expect(screen.getByText("Ningún costo coincide con los filtros.")).toBeInTheDocument());
  });

  it("Exportar Excel descarga exactamente lo filtrado, con las columnas pedidas", async () => {
    const { user } = renderGrid();
    await user.selectOptions(screen.getByLabelText("Filtrar por concepto"), "flete");
    await user.click(screen.getByRole("button", { name: "Exportar Excel" }));
    const [filas, hoja, archivo] = mockExportar.mock.calls[0];
    expect(hoja).toBe("Logística internacional");
    expect(archivo).toBe("logistica-internacional.xlsx");
    expect(filas).toEqual([
      {
        "Envío (PI)": "PI-001",
        Contenedor: "MSCU1111111",
        Concepto: "Flete marítimo",
        Descripción: "Shanghai → BA",
        Moneda: "USD",
        Importe: 4200,
        Estado: "Pagado",
        Fecha: "10/09/2026",
        Prorrateado: "Sí",
        Notas: "Pagado por banco",
      },
    ]);
  });

  it("exporta los pendientes, sin prorrateo, sin PI ni contenedor", async () => {
    const { user } = renderGrid([{ ...COSTOS[1], envioNumeroPI: null, envioContenedor: null, concepto: "raro" }]);
    await user.click(screen.getByRole("button", { name: "Exportar Excel" }));
    expect(mockExportar.mock.calls[0][0][0]).toMatchObject({
      "Envío (PI)": "Sin PI",
      Contenedor: "",
      Concepto: "raro",
      Descripción: "",
      Estado: "Pendiente",
      Prorrateado: "No",
      Notas: "",
    });
  });

  it("'+ Nuevo costo de logística'", async () => {
    const { user, acciones: a } = renderGrid();
    await user.click(screen.getByRole("button", { name: "+ Nuevo costo de logística" }));
    expect(a.abrirNuevo).toHaveBeenCalledWith();
  });

  it("sin costos cargados muestra el vacío de la tabla", () => {
    renderGrid([]);
    expect(screen.getByText("Todavía no hay costos de logística internacional cargados.")).toBeInTheDocument();
  });
});
