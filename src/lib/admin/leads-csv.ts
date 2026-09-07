export type LeadCsvRow = {
  nombre: string;
  email: string | null;
  telefono: string;
  provincia: string | null;
  createdAt: Date;
  mensaje: string | null;
};

const HEADERS = ["Nombre", "Email", "Teléfono", "Provincia", "Fecha", "Mensaje"];

function escapeCsvField(value: string): string {
  if (/[",\n\r]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

export function buildLeadsCsv(leads: LeadCsvRow[]): string {
  const rows = leads.map((lead) =>
    [
      lead.nombre,
      lead.email ?? "",
      lead.telefono,
      lead.provincia ?? "",
      lead.createdAt.toISOString().slice(0, 10),
      lead.mensaje ?? "",
    ]
      .map(escapeCsvField)
      .join(",")
  );

  return [HEADERS.join(","), ...rows].join("\r\n");
}
