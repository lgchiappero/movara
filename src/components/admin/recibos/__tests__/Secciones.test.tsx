import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import ReciboUnidadSection from "../ReciboUnidadSection";
import RecibosClienteSection from "../RecibosClienteSection";
import EstadoReciboChip from "../EstadoReciboChip";

describe("EstadoReciboChip", () => {
  it("etiqueta por estado y fallback a Pendiente", () => {
    const { rerender } = render(<EstadoReciboChip estado="confirmado" />);
    expect(screen.getByText("Confirmado")).toBeInTheDocument();
    rerender(<EstadoReciboChip estado="raro" />);
    expect(screen.getByText("Pendiente")).toBeInTheDocument();
  });
});

describe("ReciboUnidadSection", () => {
  it("sin recibo vigente ofrece crearlo para esa unidad", () => {
    render(<ReciboUnidadSection unidadId="u1" recibo={null} />);
    expect(screen.getByRole("link", { name: "Crear recibo" })).toHaveAttribute("href", "/admin/recibos/nuevo?unidad=u1");
  });

  it("con recibo muestra estado, fechas y acceso directo", () => {
    render(
      <ReciboUnidadSection
        unidadId="u1"
        recibo={{ id: "r1", numeroRecibo: "REC-2026-001", estado: "confirmado", fechaEntrega: new Date("2026-10-08T00:00:00Z"), confirmadoAt: new Date("2026-10-08T13:00:00Z") }}
      />
    );
    expect(screen.getByText("REC-2026-001")).toBeInTheDocument();
    expect(screen.getByText("Confirmado")).toBeInTheDocument();
    expect(screen.getByText(/Entrega: 8 de octubre de 2026 · Confirmado el/)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Ver recibo →" })).toHaveAttribute("href", "/admin/recibos/r1");
  });

  it("pendiente: sin fecha de confirmación", () => {
    render(
      <ReciboUnidadSection unidadId="u1" recibo={{ id: "r1", numeroRecibo: "REC-2026-001", estado: "pendiente", fechaEntrega: new Date("2026-10-08T00:00:00Z"), confirmadoAt: null }} />
    );
    expect(screen.getByText("Entrega: 8 de octubre de 2026")).toBeInTheDocument();
  });
});

describe("RecibosClienteSection", () => {
  it("lista los recibos con link al PDF solo si están confirmados", () => {
    render(
      <RecibosClienteSection
        recibos={[
          { id: "r1", numeroRecibo: "REC-2026-001", numeroUnidad: "U-1", unidadId: "u1", modelo: "Flex 38", estado: "confirmado", confirmadoAt: new Date("2026-10-08T13:00:00Z") },
          { id: "r2", numeroRecibo: "REC-2026-002", numeroUnidad: "U-2", unidadId: "u2", modelo: "Flex 18", estado: "pendiente", confirmadoAt: null },
        ]}
      />
    );
    expect(screen.getByText("Recibos en Conformidad (2)")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "REC-2026-001" })).toHaveAttribute("href", "/admin/recibos/r1");
    expect(screen.getByRole("link", { name: "U-2" })).toHaveAttribute("href", "/admin/unidades/u2");
    expect(screen.getAllByRole("link", { name: "PDF" })).toHaveLength(1);
    expect(screen.getByRole("link", { name: "PDF" })).toHaveAttribute("href", "/api/admin/recibos/r1/pdf");
  });

  it("sin recibos", () => {
    render(<RecibosClienteSection recibos={[]} />);
    expect(screen.getByText("Este cliente todavía no tiene recibos.")).toBeInTheDocument();
  });
});
