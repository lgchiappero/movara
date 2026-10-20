import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import path from "path";

const config = JSON.parse(readFileSync(path.join(process.cwd(), "vercel.json"), "utf8"));

describe("vercel.json", () => {
  it("las funciones corren en gru1 (San Pablo), la misma región que la base de Supabase (sa-east-1)", () => {
    // En iad1 (Washington) cada consulta a la base sumaba ~120 ms de ida y vuelta.
    expect(config.regions).toEqual(["gru1"]);
  });

  it("mantiene los dos crons de recordatorios", () => {
    expect(config.crons.map((c: { path: string }) => c.path)).toEqual([
      "/api/cron/recordatorios?turno=manana",
      "/api/cron/recordatorios?turno=noche",
    ]);
  });
});
