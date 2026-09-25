import { describe, it, expect } from "vitest";
import { z } from "zod";
import { leadContactadoSchema, leadPipelineSchema, leadNotasVentaSchema } from "@/lib/validators/lead";

describe("leadContactadoSchema", () => {
  it("acepta true/false", () => {
    expect(leadContactadoSchema.safeParse({ contactado: true }).success).toBe(true);
    expect(leadContactadoSchema.safeParse({ contactado: false }).success).toBe(true);
  });

  it("rechaza valores no booleanos", () => {
    expect(leadContactadoSchema.safeParse({ contactado: "si" }).success).toBe(false);
  });
});

const VALID: z.input<typeof leadPipelineSchema> = {
  etapa: "nuevo",
  origen: null,
  vendedorId: null,
  notasVenta: null,
  motivoPerdida: null,
  valorEstimado: null,
};

describe("leadPipelineSchema", () => {
  it("acepta un conjunto de datos válidos vacíos", () => {
    expect(leadPipelineSchema.safeParse(VALID).success).toBe(true);
  });

  it("rechaza una etapa fuera del catálogo", () => {
    expect(leadPipelineSchema.safeParse({ ...VALID, etapa: "no-existe" }).success).toBe(false);
  });

  it("rechaza un origen fuera del catálogo (pero acepta null)", () => {
    expect(leadPipelineSchema.safeParse({ ...VALID, origen: "no-existe" }).success).toBe(false);
    expect(leadPipelineSchema.safeParse({ ...VALID, origen: "instagram" }).success).toBe(true);
  });

  it("exige motivoPerdida cuando etapa es 'perdido'", () => {
    const res = leadPipelineSchema.safeParse({ ...VALID, etapa: "perdido" });
    expect(res.success).toBe(false);
    if (!res.success) {
      expect(res.error.issues[0].path).toEqual(["motivoPerdida"]);
    }
  });

  it("acepta 'perdido' cuando sí trae motivoPerdida", () => {
    const res = leadPipelineSchema.safeParse({ ...VALID, etapa: "perdido", motivoPerdida: "No respondió" });
    expect(res.success).toBe(true);
  });

  it("string vacío en motivoPerdida no cuenta como motivo real", () => {
    const res = leadPipelineSchema.safeParse({ ...VALID, etapa: "perdido", motivoPerdida: "" });
    expect(res.success).toBe(false);
  });

  it("etapas distintas de 'perdido' no requieren motivoPerdida", () => {
    expect(leadPipelineSchema.safeParse({ ...VALID, etapa: "ganado" }).success).toBe(true);
  });

  it("acepta valorEstimado numérico o null", () => {
    expect(leadPipelineSchema.safeParse({ ...VALID, valorEstimado: 15000 }).success).toBe(true);
    expect(leadPipelineSchema.safeParse({ ...VALID, valorEstimado: null }).success).toBe(true);
  });

  it("vendedorId/notasVenta vacíos ('') se normalizan a null", () => {
    const res = leadPipelineSchema.safeParse({ ...VALID, vendedorId: "", notasVenta: "" });
    expect(res.success).toBe(true);
    if (res.success) {
      expect(res.data.vendedorId).toBeNull();
      expect(res.data.notasVenta).toBeNull();
    }
  });
});

describe("leadNotasVentaSchema", () => {
  it("acepta una nota o null", () => {
    expect(leadNotasVentaSchema.safeParse({ notasVenta: "Llamar el lunes" }).success).toBe(true);
    expect(leadNotasVentaSchema.safeParse({ notasVenta: null }).success).toBe(true);
  });

  it("normaliza string vacío a null", () => {
    const res = leadNotasVentaSchema.safeParse({ notasVenta: "" });
    expect(res.success).toBe(true);
    if (res.success) expect(res.data.notasVenta).toBeNull();
  });
});
