import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, within } from "@testing-library/react";

const m = vi.hoisted(() => ({
  sesion: vi.fn(),
  config: vi.fn(),
  gasto: vi.fn(),
  listar: vi.fn(),
  excluidos: vi.fn(),
  lead: vi.fn(),
  coincidencias: vi.fn(),
  notFound: vi.fn(() => {
    throw new Error("NEXT_NOT_FOUND");
  }),
}));

vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }), notFound: m.notFound }));
vi.mock("@/components/admin/Toast", () => ({ useToast: () => ({ showSuccess: vi.fn(), showError: vi.fn() }) }));
vi.mock("@/lib/admin/current-user", () => ({ getAdminUser: m.sesion }));
vi.mock("@/lib/bot-whatsapp/config", async (orig) => ({
  ...(await orig<typeof import("@/lib/bot-whatsapp/config")>()),
  obtenerConfigBot: m.config,
  gastoDelMes: m.gasto,
}));
vi.mock("@/lib/bot-whatsapp/leads", () => ({ listarLeads: m.listar }));
vi.mock("@/lib/bot-whatsapp/coincidencias", () => ({ buscarCoincidencias: m.coincidencias }));
vi.mock("@/lib/db", () => ({
  db: { contactoExcluido: { findMany: m.excluidos }, leadWhatsapp: { findUnique: m.lead } },
}));

import BotWhatsappPage from "../page";
import LeadWhatsappPage from "../[id]/page";
import { calcularGasto } from "@/lib/bot-whatsapp/config";
import { HORARIO_POR_DEFECTO } from "@/lib/bot-whatsapp/constantes";

const ADMIN = { id: "a1", nombre: "Luciano", email: "l@movara.com.ar", rol: "admin" as const };
const VENDEDOR = { id: "v1", nombre: "Vera", email: "v@movara.com.ar", rol: "vendedor" as const };
const CONFIG = {
  id: "unico",
  activo: false,
  modoHorario: false,
  horarioAtencion: HORARIO_POR_DEFECTO,
  modoRespaldo: "MENSAJE_BIENVENIDA",
  mensajeBienvenida: "Hola",
  topeGastoMensualUsd: 5,
  emailAviso: null,
  whatsappAviso: null,
  maxRespuestasPorLead: 6,
};
const FILA = {
  id: "l1",
  nombre: "Ana",
  telefono: "5493493667214",
  zona: "Rafaela",
  uso: "Vivienda",
  estado: "NUEVO",
  origen: "WEB",
  controlHumano: false,
  ultimoMensajeEn: null,
  proximoContacto: null,
};

const pagina = async (sp: Record<string, string> = {}) => render(await BotWhatsappPage({ searchParams: Promise.resolve(sp) }));
const pestanas = () => within(screen.getByRole("navigation", { name: "Secciones del bot" })).getAllByRole("link").map((l) => l.textContent);

beforeEach(() => {
  vi.clearAllMocks();
  m.sesion.mockResolvedValue(ADMIN);
  m.config.mockResolvedValue(CONFIG);
  m.gasto.mockResolvedValue(calcularGasto("2026-11", 0, 5));
  m.listar.mockResolvedValue({ leads: [FILA], total: 1, pagina: 1, paginas: 1 });
  m.excluidos.mockResolvedValue([{ id: "e1", telefono: "5493493111111", etiqueta: "PROVEEDOR" }]);
  m.coincidencias.mockResolvedValue({ leads: 0, pedidos: [] });
});

describe("/admin/bot-whatsapp", () => {
  it("administrador: estado, las 3 pestañas y Leads por defecto (sin cargar excluidos)", async () => {
    await pagina();
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("Bot de WhatsApp");
    expect(screen.getByRole("switch")).toBeEnabled();
    expect(pestanas()).toEqual(["Leads", "Contactos excluidos", "Configuración"]);
    expect(screen.getByRole("link", { name: "Leads" })).toHaveAttribute("aria-current", "page");
    expect(within(screen.getByRole("table")).getByText("Ana")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "+ Agregar lead manual" })).toBeInTheDocument();
    expect(m.listar).toHaveBeenCalledWith({ pagina: 1 });
    expect(m.excluidos).not.toHaveBeenCalled();
  });

  it("vendedor: sin pestaña de Configuración, ni entrando por URL; interruptor deshabilitado", async () => {
    m.sesion.mockResolvedValue(VENDEDOR);
    await pagina({ vista: "configuracion" });
    expect(pestanas()).toEqual(["Leads", "Contactos excluidos"]);
    expect(screen.queryByRole("form", { name: "Configuración del bot" })).toBeNull();
    expect(screen.getByRole("link", { name: "Leads" })).toHaveAttribute("aria-current", "page");
    expect(screen.getByRole("switch")).toBeDisabled();
  });

  it("administrador: pestaña de configuración con los valores guardados", async () => {
    await pagina({ vista: "configuracion" });
    expect(screen.getByRole("form", { name: "Configuración del bot" })).toBeInTheDocument();
    expect(screen.getByLabelText("Mensaje de bienvenida")).toHaveValue("Hola");
    expect(m.listar).not.toHaveBeenCalled();
  });

  it("pestaña de excluidos: el administrador puede quitar, el vendedor no", async () => {
    await pagina({ vista: "excluidos" });
    expect(screen.getByRole("button", { name: "Quitar +54 9 3493 11-1111" })).toBeInTheDocument();
    expect(m.listar).not.toHaveBeenCalled();
    m.sesion.mockResolvedValue(VENDEDOR);
    document.body.innerHTML = "";
    await pagina({ vista: "excluidos" });
    expect(screen.getByText("+54 9 3493 11-1111")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Quitar/ })).toBeNull();
  });

  it("filtros: estado y búsqueda llegan al listado y quedan en el formulario y la paginación", async () => {
    m.listar.mockResolvedValue({ leads: [FILA], total: 120, pagina: 2, paginas: 3 });
    await pagina({ estado: "CALIFICADO", q: "ana", pagina: "2" });
    expect(m.listar).toHaveBeenCalledWith({ estado: "CALIFICADO", q: "ana", pagina: 2 });
    expect(screen.getByLabelText("Filtrar por estado")).toHaveValue("CALIFICADO");
    expect(screen.getByLabelText("Buscar por nombre o teléfono")).toHaveValue("ana");
    expect(screen.getByText("(120)")).toBeInTheDocument();
    const hrefs = screen.getAllByRole("link").map((l) => l.getAttribute("href"));
    expect(hrefs).toContain("/admin/bot-whatsapp?estado=CALIFICADO&q=ana");
    expect(hrefs).toContain("/admin/bot-whatsapp?estado=CALIFICADO&q=ana&pagina=3");
  });

  it("paginación sin filtros: la página 1 es la URL limpia", async () => {
    m.listar.mockResolvedValue({ leads: [FILA], total: 120, pagina: 2, paginas: 3 });
    await pagina({ pagina: "2" });
    const hrefs = screen.getAllByRole("link").map((l) => l.getAttribute("href"));
    expect(hrefs).toContain("/admin/bot-whatsapp");
    expect(hrefs).toContain("/admin/bot-whatsapp?pagina=3");
  });

  it("un filtro inválido se ignora (todos los leads, página 1)", async () => {
    await pagina({ estado: "INVENTADO", pagina: "-4" });
    expect(m.listar).toHaveBeenCalledWith({ pagina: 1 });
    expect(screen.getByLabelText("Filtrar por estado")).toHaveValue("");
  });

  it("sin sesión (no debería pasar: el proxy lo frena) se comporta como vendedor", async () => {
    m.sesion.mockResolvedValue(null);
    await pagina();
    expect(pestanas()).toEqual(["Leads", "Contactos excluidos"]);
    expect(screen.getByRole("switch")).toBeDisabled();
  });
});

describe("/admin/bot-whatsapp/[id]", () => {
  const LEAD = {
    id: "l1",
    telefono: "5493493667214",
    nombre: "Ana López",
    uso: "Vivienda",
    zona: "Rafaela",
    terreno: null,
    personas: "4",
    plazo: null,
    origen: "RECOMENDACION",
    origenDetalle: "Juan",
    estado: "CALIFICADO",
    controlHumano: false,
    respuestasBot: 3,
    notas: "Quiere visitar",
    proximoContacto: new Date("2026-12-01T12:00:00Z"),
    creadoEn: new Date("2026-11-18T13:00:00Z"),
    actualizadoEn: new Date("2026-11-18T13:00:00Z"),
    ultimoMensajeEn: new Date("2026-11-18T13:05:00Z"),
    mensajes: [
      { id: "m1", leadId: "l1", direccion: "ENTRANTE", autor: "CLIENTE", tipo: "TEXTO", contenido: "Hola, quiero info", creadoEn: new Date("2026-11-18T13:00:00Z") },
      { id: "m2", leadId: "l1", direccion: "SALIENTE", autor: "BOT", tipo: "TEXTO", contenido: "¡Hola! ¿Para qué uso?", creadoEn: new Date("2026-11-18T13:01:00Z") },
    ],
  };
  const detalle = async (id = "l1") => render(await LeadWhatsappPage({ params: Promise.resolve({ id }) }));

  it("muestra el lead, la conversación, los datos editables y el link a WhatsApp con saludo", async () => {
    m.lead.mockResolvedValue(LEAD);
    await detalle();
    expect(m.lead).toHaveBeenCalledWith({ where: { id: "l1" }, include: { mensajes: { orderBy: { creadoEn: "asc" } } } });
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("Ana López");
    expect(screen.getByText(/\+54 9 3493 66-7214/)).toHaveTextContent("3 respuestas del bot");
    expect(within(screen.getByRole("list", { name: "Conversación" })).getAllByRole("listitem")).toHaveLength(2);
    expect(screen.getByLabelText("Estado")).toHaveValue("CALIFICADO");
    expect(screen.getByLabelText("Próximo contacto")).toHaveValue("2026-12-01");
    expect(screen.getByLabelText("Notas internas")).toHaveValue("Quiere visitar");
    const wa = screen.getByRole("link", { name: "Abrir en WhatsApp" });
    expect(wa).toHaveAttribute("href", `https://wa.me/5493493667214?text=${encodeURIComponent("Hola Ana! Te escribimos de MOVARA.")}`);
    expect(wa).toHaveAttribute("target", "_blank");
    expect(screen.queryByRole("note")).toBeNull();
  });

  it("si coincide con Leads y Pedidos, avisa con links (solo lectura)", async () => {
    m.lead.mockResolvedValue(LEAD);
    m.coincidencias.mockResolvedValue({ leads: 2, pedidos: [{ id: "p1", numero: "MOV-2026-010" }, { id: "p2", numero: null }] });
    await detalle();
    const aviso = screen.getByRole("note");
    expect(aviso).toHaveTextContent("Este contacto ya figura en Leads y Pedidos.");
    expect(within(aviso).getByRole("link", { name: "Ver en Leads (2)" })).toHaveAttribute("href", "/admin/buscar?q=3493667214");
    expect(within(aviso).getByRole("link", { name: "Pedido MOV-2026-010" })).toHaveAttribute("href", "/admin/configuraciones/p1");
    expect(within(aviso).getByRole("link", { name: "Pedido sin número" })).toHaveAttribute("href", "/admin/configuraciones/p2");
    expect(m.coincidencias).toHaveBeenCalledWith("5493493667214");
  });

  it("aviso solo de Leads o solo de Pedidos", async () => {
    m.lead.mockResolvedValue(LEAD);
    m.coincidencias.mockResolvedValueOnce({ leads: 1, pedidos: [] });
    await detalle();
    expect(screen.getByRole("note")).toHaveTextContent("Este contacto ya figura en Leads.");
    document.body.innerHTML = "";
    m.coincidencias.mockResolvedValueOnce({ leads: 0, pedidos: [{ id: "p1", numero: "MOV-2026-010" }] });
    await detalle();
    expect(screen.getByRole("note")).toHaveTextContent("Este contacto ya figura en Pedidos.");
  });

  it("vendedor: no ve 'Borrar lead'; administrador sí", async () => {
    m.lead.mockResolvedValue(LEAD);
    m.sesion.mockResolvedValue(VENDEDOR);
    await detalle();
    expect(screen.getByRole("button", { name: "Tomar control" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Borrar lead" })).toBeNull();
    document.body.innerHTML = "";
    m.sesion.mockResolvedValue(ADMIN);
    await detalle();
    expect(screen.getByRole("button", { name: "Borrar lead" })).toBeInTheDocument();
  });

  it("lead sin nombre ni datos: textos por defecto y saludo genérico", async () => {
    m.lead.mockResolvedValue({ ...LEAD, nombre: null, uso: null, zona: null, personas: null, origen: null, origenDetalle: null, notas: null, proximoContacto: null, controlHumano: true, mensajes: [] });
    m.sesion.mockResolvedValue(null);
    await detalle();
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("Sin nombre");
    expect(screen.getByText("Todavía no hay mensajes.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Devolver al bot" })).toBeInTheDocument();
    expect(screen.getByLabelText("Próximo contacto")).toHaveValue("");
    expect(screen.getByRole("link", { name: "Abrir en WhatsApp" })).toHaveAttribute(
      "href",
      `https://wa.me/5493493667214?text=${encodeURIComponent("Hola! Te escribimos de MOVARA.")}`
    );
  });

  it("404 si el lead no existe", async () => {
    m.lead.mockResolvedValue(null);
    await expect(detalle("no-existe")).rejects.toThrow("NEXT_NOT_FOUND");
    expect(m.notFound).toHaveBeenCalled();
    expect(m.coincidencias).not.toHaveBeenCalled();
  });
});
