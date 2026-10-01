import { describe, it, expect } from "vitest";
import { z } from "zod";
import { leadContactadoSchema, leadPipelineSchema, leadNotasVentaSchema, leadCreateSchema } from "@/lib/validators/lead";

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

const VALID_CREATE: z.input<typeof leadCreateSchema> = {
  nombre: "Juan García",
  email: null,
  telefono: null,
  origen: null,
  modeloInteres: null,
  notasVenta: null,
  vendedorId: null,
  valorEstimado: null,
};

describe("leadCreateSchema", () => {
  it("acepta el alta manual mínima (solo nombre, todo lo demás null)", () => {
    const res = leadCreateSchema.safeParse(VALID_CREATE);
    expect(res.success).toBe(true);
    if (res.success) expect(res.data.telefono).toBe("");
  });

  it("rechaza un nombre vacío o de un solo caracter", () => {
    expect(leadCreateSchema.safeParse({ ...VALID_CREATE, nombre: "" }).success).toBe(false);
    expect(leadCreateSchema.safeParse({ ...VALID_CREATE, nombre: "A" }).success).toBe(false);
  });

  it("recorta espacios del nombre", () => {
    const res = leadCreateSchema.safeParse({ ...VALID_CREATE, nombre: "  Juan García  " });
    expect(res.success).toBe(true);
    if (res.success) expect(res.data.nombre).toBe("Juan García");
  });

  it("telefono ausente (undefined) se normaliza a string vacío, no falla", () => {
    const { telefono: _telefono, ...sinTelefono } = VALID_CREATE;
    const res = leadCreateSchema.safeParse(sinTelefono);
    expect(res.success).toBe(true);
    if (res.success) expect(res.data.telefono).toBe("");
  });

  it("acepta un teléfono real y lo recorta", () => {
    const res = leadCreateSchema.safeParse({ ...VALID_CREATE, telefono: " 1122334455 " });
    expect(res.success).toBe(true);
    if (res.success) expect(res.data.telefono).toBe("1122334455");
  });

  it("acepta los 6 orígenes del catálogo, incluido email_directo, y rechaza uno inválido", () => {
    expect(leadCreateSchema.safeParse({ ...VALID_CREATE, origen: "email_directo" }).success).toBe(true);
    expect(leadCreateSchema.safeParse({ ...VALID_CREATE, origen: "no-existe" }).success).toBe(false);
  });

  it("acepta los modelos de interés (MODELOS_UNIDAD + 'Varios') y rechaza uno inválido", () => {
    expect(leadCreateSchema.safeParse({ ...VALID_CREATE, modeloInteres: "Flex 18" }).success).toBe(true);
    expect(leadCreateSchema.safeParse({ ...VALID_CREATE, modeloInteres: "Varios" }).success).toBe(true);
    expect(leadCreateSchema.safeParse({ ...VALID_CREATE, modeloInteres: "Flex 99" }).success).toBe(false);
  });

  it("email/notasVenta/vendedorId vacíos ('') se normalizan a null", () => {
    const res = leadCreateSchema.safeParse({ ...VALID_CREATE, email: "", notasVenta: "", vendedorId: "" });
    expect(res.success).toBe(true);
    if (res.success) {
      expect(res.data.email).toBeNull();
      expect(res.data.notasVenta).toBeNull();
      expect(res.data.vendedorId).toBeNull();
    }
  });

  it("acepta valorEstimado numérico o null", () => {
    expect(leadCreateSchema.safeParse({ ...VALID_CREATE, valorEstimado: 25000 }).success).toBe(true);
    expect(leadCreateSchema.safeParse({ ...VALID_CREATE, valorEstimado: null }).success).toBe(true);
  });
});
