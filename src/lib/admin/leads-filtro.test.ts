import { describe, it, expect } from "vitest";
import { buildLeadsWhere } from "./leads-filtro";

const AHORA = new Date("2026-10-05T12:00:00");
const HACE_48HS = new Date(AHORA.getTime() - 48 * 60 * 60 * 1000);

describe("buildLeadsWhere", () => {
  it("sin filtros → where vacío", () => {
    expect(buildLeadsWhere({}, AHORA)).toEqual({});
  });

  it("rango de fechas en días argentinos (desde 00:00, hasta 23:59:59.999, UTC−3) y provincia", () => {
    expect(buildLeadsWhere({ desde: "2026-09-01", hasta: "2026-09-30", provincia: "Córdoba" }, AHORA)).toEqual({
      createdAt: { gte: new Date("2026-09-01T03:00:00Z"), lte: new Date("2026-10-01T02:59:59.999Z") },
      provincia: { contains: "Córdoba", mode: "insensitive" },
    });
  });

  it("una fecha mal formada en la URL se ignora (no rompe la query)", () => {
    expect(buildLeadsWhere({ desde: "no-es-fecha", hasta: "2026-13-45" }, AHORA)).toEqual({});
    expect(buildLeadsWhere({ desde: "2026-09-01", hasta: "xx" }, AHORA)).toEqual({ createdAt: { gte: new Date("2026-09-01T03:00:00Z") } });
  });

  it("'sin responder': no contactados con más de 48hs", () => {
    expect(buildLeadsWhere({ sinResponder: "1" }, AHORA)).toEqual({ contactado: false, createdAt: { lte: HACE_48HS } });
  });

  it("'sin responder' + 'hasta': se queda con la fecha más temprana (antes pisaba 'hasta')", () => {
    expect(buildLeadsWhere({ sinResponder: "1", hasta: "2026-09-15" }, AHORA).createdAt).toEqual({ lte: new Date("2026-09-16T02:59:59.999Z") });
    expect(buildLeadsWhere({ sinResponder: "1", hasta: "2026-10-05", desde: "2026-09-01" }, AHORA).createdAt).toEqual({
      gte: new Date("2026-09-01T03:00:00Z"),
      lte: HACE_48HS,
    });
  });

  it("sinResponder distinto de '1' no filtra", () => {
    expect(buildLeadsWhere({ sinResponder: "0" }, AHORA)).toEqual({});
  });
});
