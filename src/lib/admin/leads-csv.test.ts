import { describe, it, expect } from "vitest";
import { buildLeadsCsv } from "@/lib/admin/leads-csv";

describe("buildLeadsCsv", () => {
  it("genera el header correcto", () => {
    const csv = buildLeadsCsv([]);
    expect(csv).toBe("Nombre,Email,Teléfono,Provincia,Fecha,Mensaje");
  });

  it("formatea una fila simple", () => {
    const csv = buildLeadsCsv([
      {
        nombre: "Juan García",
        email: "juan@example.com",
        telefono: "+5491112345678",
        provincia: "Buenos Aires",
        createdAt: new Date("2026-09-07T12:00:00Z"),
        mensaje: "Quiero un presupuesto",
      },
    ]);
    const lines = csv.split("\r\n");
    expect(lines[1]).toBe(
      "Juan García,juan@example.com,+5491112345678,Buenos Aires,2026-09-07,Quiero un presupuesto"
    );
  });

  it("escapa campos con comas", () => {
    const csv = buildLeadsCsv([
      {
        nombre: "García, Juan",
        email: null,
        telefono: "123",
        provincia: null,
        createdAt: new Date("2026-01-01"),
        mensaje: null,
      },
    ]);
    expect(csv.split("\r\n")[1]).toContain('"García, Juan"');
  });

  it("escapa campos con comillas dobles", () => {
    const csv = buildLeadsCsv([
      {
        nombre: 'Juan "El Grande"',
        email: null,
        telefono: "123",
        provincia: null,
        createdAt: new Date("2026-01-01"),
        mensaje: null,
      },
    ]);
    expect(csv.split("\r\n")[1]).toContain('"Juan ""El Grande"""');
  });

  it("escapa campos con saltos de línea", () => {
    const csv = buildLeadsCsv([
      {
        nombre: "Juan",
        email: null,
        telefono: "123",
        provincia: null,
        createdAt: new Date("2026-01-01"),
        mensaje: "Hola\ncómo estás",
      },
    ]);
    expect(csv).toContain('"Hola\ncómo estás"');
  });

  it("usa string vacío para campos null", () => {
    const csv = buildLeadsCsv([
      {
        nombre: "Juan",
        email: null,
        telefono: "123",
        provincia: null,
        createdAt: new Date("2026-01-01"),
        mensaje: null,
      },
    ]);
    expect(csv.split("\r\n")[1]).toBe("Juan,,123,,2026-01-01,");
  });
});
