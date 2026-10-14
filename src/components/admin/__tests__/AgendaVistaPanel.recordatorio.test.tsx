import { describe, it, expect, vi } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: vi.fn(), push: vi.fn() }) }));
vi.mock("@/components/admin/Toast", () => ({ useToast: () => ({ showSuccess: vi.fn(), showError: vi.fn() }) }));

import AgendaVistaPanel, { type CitaAdmin } from "../AgendaVistaPanel";

const cita = (id: string, nombre: string, recordatorioNoEnviado?: boolean): CitaAdmin => ({
  id,
  fechaKey: "2026-10-14",
  horario: "10:00",
  estado: "confirmada",
  tipoCliente: "particular",
  nombre,
  email: `${id}@example.com`,
  telefono: "123",
  razonSocial: null,
  consulta: "",
  canceladaPor: null,
  motivoCancelacion: null,
  recordatorioNoEnviado,
});

const CITAS = [cita("c1", "Ana", true), cita("c2", "Beto")];

describe("AgendaVistaPanel — Recordatorio no enviado", () => {
  it("vista lista: etiqueta solo en la cita cuyo recordatorio no salió, y en su detalle", async () => {
    render(<AgendaVistaPanel anio={2026} mesIdx0={9} vista="lista" citasDelMes={[]} todasLasCitas={CITAS} rol="admin" />);
    const [, filaAna, filaBeto] = screen.getAllByRole("row");
    expect(within(filaAna).getByText("Recordatorio no enviado")).toBeInTheDocument();
    expect(within(filaBeto).queryByText("Recordatorio no enviado")).not.toBeInTheDocument();

    await userEvent.click(filaAna);
    expect(screen.getAllByText("Recordatorio no enviado")).toHaveLength(2);
    expect(screen.getByText("Avisale por WhatsApp o por teléfono.")).toBeInTheDocument();
  });

  it("vista calendario: marca la cita con '!' y lo dice en el título", () => {
    render(<AgendaVistaPanel anio={2026} mesIdx0={9} vista="calendario" citasDelMes={CITAS} todasLasCitas={[]} rol="admin" />);
    const ana = screen.getByTitle("10:00 — Ana — Recordatorio no enviado");
    expect(within(ana).getByLabelText("Recordatorio no enviado")).toBeInTheDocument();
    expect(screen.getByTitle("10:00 — Beto")).toBeInTheDocument();
  });
});
