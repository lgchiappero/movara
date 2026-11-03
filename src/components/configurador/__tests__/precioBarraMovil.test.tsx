import { describe, it, expect } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { PrecioBarraMovil, coloresPrecio, Desglose } from "../PrecioPanel";
import type { PrecioResumen } from "@/lib/precio-configurador";

const base: PrecioResumen = { base: 25840, adicionales: [], total: 25840, aConsultar: [] };
const conExtras: PrecioResumen = {
  base: 25840,
  adicionales: [{ key: "balcon", nombre: "Balcón frontal de 2 m con sobretecho, deck y barandas", precio: 3100 }],
  total: 28940,
  aConsultar: [
    { key: "banera", nombre: "Bañera — opción 1" },
    { key: "muroVidrio", nombre: "Muro cortina de vidrio" },
  ],
};

describe("PrecioBarraMovil (barra fija del configurador en el celular)", () => {
  it("sin modelo pide elegir uno", () => {
    render(<PrecioBarraMovil resumen={base} modeloLabel={null} />);
    expect(screen.getByText("Seleccioná un modelo para ver el precio")).toBeInTheDocument();
  });

  it("muestra modelo y total en una línea; Ver detalle despliega el desglose y la nota", () => {
    render(<PrecioBarraMovil resumen={base} modeloLabel="MOVARA Flex 38m²" />);
    expect(screen.getByText("MOVARA Flex 38m² · Precio estimado")).toBeInTheDocument();
    expect(screen.getByText("USD 25.840")).toBeInTheDocument();
    expect(screen.queryByText(/Precio estimado de referencia/)).toBeNull();
    const boton = screen.getByRole("button", { name: /Ver detalle/ });
    expect(boton).toHaveAttribute("aria-expanded", "false");
    fireEvent.click(boton);
    expect(screen.getByRole("button", { name: /Ocultar/ })).toHaveAttribute("aria-expanded", "true");
    expect(screen.getByText("Precio base")).toBeInTheDocument();
    expect(screen.getByText(/Precio estimado de referencia/)).toBeInTheDocument();
  });

  it("resume las opciones a consultar (una o varias)", () => {
    const { rerender } = render(<PrecioBarraMovil resumen={conExtras} modeloLabel="MOVARA Flex 38m²" />);
    expect(screen.getByText("+ 2 opciones a consultar")).toBeInTheDocument();
    rerender(<PrecioBarraMovil resumen={{ ...conExtras, aConsultar: conExtras.aConsultar.slice(0, 1) }} modeloLabel="MOVARA Flex 38m²" />);
    expect(screen.getByText("+ 1 opción a consultar")).toBeInTheDocument();
  });
});

describe("coloresPrecio", () => {
  it("gris sin modelo, verde sin extras, naranja con extras", () => {
    expect(coloresPrecio(base, null).text).toBe("#78716c");
    expect(coloresPrecio(base, "Flex").text).toBe("#2d9e75");
    expect(coloresPrecio(conExtras, "Flex").text).toBe("#854F0B");
  });
});

describe("Desglose", () => {
  it("los nombres largos hacen wrap en el celular (truncan solo desde sm)", () => {
    render(<Desglose resumen={conExtras} colors={{ text: "#000" }} />);
    const linea = screen.getByText("+ Balcón frontal de 2 m con sobretecho, deck y barandas");
    expect(linea).toHaveClass("min-w-0", "sm:truncate");
    expect(linea).not.toHaveClass("truncate");
  });
});
