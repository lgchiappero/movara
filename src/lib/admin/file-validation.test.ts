import { describe, it, expect } from "vitest";
import { validateFile, MAX_FILE_SIZE_BYTES } from "@/lib/admin/file-validation";

describe("validateFile", () => {
  it("acepta un PDF dentro del límite", () => {
    expect(validateFile({ size: 1024, type: "application/pdf" })).toEqual({ valid: true });
  });

  it("acepta JPG, PNG y XLSX", () => {
    expect(validateFile({ size: 1024, type: "image/jpeg" }).valid).toBe(true);
    expect(validateFile({ size: 1024, type: "image/png" }).valid).toBe(true);
    expect(
      validateFile({
        size: 1024,
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      }).valid
    ).toBe(true);
  });

  it("rechaza un tipo no permitido", () => {
    const result = validateFile({ size: 1024, type: "application/zip" });
    expect(result.valid).toBe(false);
  });

  it("rechaza un archivo de más de 10MB", () => {
    const result = validateFile({ size: MAX_FILE_SIZE_BYTES + 1, type: "application/pdf" });
    expect(result.valid).toBe(false);
  });

  it("acepta exactamente el límite de 10MB", () => {
    expect(validateFile({ size: MAX_FILE_SIZE_BYTES, type: "application/pdf" }).valid).toBe(true);
  });

  it("rechaza un archivo vacío", () => {
    expect(validateFile({ size: 0, type: "application/pdf" }).valid).toBe(false);
  });
});
