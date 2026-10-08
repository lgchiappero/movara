import { describe, it, expect } from "vitest";
import { camposPendientes, asegurarSinCamposPendientes, partirPorCampos, type DocumentoLegal } from "./campos";

const doc = (texto: string, extra: Partial<DocumentoLegal> = {}): DocumentoLegal => ({
  titulo: "Doc",
  actualizado: "hoy",
  intro: "Intro",
  secciones: [{ id: "a", titulo: "A", bloques: [{ tipo: "p", texto }, { tipo: "lista", items: ["item [CUIT]"] }] }],
  ...extra,
});

describe("camposPendientes", () => {
  it("encuentra los [CAMPOS] en párrafos, listas, títulos e intro, sin repetir", () => {
    expect(camposPendientes(doc("Soy [RAZÓN SOCIAL], CUIT [CUIT]", { intro: "En [JURISDICCIÓN]" }))).toEqual([
      "[JURISDICCIÓN]",
      "[RAZÓN SOCIAL]",
      "[CUIT]",
    ]);
  });

  it("cualquier texto entre corchetes cuenta como campo (también '[Rafaela]' o '[sa-east-1]'); '[]' vacío no", () => {
    const d: DocumentoLegal = { titulo: "T", actualizado: "x", intro: "[Rafaela] [sa-east-1] [1] []", secciones: [] };
    expect(camposPendientes(d)).toEqual(["[Rafaela]", "[sa-east-1]", "[1]"]);
  });
});

describe("asegurarSinCamposPendientes", () => {
  it("en producción falla si queda algún campo, listándolos", () => {
    expect(() => asegurarSinCamposPendientes(doc("[DOMICILIO]"), "production")).toThrow(
      '[legal] "Doc" tiene campos sin completar: [DOMICILIO], [CUIT]'
    );
  });

  it("en desarrollo y tests no falla (los campos se ven resaltados)", () => {
    expect(() => asegurarSinCamposPendientes(doc("[DOMICILIO]"), "development")).not.toThrow();
    expect(() => asegurarSinCamposPendientes(doc("[DOMICILIO]"))).not.toThrow();
  });

  it("en producción no falla con todo completo", () => {
    const completo: DocumentoLegal = { titulo: "T", actualizado: "x", intro: "Empresa S.A.", secciones: [] };
    expect(() => asegurarSinCamposPendientes(completo, "production")).not.toThrow();
  });
});

describe("partirPorCampos", () => {
  it("separa tramos normales y campos", () => {
    expect(partirPorCampos("A [CUIT] b [DOMICILIO]")).toEqual([
      { texto: "A ", campo: false },
      { texto: "[CUIT]", campo: true },
      { texto: " b ", campo: false },
      { texto: "[DOMICILIO]", campo: true },
    ]);
    expect(partirPorCampos("[CUIT]")).toEqual([{ texto: "[CUIT]", campo: true }]);
    expect(partirPorCampos("sin campos")).toEqual([{ texto: "sin campos", campo: false }]);
  });
});
