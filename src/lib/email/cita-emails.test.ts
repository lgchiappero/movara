import { describe, it, expect } from "vitest";
import {
  buildConfirmacionClienteEmail,
  buildNuevaVisitaAdminEmail,
  buildRecordatorioEmail,
  buildCancelacionClienteEmail,
  buildCancelacionAdminEmail,
  type CitaEmailData,
} from "@/lib/email/cita-emails";

const cita: CitaEmailData = {
  id: "cita_abc123",
  fecha: new Date(Date.UTC(2026, 8, 20)), // 2026-09-20
  horario: "11:00",
  nombre: "Juan García",
  email: "juan@example.com",
  telefono: "+54 9 11 1234-5678",
  tipoCliente: "particular",
  razonSocial: null,
  consulta: "Busco un módulo para vivienda familiar",
};

describe("cita-emails", () => {
  it("buildConfirmacionClienteEmail incluye fecha, horario y link de cancelación", () => {
    const { subject, html } = buildConfirmacionClienteEmail(cita);
    expect(subject).toBe("MOVARA — Tu visita está confirmada");
    expect(html).toContain("11:00");
    expect(html).toContain("cita_abc123");
    expect(html).toContain("movara.com.ar/agendar/cancelar/cita_abc123");
    expect(html).toContain("Juan García");
  });

  it("buildNuevaVisitaAdminEmail incluye los datos del cliente y la consulta", () => {
    const { subject, html } = buildNuevaVisitaAdminEmail(cita);
    expect(subject).toBe("MOVARA — Nueva visita agendada");
    expect(html).toContain("Juan García");
    expect(html).toContain("juan@example.com");
    expect(html).toContain("Busco un módulo para vivienda familiar");
  });

  it("buildNuevaVisitaAdminEmail incluye razón social solo si es empresa", () => {
    const empresa: CitaEmailData = { ...cita, tipoCliente: "empresa", razonSocial: "Constructora Sur S.A." };
    const { html } = buildNuevaVisitaAdminEmail(empresa);
    expect(html).toContain("Constructora Sur S.A.");

    const { html: htmlParticular } = buildNuevaVisitaAdminEmail(cita);
    expect(htmlParticular).not.toContain("Razón social");
  });

  it("buildNuevaVisitaAdminEmail omite la fila 'Qué busca' si la consulta viene vacía (ahora es opcional)", () => {
    const sinConsulta: CitaEmailData = { ...cita, consulta: "" };
    const { html } = buildNuevaVisitaAdminEmail(sinConsulta);
    expect(html).not.toContain("Qué busca");

    const { html: htmlConConsulta } = buildNuevaVisitaAdminEmail(cita);
    expect(htmlConConsulta).toContain("Qué busca");
  });

  it("buildRecordatorioEmail incluye el link de cancelación", () => {
    const { subject, html } = buildRecordatorioEmail(cita);
    expect(subject).toContain("mañana");
    expect(html).toContain("movara.com.ar/agendar/cancelar/cita_abc123");
  });

  it("buildCancelacionClienteEmail confirma la cancelación", () => {
    const { subject, html } = buildCancelacionClienteEmail(cita);
    expect(subject).toBe("MOVARA — Tu visita fue cancelada");
    expect(html).toContain("cancelaste");
  });

  it("buildCancelacionClienteEmail incluye el motivo cuando está presente", () => {
    const conMotivo: CitaEmailData = { ...cita, motivoCancelacion: "Se le complicó el horario" };
    const { html } = buildCancelacionClienteEmail(conMotivo);
    expect(html).toContain("Se le complicó el horario");

    const { html: sinMotivo } = buildCancelacionClienteEmail(cita);
    expect(sinMotivo).not.toContain("Motivo:");
  });

  it("buildCancelacionAdminEmail incluye los datos de contacto del cliente", () => {
    const { subject, html } = buildCancelacionAdminEmail(cita);
    expect(subject).toBe("MOVARA — Se canceló una visita");
    expect(html).toContain("juan@example.com");
    expect(html).toContain("+54 9 11 1234-5678");
  });

  it("buildCancelacionAdminEmail incluye el motivo y distingue quién canceló", () => {
    const canceladaPorAdmin: CitaEmailData = {
      ...cita,
      canceladaPor: "admin",
      motivoCancelacion: "Cliente avisó por WhatsApp que no podía asistir",
    };
    const { html } = buildCancelacionAdminEmail(canceladaPorAdmin);
    expect(html).toContain("el equipo MOVARA");
    expect(html).toContain("Cliente avisó por WhatsApp que no podía asistir");

    const canceladaPorCliente: CitaEmailData = { ...cita, canceladaPor: "cliente" };
    const { html: htmlCliente } = buildCancelacionAdminEmail(canceladaPorCliente);
    expect(htmlCliente).toContain("el cliente");
  });
});
