import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

const trackSchedule = vi.fn();
vi.mock("@/lib/meta-pixel", () => ({ trackSchedule: () => trackSchedule() }));

import AgendaBooking from "../AgendaBooking";

const pad = (n: number) => String(n).padStart(2, "0");
const hoy = new Date();
const ultimoDia = new Date(hoy.getFullYear(), hoy.getMonth() + 1, 0).getDate();
const DIA = `${hoy.getFullYear()}-${pad(hoy.getMonth() + 1)}-${pad(ultimoDia)}`;

let respuestaCita: () => Promise<unknown>;

beforeEach(() => {
  trackSchedule.mockClear();
  vi.stubGlobal(
    "fetch",
    vi.fn((url: string) => {
      if (url.includes("disponibilidad?anio=")) return Promise.resolve({ json: async () => ({ dias: { [DIA]: "disponible" } }) });
      if (url.includes("disponibilidad?fecha=")) return Promise.resolve({ json: async () => ({ habilitados: ["10:00"], ocupados: [] }) });
      return respuestaCita();
    })
  );
});
afterEach(() => vi.unstubAllGlobals());

async function confirmar() {
  const user = userEvent.setup();
  render(<AgendaBooking />);
  await user.click(await screen.findByRole("button", { name: String(ultimoDia) }));
  await user.click(await screen.findByRole("button", { name: "10:00" }));
  await user.type(screen.getByLabelText(/Nombre completo/), "Ana Pérez");
  await user.type(screen.getByLabelText(/Email/), "ana@gmail.com");
  await user.type(screen.getByLabelText(/Teléfono/), "+54 9 11 5555 4444");
  await user.click(screen.getByRole("button", { name: "Confirmar visita" }));
}

describe("AgendaBooking — Schedule", () => {
  it("manda un solo Schedule cuando el servidor confirma la visita", async () => {
    respuestaCita = async () => ({ ok: true, status: 201, json: async () => ({ id: "c1" }) });
    await confirmar();
    await vi.waitFor(() => expect(trackSchedule).toHaveBeenCalledTimes(1));
  });

  it.each([
    ["cita duplicada", { ok: false, status: 409, json: async () => ({ code: "cita-duplicada" }) }],
    ["error del servidor", { ok: false, status: 500, json: async () => ({ error: "x" }) }],
  ])("sin Schedule si hay %s", async (_, res) => {
    respuestaCita = async () => res;
    await confirmar();
    await vi.waitFor(() => expect(fetch).toHaveBeenCalledWith("/api/agenda/citas", expect.anything()));
    await vi.waitFor(() => expect(screen.queryByText("Confirmando...")).toBeNull());
    expect(trackSchedule).not.toHaveBeenCalled();
  });
});
