import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, within, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

const m = vi.hoisted(() => ({ push: vi.fn(), refresh: vi.fn(), exito: vi.fn(), error: vi.fn() }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ push: m.push, refresh: m.refresh }) }));
vi.mock("@/components/admin/Toast", () => ({ useToast: () => ({ showSuccess: m.exito, showError: m.error }) }));

import EstadoBot from "../EstadoBot";
import ConfigBotForm, { type ConfigEditable } from "../ConfigBotForm";
import NuevoLeadWhatsapp from "../NuevoLeadWhatsapp";
import ContactosExcluidos from "../ContactosExcluidos";
import ImportarExcluidos, { MAX_VCF_BYTES, textoSalteados, textoResumen } from "../ImportarExcluidos";
import ChatLead from "../ChatLead";
import AccionesLead from "../AccionesLead";
import DatosLeadForm, { type DatosLead } from "../DatosLeadForm";
import TablaLeadsWhatsapp from "../TablaLeadsWhatsapp";
import { llamarApi } from "../api";
import { calcularGasto } from "@/lib/bot-whatsapp/config";
import { HORARIO_POR_DEFECTO } from "@/lib/bot-whatsapp/constantes";
import type { FilaLead } from "@/lib/bot-whatsapp/leads";

type Respuesta = { ok?: boolean; status?: number; json?: unknown };
let fetchMock: ReturnType<typeof vi.fn>;
function responder(...respuestas: Respuesta[]) {
  for (const r of respuestas) {
    fetchMock.mockResolvedValueOnce({ ok: r.ok ?? true, status: r.status ?? 200, json: async () => r.json ?? {} });
  }
}
const ultimoBody = () => JSON.parse(fetchMock.mock.calls.at(-1)![1].body);
const ultimaLlamada = () => [fetchMock.mock.calls.at(-1)![0], fetchMock.mock.calls.at(-1)![1].method];

beforeEach(() => {
  vi.clearAllMocks();
  fetchMock = vi.fn();
  vi.stubGlobal("fetch", fetchMock);
});
afterEach(() => vi.unstubAllGlobals());

describe("llamarApi", () => {
  it("manda JSON y devuelve la respuesta; sin body no manda headers", async () => {
    responder({ json: { ok: 1 } }, { json: { ok: 2 } });
    expect(await llamarApi("/x", "PATCH", { a: 1 })).toEqual({ ok: 1 });
    expect(fetchMock.mock.calls[0][1]).toMatchObject({ method: "PATCH", headers: { "Content-Type": "application/json" }, body: '{"a":1}' });
    await llamarApi("/x", "DELETE");
    expect(fetchMock.mock.calls[1][1]).toMatchObject({ method: "DELETE", headers: undefined, body: undefined });
  });

  it("error con el mensaje del servidor, el status y los datos; mensaje por defecto si no hay", async () => {
    responder({ ok: false, status: 409, json: { error: "Repetido", id: "l7" } });
    await expect(llamarApi("/x", "POST", {})).rejects.toMatchObject({ message: "Repetido", status: 409, datos: { error: "Repetido", id: "l7" } });
    fetchMock.mockResolvedValueOnce({ ok: false, status: 500, json: async () => { throw new Error("no json"); } });
    await expect(llamarApi("/x", "POST", {})).rejects.toMatchObject({ message: "No se pudo guardar", status: 500 });
  });
});

describe("EstadoBot", () => {
  const gasto = (costo: number) => calcularGasto("2026-11", costo, 5);

  it("administrador: prende el bot con confirmación visual y vuelve a pausarlo", async () => {
    responder({ json: {} }, { json: {} });
    render(<EstadoBot activo={false} gasto={gasto(0)} esAdmin />);
    const interruptor = screen.getByRole("switch", { name: "Activar el bot" });
    expect(interruptor).toHaveAttribute("aria-checked", "false");
    expect(screen.getByText("Bot pausado")).toBeInTheDocument();

    await userEvent.click(interruptor);
    expect(ultimoBody()).toEqual({ activo: true });
    expect(await screen.findByText("Bot activo")).toBeInTheDocument();
    expect(screen.getByRole("switch")).toHaveAttribute("aria-checked", "true");
    expect(m.exito).toHaveBeenCalledWith(expect.stringMatching(/^Bot activo/));
    expect(m.refresh).toHaveBeenCalled();

    await userEvent.click(screen.getByRole("switch", { name: "Pausar el bot" }));
    expect(ultimoBody()).toEqual({ activo: false });
    expect(await screen.findByText("Bot pausado")).toBeInTheDocument();
  });

  it("si el servidor lo rechaza, el interruptor no cambia y muestra el error", async () => {
    responder({ ok: false, status: 403, json: { error: "Solo un administrador puede hacer esto" } });
    render(<EstadoBot activo={false} gasto={gasto(0)} esAdmin />);
    await userEvent.click(screen.getByRole("switch"));
    await waitFor(() => expect(m.error).toHaveBeenCalledWith("Solo un administrador puede hacer esto"));
    expect(screen.getByRole("switch")).toHaveAttribute("aria-checked", "false");
  });

  it("vendedor: el interruptor está deshabilitado y lo explica", () => {
    render(<EstadoBot activo gasto={gasto(0)} esAdmin={false} />);
    expect(screen.getByRole("switch")).toBeDisabled();
    expect(screen.getByText("Solo un administrador puede prenderlo o pausarlo.")).toBeInTheDocument();
  });

  it.each([
    [1, "normal", "bg-[#D4B36A]", "20 % del tope mensual."],
    [4, "aviso", "bg-amber-400", "Pasó el 80 % del tope."],
    [6, "tope", "bg-red-500", "Llegó al tope mensual."],
  ])("gasto USD %d de 5: barra %s", (costo, nivel, color, texto) => {
    render(<EstadoBot activo={false} gasto={gasto(costo)} esAdmin />);
    const barra = screen.getByRole("progressbar", { name: "Gasto del mes" });
    expect(barra).toHaveAttribute("data-nivel", nivel);
    expect(barra.firstElementChild).toHaveClass(color);
    expect(barra).toHaveAttribute("aria-valuenow", String(Math.min(100, costo * 20)));
    expect(screen.getByText(texto)).toBeInTheDocument();
    expect(screen.getByText(`USD ${costo.toFixed(2)}`, { exact: false, selector: "p" })).toHaveTextContent(`USD ${costo.toFixed(2)} de USD 5.00`);
  });
});

describe("ConfigBotForm", () => {
  const INICIAL: ConfigEditable = {
    modoHorario: false,
    horarioAtencion: HORARIO_POR_DEFECTO,
    modoRespaldo: "MENSAJE_BIENVENIDA",
    mensajeBienvenida: "Hola",
    topeGastoMensualUsd: 5,
    emailAviso: null,
    whatsappAviso: "5493493667214",
    maxRespuestasPorLead: 6,
  };

  it("muestra el horario, edita todos los campos y guarda", async () => {
    responder({ json: {} });
    render(<ConfigBotForm inicial={INICIAL} />);
    expect(screen.getByDisplayValue("+54 9 3493 66-7214")).toBeInTheDocument();
    expect(screen.getByText("Cerrado")).toBeInTheDocument(); // domingo

    await userEvent.click(screen.getByLabelText("Responder solo fuera del horario de atención"));
    await userEvent.click(screen.getByRole("checkbox", { name: "Domingo" })); // abre el domingo
    await userEvent.click(screen.getByRole("checkbox", { name: "Sábado" })); // cierra el sábado
    const desdeLunes = screen.getByLabelText("Lunes: desde");
    await userEvent.clear(desdeLunes);
    await userEvent.type(desdeLunes, "09:30");
    const hastaLunes = screen.getByLabelText("Lunes: hasta");
    await userEvent.clear(hastaLunes);
    await userEvent.type(hastaLunes, "17:00");
    await userEvent.selectOptions(screen.getByLabelText("Si se alcanza el tope de gasto"), "NINGUNO");
    const mensaje = screen.getByLabelText("Mensaje de bienvenida");
    await userEvent.clear(mensaje);
    await userEvent.type(mensaje, "Ya te respondemos");
    const tope = screen.getByLabelText("Tope de gasto mensual (USD)");
    await userEvent.clear(tope);
    await userEvent.type(tope, "10");
    const max = screen.getByLabelText("Máximo de respuestas del bot por lead");
    await userEvent.clear(max);
    await userEvent.type(max, "8");
    await userEvent.type(screen.getByLabelText("Email de aviso (lead calificado o derivado)"), "aviso@movara.com.ar");
    await userEvent.clear(screen.getByLabelText("WhatsApp de aviso"));
    await userEvent.click(screen.getByRole("button", { name: "Guardar configuración" }));

    await waitFor(() => expect(m.exito).toHaveBeenCalledWith("Configuración guardada"));
    expect(ultimaLlamada()).toEqual(["/api/admin/bot-whatsapp/config", "PATCH"]);
    const body = ultimoBody();
    expect(body).toMatchObject({
      modoHorario: true,
      modoRespaldo: "NINGUNO",
      mensajeBienvenida: "Ya te respondemos",
      topeGastoMensualUsd: 10,
      maxRespuestasPorLead: 8,
      emailAviso: "aviso@movara.com.ar",
      whatsappAviso: null,
    });
    expect(body.horarioAtencion.lun).toEqual([{ desde: "09:30", hasta: "17:00" }]);
    expect(body.horarioAtencion.sab).toEqual([]);
    expect(body.horarioAtencion.dom).toEqual([{ desde: "09:00", hasta: "18:00" }]);
    expect(m.refresh).toHaveBeenCalled();
  });

  it("un día con dos franjas guardadas: editar una no toca la otra", async () => {
    responder({ json: {} });
    const conDosFranjas = { ...HORARIO_POR_DEFECTO, lun: [{ desde: "08:00", hasta: "12:00" }, { desde: "14:00", hasta: "18:00" }] };
    render(<ConfigBotForm inicial={{ ...INICIAL, horarioAtencion: conDosFranjas }} />);
    const [hastaManana] = screen.getAllByLabelText("Lunes: hasta");
    await userEvent.clear(hastaManana);
    await userEvent.type(hastaManana, "13:00");
    await userEvent.click(screen.getByRole("button", { name: "Guardar configuración" }));
    await waitFor(() => expect(m.exito).toHaveBeenCalled());
    expect(ultimoBody().horarioAtencion.lun).toEqual([{ desde: "08:00", hasta: "13:00" }, { desde: "14:00", hasta: "18:00" }]);
  });

  it("sin WhatsApp inicial; borrar el email lo manda en null; un error del servidor se muestra", async () => {
    responder({ ok: false, status: 400, json: { error: "Email inválido" } });
    render(<ConfigBotForm inicial={{ ...INICIAL, whatsappAviso: null, emailAviso: "x@y.com" }} />);
    expect(screen.getByLabelText("WhatsApp de aviso")).toHaveValue("");
    await userEvent.clear(screen.getByLabelText("Email de aviso (lead calificado o derivado)"));
    await userEvent.click(screen.getByRole("button", { name: "Guardar configuración" }));
    await waitFor(() => expect(m.error).toHaveBeenCalledWith("Email inválido"));
    expect(ultimoBody()).toMatchObject({ emailAviso: null, whatsappAviso: null });
  });
});

describe("NuevoLeadWhatsapp", () => {
  async function abrirYCompletar() {
    render(<NuevoLeadWhatsapp />);
    await userEvent.click(screen.getByRole("button", { name: "+ Agregar lead manual" }));
    await userEvent.type(screen.getByLabelText("Teléfono *"), "3493 667214");
    await userEvent.type(screen.getByLabelText("Nombre"), "Ana");
    await userEvent.type(screen.getByLabelText("Zona"), "Rafaela");
    await userEvent.type(screen.getByLabelText("Uso"), "Vivienda");
    await userEvent.selectOptions(screen.getByLabelText("Origen"), "RECOMENDACION");
    await userEvent.type(screen.getByLabelText("Detalle del origen (ej. quién lo recomendó)"), "Juan");
    await userEvent.type(screen.getByLabelText("Notas"), "Llamar a la tarde");
  }

  it("agrega el lead y abre su detalle", async () => {
    responder({ status: 201, json: { id: "l9" } });
    await abrirYCompletar();
    await userEvent.click(screen.getByRole("button", { name: "Guardar lead" }));
    await waitFor(() => expect(m.push).toHaveBeenCalledWith("/admin/bot-whatsapp/l9"));
    expect(ultimoBody()).toEqual({
      telefono: "3493 667214",
      nombre: "Ana",
      zona: "Rafaela",
      uso: "Vivienda",
      origen: "RECOMENDACION",
      origenDetalle: "Juan",
      notas: "Llamar a la tarde",
    });
    expect(m.exito).toHaveBeenCalledWith("Lead agregado");
    expect(screen.getByRole("button", { name: "+ Agregar lead manual" })).toBeInTheDocument();
  });

  it("teléfono repetido: ofrece abrir el lead existente; sin origen manda null", async () => {
    responder({ ok: false, status: 409, json: { error: "Ya hay un lead con ese teléfono", id: "l7" } });
    render(<NuevoLeadWhatsapp />);
    await userEvent.click(screen.getByRole("button", { name: "+ Agregar lead manual" }));
    await userEvent.type(screen.getByLabelText("Teléfono *"), "3493667214");
    await userEvent.click(screen.getByRole("button", { name: "Guardar lead" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("Ese teléfono ya tiene un lead.");
    expect(screen.getByRole("link", { name: "Abrirlo" })).toHaveAttribute("href", "/admin/bot-whatsapp/l7");
    expect(ultimoBody().origen).toBeNull();
    expect(m.error).toHaveBeenCalledWith("Ya hay un lead con ese teléfono");
  });

  it("otro error no ofrece link; Cancelar cierra el formulario", async () => {
    responder({ ok: false, status: 400, json: { error: "Teléfono inválido" } });
    render(<NuevoLeadWhatsapp />);
    await userEvent.click(screen.getByRole("button", { name: "+ Agregar lead manual" }));
    await userEvent.type(screen.getByLabelText("Teléfono *"), "12345678");
    await userEvent.click(screen.getByRole("button", { name: "Guardar lead" }));
    await waitFor(() => expect(m.error).toHaveBeenCalledWith("Teléfono inválido"));
    expect(screen.queryByRole("alert")).toBeNull();
    await userEvent.click(screen.getByRole("button", { name: "Cancelar" }));
    expect(screen.queryByRole("form", { name: "Agregar lead manual" })).toBeNull();
  });
});

describe("ContactosExcluidos", () => {
  const LISTA = [{ id: "e1", telefono: "5493493667214", etiqueta: "FAMILIA" }];

  it("lista y agrega (todos)", async () => {
    responder({ status: 201, json: {} });
    render(<ContactosExcluidos excluidos={LISTA} esAdmin={false} />);
    expect(screen.getByText("+54 9 3493 66-7214")).toBeInTheDocument();
    expect(screen.getByText("Familia", { selector: "li span span" })).toBeInTheDocument();
    await userEvent.type(screen.getByLabelText("Teléfono a excluir"), "3493 111111");
    await userEvent.selectOptions(screen.getByLabelText("Etiqueta"), "PROVEEDOR");
    await userEvent.click(screen.getByRole("button", { name: "Agregar" }));
    await waitFor(() => expect(m.exito).toHaveBeenCalledWith("Contacto excluido"));
    expect(ultimoBody()).toEqual({ telefono: "3493 111111", etiqueta: "PROVEEDOR" });
    expect(screen.getByLabelText("Teléfono a excluir")).toHaveValue("");
  });

  it("vendedor: no ve el botón de quitar", () => {
    render(<ContactosExcluidos excluidos={LISTA} esAdmin={false} />);
    expect(screen.queryByRole("button", { name: /Quitar/ })).toBeNull();
  });

  it("administrador: quitar pide confirmación con el modal propio; Cancelar no borra", async () => {
    responder({ json: {} });
    render(<ContactosExcluidos excluidos={LISTA} esAdmin />);
    await userEvent.click(screen.getByRole("button", { name: "Quitar +54 9 3493 66-7214" }));
    const modal = screen.getByRole("alertdialog", { name: "¿Quitar de excluidos?" });
    await userEvent.click(within(modal).getByRole("button", { name: "Cancelar" }));
    expect(fetchMock).not.toHaveBeenCalled();

    await userEvent.click(screen.getByRole("button", { name: "Quitar +54 9 3493 66-7214" }));
    await userEvent.click(within(screen.getByRole("alertdialog")).getByRole("button", { name: "Quitar" }));
    await waitFor(() => expect(m.exito).toHaveBeenCalledWith("Contacto quitado de la lista"));
    expect(ultimaLlamada()).toEqual(["/api/admin/bot-whatsapp/excluidos/e1", "DELETE"]);
  });

  it("errores al agregar y al quitar; lista vacía y etiqueta desconocida", async () => {
    responder({ ok: false, status: 409, json: { error: "Ese teléfono ya está excluido" } }, { ok: false, status: 403, json: { error: "Solo un administrador puede hacer esto" } });
    const { rerender } = render(<ContactosExcluidos excluidos={[]} esAdmin />);
    expect(screen.getByText("No hay contactos excluidos.")).toBeInTheDocument();
    await userEvent.type(screen.getByLabelText("Teléfono a excluir"), "3493667214");
    await userEvent.click(screen.getByRole("button", { name: "Agregar" }));
    await waitFor(() => expect(m.error).toHaveBeenCalledWith("Ese teléfono ya está excluido"));

    rerender(<ContactosExcluidos excluidos={[{ id: "e2", telefono: "15551234567", etiqueta: "VIEJA" }]} esAdmin />);
    expect(screen.getByText("VIEJA")).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Quitar +15551234567" }));
    await userEvent.click(within(screen.getByRole("alertdialog")).getByRole("button", { name: "Quitar" }));
    await waitFor(() => expect(m.error).toHaveBeenCalledWith("Solo un administrador puede hacer esto"));
  });
});

describe("ChatLead", () => {
  it("diferencia cliente, bot y equipo; muestra audios y adjuntos", () => {
    render(
      <ChatLead
        mensajes={[
          { id: "1", autor: "CLIENTE", tipo: "TEXTO", contenido: "Hola, quiero info", creadoEn: "2026-11-18T13:00:00Z" },
          { id: "2", autor: "BOT", tipo: "TEXTO", contenido: "¡Hola! ¿Para qué uso?", creadoEn: "2026-11-18T13:01:00Z" },
          { id: "3", autor: "EQUIPO", tipo: "TEXTO", contenido: "Soy Luciano", creadoEn: "2026-11-18T13:05:00Z" },
          { id: "4", autor: "CLIENTE", tipo: "AUDIO", contenido: "", creadoEn: "2026-11-18T13:06:00Z" },
          { id: "5", autor: "CLIENTE", tipo: "OTRO", contenido: "", creadoEn: "2026-11-18T13:07:00Z" },
          { id: "6", autor: "DESCONOCIDO", tipo: "TEXTO", contenido: "raro", creadoEn: "2026-11-18T13:08:00Z" },
        ]}
      />
    );
    const items = within(screen.getByRole("list", { name: "Conversación" })).getAllByRole("listitem");
    expect(items.map((i) => i.getAttribute("data-autor"))).toEqual(["CLIENTE", "BOT", "EQUIPO", "CLIENTE", "CLIENTE", "DESCONOCIDO"]);
    expect(items[0]).toHaveClass("justify-start");
    expect(items[1]).toHaveClass("justify-end");
    expect(items[1]).toHaveTextContent("Bot");
    expect(items[2]).toHaveTextContent("Equipo");
    expect(items[3]).toHaveTextContent("🎤 Audio");
    expect(items[4]).toHaveTextContent("📎 Adjunto");
    expect(items[5]).toHaveClass("justify-start"); // autor desconocido: como cliente
  });

  it("sin mensajes", () => {
    render(<ChatLead mensajes={[]} />);
    expect(screen.getByText("Todavía no hay mensajes.")).toBeInTheDocument();
  });
});

describe("AccionesLead", () => {
  it("Tomar control y Devolver al bot (los dos roles)", async () => {
    responder({ json: {} }, { json: {} });
    render(<AccionesLead id="l1" controlHumano={false} esAdmin={false} />);
    expect(screen.getByText("Lo atiende el bot.")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Borrar lead" })).toBeNull();

    await userEvent.click(screen.getByRole("button", { name: "Tomar control" }));
    expect(ultimoBody()).toEqual({ controlHumano: true });
    expect(await screen.findByText("Lo atiende el equipo: el bot no le responde.")).toBeInTheDocument();
    expect(m.exito).toHaveBeenCalledWith("Tomaste el control: el bot ya no le responde.");

    await userEvent.click(screen.getByRole("button", { name: "Devolver al bot" }));
    expect(ultimoBody()).toEqual({ controlHumano: false });
    expect(await screen.findByText("Lo atiende el bot.")).toBeInTheDocument();
    expect(m.exito).toHaveBeenCalledWith("Devuelto al bot.");
  });

  it("si falla, no cambia el estado", async () => {
    responder({ ok: false, status: 500, json: { error: "Falló" } });
    render(<AccionesLead id="l1" controlHumano esAdmin={false} />);
    await userEvent.click(screen.getByRole("button", { name: "Devolver al bot" }));
    await waitFor(() => expect(m.error).toHaveBeenCalledWith("Falló"));
    expect(screen.getByText("Lo atiende el equipo: el bot no le responde.")).toBeInTheDocument();
  });

  it("administrador: borrar pide confirmación y vuelve al listado", async () => {
    responder({ json: {} }, { ok: false, status: 404, json: { error: "El lead no existe" } });
    render(<AccionesLead id="l1" controlHumano={false} esAdmin />);
    await userEvent.click(screen.getByRole("button", { name: "Borrar lead" }));
    await userEvent.click(within(screen.getByRole("alertdialog", { name: "¿Borrar este lead?" })).getByRole("button", { name: "Cancelar" }));
    expect(fetchMock).not.toHaveBeenCalled();

    await userEvent.click(screen.getByRole("button", { name: "Borrar lead" }));
    await userEvent.click(within(screen.getByRole("alertdialog")).getByRole("button", { name: "Borrar" }));
    await waitFor(() => expect(m.push).toHaveBeenCalledWith("/admin/bot-whatsapp"));
    expect(ultimaLlamada()).toEqual(["/api/admin/bot-whatsapp/leads/l1", "DELETE"]);

    await userEvent.click(screen.getByRole("button", { name: "Borrar lead" }));
    await userEvent.click(within(screen.getByRole("alertdialog")).getByRole("button", { name: "Borrar" }));
    await waitFor(() => expect(m.error).toHaveBeenCalledWith("El lead no existe"));
  });
});

describe("DatosLeadForm", () => {
  const INICIAL: DatosLead = {
    nombre: "Ana",
    uso: "",
    zona: "",
    terreno: "",
    personas: "",
    plazo: "",
    origen: "",
    origenDetalle: "",
    estado: "NUEVO",
    notas: "",
    proximoContacto: "",
  };

  it("edita calificación, estado, origen, notas y próximo contacto", async () => {
    responder({ json: {} });
    render(<DatosLeadForm id="l1" inicial={INICIAL} />);
    await userEvent.selectOptions(screen.getByLabelText("Estado"), "CALIFICADO");
    await userEvent.type(screen.getByLabelText("Próximo contacto"), "2026-12-01");
    for (const [campo, valor] of [["Zona", "Rafaela"], ["Uso", "Vivienda"], ["Terreno", "Propio"], ["Personas", "4"], ["Plazo", "3 meses"], ["Detalle del origen", "Instagram"]]) {
      await userEvent.type(screen.getByLabelText(campo), valor);
    }
    await userEvent.selectOptions(screen.getByLabelText("Origen"), "INSTAGRAM_FACEBOOK");
    await userEvent.type(screen.getByLabelText("Notas internas"), "Quiere visitar");
    await userEvent.click(screen.getByRole("button", { name: "Guardar datos" }));
    await waitFor(() => expect(m.exito).toHaveBeenCalledWith("Datos guardados"));
    expect(ultimaLlamada()).toEqual(["/api/admin/bot-whatsapp/leads/l1", "PATCH"]);
    expect(ultimoBody()).toMatchObject({
      estado: "CALIFICADO",
      proximoContacto: "2026-12-01",
      zona: "Rafaela",
      plazo: "3 meses",
      origen: "INSTAGRAM_FACEBOOK",
      notas: "Quiere visitar",
    });
    expect(m.refresh).toHaveBeenCalled();
  });

  it("sin origen ni fecha los manda en null; un error se muestra", async () => {
    responder({ ok: false, status: 400, json: { error: "Fecha inválida" } });
    render(<DatosLeadForm id="l1" inicial={INICIAL} />);
    await userEvent.click(screen.getByRole("button", { name: "Guardar datos" }));
    await waitFor(() => expect(m.error).toHaveBeenCalledWith("Fecha inválida"));
    expect(ultimoBody()).toMatchObject({ origen: null, proximoContacto: null });
  });
});

describe("TablaLeadsWhatsapp", () => {
  const LEAD: FilaLead = {
    id: "l1",
    nombre: "Ana",
    telefono: "5493493667214",
    zona: "Rafaela",
    uso: "Vivienda",
    estado: "CALIFICADO",
    origen: "WEB",
    controlHumano: true,
    ultimoMensajeEn: new Date("2026-11-18T13:00:00Z"),
    proximoContacto: new Date("2026-12-01T12:00:00Z"),
  };

  it("tabla y tarjetas con nombre, teléfono, zona, uso, estado, origen y fechas, con link al detalle", () => {
    render(<TablaLeadsWhatsapp leads={[LEAD, { ...LEAD, id: "l2", nombre: null, zona: null, uso: null, origen: null, controlHumano: false, ultimoMensajeEn: null, proximoContacto: null, estado: "VIEJO" }]} />);
    const tabla = screen.getByRole("table");
    const filas = within(tabla).getAllByRole("row");
    expect(within(filas[0]).getAllByRole("columnheader").map((c) => c.textContent)).toEqual([
      "Nombre",
      "Teléfono",
      "Zona",
      "Uso",
      "Estado",
      "Origen",
      "Último mensaje",
      "Próximo contacto",
    ]);
    expect(filas[1]).toHaveTextContent("Ana(equipo)+54 9 3493 66-7214RafaelaViviendaCalificadoWeb");
    expect(within(filas[1]).getByRole("link", { name: "Ana" })).toHaveAttribute("href", "/admin/bot-whatsapp/l1");
    expect(filas[2]).toHaveTextContent("Sin nombre");
    expect(filas[2]).toHaveTextContent("VIEJO");
    expect(within(filas[2]).getAllByRole("cell")[5]).toHaveTextContent("—");
    const tarjetas = within(screen.getByRole("list", { name: "Leads de WhatsApp" })).getAllByRole("link");
    expect(tarjetas[0]).toHaveTextContent("Rafaela · Vivienda · Web");
    expect(tarjetas[1]).toHaveTextContent("Sin datos");
    expect(tarjetas[1]).toHaveTextContent("Último mensaje: — · Próximo contacto: —");
  });

  it("un origen que ya no está en la lista se muestra tal cual", () => {
    render(<TablaLeadsWhatsapp leads={[{ ...LEAD, origen: "FERIA_2025" }]} />);
    expect(within(screen.getByRole("table")).getByText("FERIA_2025")).toBeInTheDocument();
  });

  it("sin leads", () => {
    render(<TablaLeadsWhatsapp leads={[]} />);
    expect(screen.getByText("No hay leads con ese filtro.")).toBeInTheDocument();
  });
});

describe("ImportarExcluidos", () => {
  const VCF = ["BEGIN:VCARD", "FN:Sofía Martínez", "TEL:+54 9 3493 66-7214", "TEL:3493 111111", "END:VCARD", "BEGIN:VCARD", "FN:Juan", "TEL:667214", "END:VCARD"].join("\r\n");
  const archivoVcf = (texto = VCF) => new File([texto], "contactos.vcf", { type: "text/vcard" });
  const SIN = { completados: 0, caracteristica: "3493" };
  const RESUMEN = { agregar: 1, saltear: 2, repetidos: 0, yaExcluidos: 1, invalidos: 1, ...SIN };
  const subir = (f: File) => userEvent.upload(screen.getByLabelText("Archivo de contactos (.vcf)"), f);

  it("solo el administrador ve el botón en la lista de excluidos", () => {
    const { rerender } = render(<ContactosExcluidos excluidos={[]} esAdmin={false} />);
    expect(screen.queryByRole("button", { name: "Importar excluidos" })).toBeNull();
    rerender(<ContactosExcluidos excluidos={[]} esAdmin />);
    expect(screen.getByRole("button", { name: "Importar excluidos" })).toBeInTheDocument();
  });

  it("el botón abre el selector de archivos", async () => {
    render(<ImportarExcluidos />);
    const input = screen.getByLabelText("Archivo de contactos (.vcf)") as HTMLInputElement;
    const click = vi.spyOn(input, "click");
    await userEvent.click(screen.getByRole("button", { name: "Importar excluidos" }));
    expect(click).toHaveBeenCalled();
    expect(input).toHaveAttribute("accept", ".vcf,text/vcard,text/x-vcard");
  });

  it("lee el archivo en el navegador, muestra el resumen y al confirmar importa", async () => {
    responder({ json: { resumen: RESUMEN, agregados: 0 } }, { json: { resumen: RESUMEN, agregados: 1 } });
    render(<ImportarExcluidos />);
    await subir(archivoVcf());
    const modal = await screen.findByRole("alertdialog", { name: "¿Importar excluidos?" });
    expect(modal).toHaveTextContent("Se agrega 1 contacto, con su nombre como etiqueta. Se saltean 2: 1 que ya estaba excluido, 1 sin teléfono válido.");
    const contactos = [
      { telefono: "+54 9 3493 66-7214", nombre: "Sofía Martínez" },
      { telefono: "3493 111111", nombre: "Sofía Martínez" },
      { telefono: "667214", nombre: "Juan" },
    ];
    expect(ultimaLlamada()).toEqual(["/api/admin/bot-whatsapp/excluidos/importar", "POST"]);
    expect(ultimoBody()).toEqual({ contactos, caracteristica: "3493", confirmar: false });
    await userEvent.click(within(modal).getByRole("button", { name: "Importar" }));
    await waitFor(() => expect(m.exito).toHaveBeenCalledWith("1 contacto agregado a excluidos"));
    expect(ultimoBody()).toEqual({ contactos, caracteristica: "3493", confirmar: true });
    expect(m.refresh).toHaveBeenCalled();
  });

  it("Cancelar no importa; plural en el mensaje de éxito", async () => {
    const r = { agregar: 3, saltear: 0, repetidos: 0, yaExcluidos: 0, invalidos: 0, ...SIN };
    responder({ json: { resumen: r, agregados: 0 } }, { json: { resumen: r, agregados: 0 } }, { json: { resumen: r, agregados: 3 } });
    render(<ImportarExcluidos />);
    await subir(archivoVcf());
    const modal = await screen.findByRole("alertdialog");
    expect(modal).toHaveTextContent("Se agregan 3 contactos, con su nombre como etiqueta. No se saltea ninguno.");
    await userEvent.click(within(modal).getByRole("button", { name: "Cancelar" }));
    expect(screen.queryByRole("alertdialog")).toBeNull();
    expect(fetchMock).toHaveBeenCalledTimes(1);
    await subir(archivoVcf());
    await userEvent.click(within(await screen.findByRole("alertdialog")).getByRole("button", { name: "Importar" }));
    await waitFor(() => expect(m.exito).toHaveBeenCalledWith("3 contactos agregados a excluidos"));
  });

  it("sin contactos nuevos, archivo vacío, demasiado grande o error del servidor: avisa y no importa", async () => {
    responder(
      { json: { resumen: { agregar: 0, saltear: 2, repetidos: 1, yaExcluidos: 1, invalidos: 0, ...SIN }, agregados: 0 } },
      { ok: false, status: 403, json: { error: "Solo un administrador puede hacer esto" } },
    );
    render(<ImportarExcluidos />);
    await subir(archivoVcf());
    await waitFor(() =>
      expect(m.error).toHaveBeenCalledWith("No hay contactos nuevos para agregar. Se saltean 2: 1 repetido en el archivo, 1 que ya estaba excluido."),
    );
    await subir(archivoVcf("BEGIN:VCARD\nFN:Sin teléfono\nEND:VCARD"));
    await waitFor(() => expect(m.error).toHaveBeenCalledWith("El archivo no tiene contactos con teléfono"));
    const grande = archivoVcf();
    Object.defineProperty(grande, "size", { value: MAX_VCF_BYTES + 1 });
    await subir(grande);
    expect(m.error).toHaveBeenCalledWith("El archivo es demasiado grande (máximo 30 MB)");
    await subir(archivoVcf());
    await waitFor(() => expect(m.error).toHaveBeenCalledWith("Solo un administrador puede hacer esto"));
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(screen.queryByRole("alertdialog")).toBeNull();
  });

  it("error al confirmar", async () => {
    responder({ json: { resumen: RESUMEN, agregados: 0 } }, { ok: false, status: 429, json: { error: "Demasiados cambios seguidos. Esperá un minuto." } });
    render(<ImportarExcluidos />);
    await subir(archivoVcf());
    await userEvent.click(within(await screen.findByRole("alertdialog")).getByRole("button", { name: "Importar" }));
    await waitFor(() => expect(m.error).toHaveBeenCalledWith("Demasiados cambios seguidos. Esperá un minuto."));
    expect(m.refresh).not.toHaveBeenCalled();
  });

  it("característica por defecto: precargada con 3493, se puede cambiar y el resumen cuenta los completados", async () => {
    const r = { agregar: 2, saltear: 0, repetidos: 0, yaExcluidos: 0, invalidos: 0, completados: 1, caracteristica: "3492" };
    responder({ json: { resumen: r, agregados: 0 } }, { json: { resumen: r, agregados: 2 } });
    render(<ImportarExcluidos />);
    const campo = screen.getByLabelText("Característica por defecto");
    expect(campo).toHaveValue("3493");
    await userEvent.clear(campo);
    await userEvent.type(campo, "3492");
    await subir(archivoVcf());
    const modal = await screen.findByRole("alertdialog");
    expect(modal).toHaveTextContent("Se agregan 2 contactos, con su nombre como etiqueta. De esos, 1 se completó con la característica 3492. No se saltea ninguno.");
    expect(ultimoBody()).toMatchObject({ caracteristica: "3492", confirmar: false });
    await userEvent.clear(campo); // cambiarla después del resumen no cambia lo que se confirma
    await userEvent.click(within(modal).getByRole("button", { name: "Importar" }));
    await waitFor(() => expect(m.exito).toHaveBeenCalledWith("2 contactos agregados a excluidos"));
    expect(ultimoBody()).toMatchObject({ caracteristica: "3492", confirmar: true });
  });

  it("textoResumen: plural de completados", () => {
    expect(textoResumen({ agregar: 1, saltear: 0, repetidos: 0, yaExcluidos: 0, invalidos: 0, completados: 5, caracteristica: "11" })).toBe(
      "Se agrega 1 contacto, con su nombre como etiqueta. De esos, 5 se completaron con la característica 11. No se saltea ninguno.",
    );
  });

  it("textoSalteados: singular y plural de cada motivo", () => {
    expect(textoSalteados({ agregar: 0, saltear: 1, repetidos: 0, yaExcluidos: 0, invalidos: 1, ...SIN })).toBe("Se saltea 1: 1 sin teléfono válido.");
    expect(textoSalteados({ agregar: 0, saltear: 6, repetidos: 2, yaExcluidos: 3, invalidos: 1, ...SIN })).toBe(
      "Se saltean 6: 2 repetidos en el archivo, 3 que ya estaban excluidos, 1 sin teléfono válido.",
    );
  });
});
