import { describe, it, expect, vi } from "vitest";

const { mockWriteFile, mockJsonToSheet, mockAppend } = vi.hoisted(() => ({
  mockWriteFile: vi.fn(),
  mockJsonToSheet: vi.fn(() => "hoja"),
  mockAppend: vi.fn(),
}));
vi.mock("xlsx", () => ({
  utils: { json_to_sheet: mockJsonToSheet, book_new: vi.fn(() => ({ libro: true })), book_append_sheet: mockAppend },
  writeFile: mockWriteFile,
}));

import { exportarExcel } from "./exportar-excel";

describe("exportarExcel", () => {
  it("arma una hoja con las filas y descarga el archivo", () => {
    exportarExcel([{ A: 1 }], "Hoja", "archivo.xlsx");
    expect(mockJsonToSheet).toHaveBeenCalledWith([{ A: 1 }]);
    expect(mockAppend).toHaveBeenCalledWith({ libro: true }, "hoja", "Hoja");
    expect(mockWriteFile).toHaveBeenCalledWith({ libro: true }, "archivo.xlsx");
  });
});
