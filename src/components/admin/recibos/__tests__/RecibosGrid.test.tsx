import { describe, it, expect, vi } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

const push = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ push }) }));

import RecibosGrid from "../RecibosGrid";
import type { FilaRecibo } from "@/lib/recibos/filtros";

const fila = (o: Partial<FilaRecibo>): FilaRecibo => ({
  id: "r1",
  numeroRecibo: "REC-2026-001",
  estado: "pendiente",
  clienteId: "c1",
  clienteNombre: "Ana García",
  unidadId: "u1",
  numeroUnidad: "MOV-UNIDAD-2026-001",
  modelo: "Flex 38",
  fechaEntrega: "2026-10-08T00:00:00.000Z",
  confirmadoAt: null,
  ...o,
});

const FILAS = [
  fila({}),
  fila({ id: "r2", numeroRecibo: "REC-2026-002", estado: "confirmado", clienteId: "c2", clienteNombre: "Beto Díaz", unidadId: "u2", numeroUnidad: "MOV-UNIDAD-2026-002", fechaEntrega: "2026-08-01T00:00:00.000Z" }),
  fila({ id: "r3", numeroRecibo: "REC-2026-003", estado: "anulado" }),
];

const filasVisibles = () => screen.getAllByRole("row").slice(1);

describe("RecibosGrid", () => {
  it("muestra las columnas y un chip por estado", () => {
    render(<RecibosGrid filas={FILAS} ahora="2026-10-15T12:00:00.000Z" />);
    expect(filasVisibles()).toHaveLength(3);
    const primera = within(filasVisibles()[0]);
    expect(primera.getByText("REC-2026-001")).toHaveAttribute("href", "/admin/recibos/r1");
    expect(primera.getByText("Ana García")).toBeInTheDocument();
    expect(primera.getByText("MOV-UNIDAD-2026-001")).toBeInTheDocument();
    expect(primera.getByText("Flex 38")).toBeInTheDocument();
    expect(primera.getByText("08/10/2026")).toBeInTheDocument();
    expect(primera.getByText("Pendiente")).toBeInTheDocument();
    expect(within(filasVisibles()[1]).getByText("Confirmado")).toBeInTheDocument();
    expect(within(filasVisibles()[2]).getByText("Anulado")).toBeInTheDocument();
  });

  it("filtra por estado y por período, y 'Limpiar filtros' vuelve a todo", async () => {
    const user = userEvent.setup();
    render(<RecibosGrid filas={FILAS} ahora="2026-10-15T12:00:00.000Z" />);
    await user.selectOptions(screen.getByLabelText("Filtrar por estado"), "confirmado");
    expect(filasVisibles()).toHaveLength(1);
    await user.selectOptions(screen.getByLabelText("Filtrar por estado"), "todos");
    await user.selectOptions(screen.getByLabelText("Filtrar por período"), "mes_actual");
    expect(filasVisibles().map((r) => within(r).getAllByRole("cell")[0].textContent)).toEqual(["REC-2026-001", "REC-2026-003"]);
    await user.click(screen.getByRole("button", { name: "Limpiar filtros" }));
    expect(filasVisibles()).toHaveLength(3);
  });

  it("filtra por cliente y por unidad con los buscadores", async () => {
    const user = userEvent.setup();
    render(<RecibosGrid filas={FILAS} ahora="2026-10-15T12:00:00.000Z" />);
    await user.click(screen.getByPlaceholderText("Cliente..."));
    await user.click(await screen.findByRole("button", { name: "Beto Díaz" }));
    expect(filasVisibles()).toHaveLength(1);
    await user.click(screen.getByRole("button", { name: "Limpiar filtros" }));
    await user.click(screen.getByPlaceholderText("Unidad..."));
    await user.click(await screen.findByRole("button", { name: "MOV-UNIDAD-2026-001 · Ana García" }));
    expect(filasVisibles()).toHaveLength(2);
  });

  it("sin coincidencias o sin recibos muestra el mensaje", async () => {
    const user = userEvent.setup();
    const { unmount } = render(<RecibosGrid filas={FILAS} ahora="2026-10-15T12:00:00.000Z" />);
    await user.selectOptions(screen.getByLabelText("Filtrar por período"), "mes_anterior");
    await user.selectOptions(screen.getByLabelText("Filtrar por estado"), "anulado");
    expect(screen.getByText("Ningún recibo coincide con los filtros.")).toBeInTheDocument();
    unmount();
    render(<RecibosGrid filas={[]} ahora="2026-10-15T12:00:00.000Z" />);
    expect(screen.getByText("Todavía no hay recibos.")).toBeInTheDocument();
  });

  it("click en la fila abre el detalle; el link no navega dos veces", async () => {
    const user = userEvent.setup();
    render(<RecibosGrid filas={FILAS} ahora="2026-10-15T12:00:00.000Z" />);
    await user.click(within(filasVisibles()[1]).getByText("Beto Díaz"));
    expect(push).toHaveBeenCalledWith("/admin/recibos/r2");
    push.mockClear();
    await user.click(screen.getByText("REC-2026-001"));
    expect(push).not.toHaveBeenCalled();
  });
});
