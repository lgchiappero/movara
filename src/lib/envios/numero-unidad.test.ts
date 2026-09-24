import { describe, it, expect, vi } from "vitest";
import type { Prisma } from "@prisma/client";
import { generateNumeroUnidad } from "@/lib/envios/numero-unidad";

function fakeTx(numeros: string[]): Prisma.TransactionClient {
  return {
    unidad: {
      findMany: vi.fn().mockResolvedValue(numeros.map((numeroUnidad) => ({ numeroUnidad }))),
    },
  } as unknown as Prisma.TransactionClient;
}

const anio = new Date().getFullYear();

describe("generateNumeroUnidad", () => {
  it("genera 001 cuando no hay unidades previas este año", async () => {
    const numero = await generateNumeroUnidad(fakeTx([]));
    expect(numero).toBe(`MOV-UNIDAD-${anio}-001`);
  });

  it("continúa la secuencia a partir del número más alto existente", async () => {
    const numero = await generateNumeroUnidad(
      fakeTx([`MOV-UNIDAD-${anio}-001`, `MOV-UNIDAD-${anio}-003`, `MOV-UNIDAD-${anio}-002`])
    );
    expect(numero).toBe(`MOV-UNIDAD-${anio}-004`);
  });

  it("rellena con ceros a la izquierda hasta 3 dígitos", async () => {
    const numero = await generateNumeroUnidad(fakeTx([`MOV-UNIDAD-${anio}-007`]));
    expect(numero).toBe(`MOV-UNIDAD-${anio}-008`);
  });

  it("no se confunde con números de más de 3 dígitos", async () => {
    const numero = await generateNumeroUnidad(fakeTx([`MOV-UNIDAD-${anio}-099`]));
    expect(numero).toBe(`MOV-UNIDAD-${anio}-100`);
  });
});
