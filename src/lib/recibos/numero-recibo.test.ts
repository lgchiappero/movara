import { describe, it, expect, vi } from "vitest";
import { generateNumeroRecibo } from "./numero-recibo";

function tx(numeros: string[]) {
  const findMany = vi.fn().mockResolvedValue(numeros.map((numeroRecibo) => ({ numeroRecibo })));
  return { tx: { reciboConformidad: { findMany } } as never, findMany };
}

describe("generateNumeroRecibo", () => {
  const ahora = new Date("2026-10-08T12:00:00Z");

  it("primer recibo del año: REC-2026-001", async () => {
    const { tx: t, findMany } = tx([]);
    expect(await generateNumeroRecibo(t, ahora)).toBe("REC-2026-001");
    expect(findMany.mock.calls[0][0].where).toEqual({ numeroRecibo: { startsWith: "REC-2026-" } });
  });

  it("sigue al mayor existente (incluye anulados) e ignora números raros", async () => {
    const { tx: t } = tx(["REC-2026-002", "REC-2026-010", "REC-2026-xyz"]);
    expect(await generateNumeroRecibo(t, ahora)).toBe("REC-2026-011");
  });

  it("usa el año actual por defecto", async () => {
    const { tx: t } = tx([]);
    expect(await generateNumeroRecibo(t)).toMatch(new RegExp(`^REC-${new Date().getFullYear()}-001$`));
  });
});
