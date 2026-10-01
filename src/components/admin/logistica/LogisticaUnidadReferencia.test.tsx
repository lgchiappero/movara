import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import LogisticaUnidadReferencia from "./LogisticaUnidadReferencia";
import type { CostoLogisticaRow } from "@/lib/cobranza/logistica";

const base: CostoLogisticaRow = {
  id: "c1",
  envioId: "e1",
  envioNumeroPI: "PI-001",
  envioContenedor: null,
  concepto: "flete",
  descripcion: "Shanghai → BA",
  moneda: "USD",
  importe: 4200,
  fecha: "2026-09-01T00:00:00.000Z",
  estado: "pagado",
  comprobanteUrl: null,
  comprobanteSignedUrl: null,
  notas: null,
  prorrateado: true,
  prorrateos: [
    { unidadId: "u1", unidadNumero: "MOV-1", importe: 2100 },
    { unidadId: "u2", unidadNumero: "MOV-2", importe: 2100 },
  ],
  createdAt: "2026-09-01T00:00:00.000Z",
};

describe("LogisticaUnidadReferencia (solo lectura, en la ficha de la unidad)", () => {
  it("sin envío asignado", () => {
    render(<LogisticaUnidadReferencia unidadId="u1" envio={null} costos={[]} />);
    expect(screen.getByTestId("logistica-unidad")).toHaveTextContent("La unidad todavía no está asignada a un envío.");
  });

  it("envío sin costos: link al envío", () => {
    render(<LogisticaUnidadReferencia unidadId="u1" envio={{ id: "e1", numeroPI: null }} costos={[]} />);
    expect(screen.getByRole("link", { name: "Ver envío sin PI →" })).toHaveAttribute("href", "/admin/envios/e1#logistica");
    expect(screen.getByText("El envío todavía no tiene costos de logística cargados.")).toBeInTheDocument();
  });

  it("costos del envío con la parte de esta unidad (o 'No prorrateado'), sin acciones de edición", () => {
    render(
      <LogisticaUnidadReferencia
        unidadId="u1"
        envio={{ id: "e1", numeroPI: "PI-001" }}
        costos={[
          base,
          { ...base, id: "c2", concepto: "vep", descripcion: null, moneda: "ARS", importe: 90000, estado: "pendiente", fecha: "2026-09-20T00:00:00.000Z", prorrateado: true, prorrateos: [{ unidadId: "u1", unidadNumero: "MOV-1", importe: 45000 }] },
          { ...base, id: "c3", concepto: "seguro", descripcion: null, importe: 300, prorrateado: false, prorrateos: [], fecha: "2026-08-01T00:00:00.000Z" },
        ]}
      />
    );
    expect(screen.getByRole("link", { name: "Ver envío PI-001 →" })).toHaveAttribute("href", "/admin/envios/e1#logistica");
    const filas = screen.getAllByRole("row").slice(1);
    expect(filas.map((f) => (f as HTMLTableRowElement).cells[0].textContent)).toEqual(["VEP", "Flete marítimoShanghai → BA", "Seguro de carga"]);
    expect(filas[0]).toHaveTextContent("ARS 45.000");
    expect(filas[0]).toHaveTextContent("Pendiente");
    expect(filas[1]).toHaveTextContent("USD 4.200");
    expect(filas[1]).toHaveTextContent("USD 2.100");
    expect(filas[2]).toHaveTextContent("No prorrateado");
    expect(screen.getByText(/Parte de esta unidad:/)).toHaveTextContent("Parte de esta unidad: USD 2.100 · ARS 45.000");
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });

  it("sin parte en ARS, no la muestra", () => {
    render(<LogisticaUnidadReferencia unidadId="u1" envio={{ id: "e1", numeroPI: "PI-001" }} costos={[base]} />);
    expect(screen.getByText(/Parte de esta unidad:/).textContent).toBe("Parte de esta unidad: USD 2.100");
  });
});
