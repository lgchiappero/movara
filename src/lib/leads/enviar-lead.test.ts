import { describe, it, expect, vi, afterEach } from "vitest";
import { enviarLead, mensajeWhatsAppConsulta, MENSAJE_LEAD_NO_GUARDADO } from "./enviar-lead";

afterEach(() => vi.unstubAllGlobals());

function stubFetch(impl: () => Promise<Partial<Response>>) {
  const f = vi.fn(impl);
  vi.stubGlobal("fetch", f);
  return f;
}

describe("enviarLead", () => {
  it("ok con 201 y manda el body como JSON a /api/leads", async () => {
    const f = stubFetch(() => Promise.resolve({ ok: true, status: 201 }));
    expect(await enviarLead({ nombre: "Ana", formulario: "contacto" })).toBe("ok");
    expect(f).toHaveBeenCalledWith("/api/leads", expect.objectContaining({ method: "POST", body: '{"nombre":"Ana","formulario":"contacto"}' }));
  });

  it("503 = no-guardado; otros errores y fallas de red = error", async () => {
    stubFetch(() => Promise.resolve({ ok: false, status: 503 }));
    expect(await enviarLead({})).toBe("no-guardado");
    stubFetch(() => Promise.resolve({ ok: false, status: 500 }));
    expect(await enviarLead({})).toBe("error");
    stubFetch(() => Promise.resolve({ ok: false, status: 429 }));
    expect(await enviarLead({})).toBe("error");
    stubFetch(() => Promise.reject(new TypeError("offline")));
    expect(await enviarLead({})).toBe("error");
  });
});

describe("mensajeWhatsAppConsulta", () => {
  it("arma el mensaje con lo que cargó la persona", () => {
    expect(
      mensajeWhatsAppConsulta({ nombre: "Ana", apellido: "Pérez", telefono: " +54 9 11 5555 ", provincia: "Santa Fe", mensaje: "¿Precio del Flex?" })
    ).toBe("Hola MOVARA! Quiero hacer una consulta. Soy Ana Pérez, de Santa Fe. Mi teléfono es +54 9 11 5555. ¿Precio del Flex?");
  });

  it("omite lo que falta", () => {
    expect(mensajeWhatsAppConsulta({ nombre: "Ana" })).toBe("Hola MOVARA! Quiero hacer una consulta. Soy Ana.");
    expect(mensajeWhatsAppConsulta({ nombre: " ", telefono: "", mensaje: " " })).toBe("Hola MOVARA! Quiero hacer una consulta.");
  });

  it("el mensaje para el usuario es el acordado", () => {
    expect(MENSAJE_LEAD_NO_GUARDADO).toBe("No pudimos registrar tu consulta. Escribinos por WhatsApp");
  });
});
