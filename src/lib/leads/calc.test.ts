import { describe, it, expect } from "vitest";
import { tasaConversion } from "@/lib/leads/calc";

describe("tasaConversion", () => {
  it("null cuando el total es cero", () => {
    expect(tasaConversion(0, 0)).toBeNull();
  });

  it("null cuando el total es negativo (dato inconsistente, defensivo)", () => {
    expect(tasaConversion(0, -1)).toBeNull();
  });

  it("calcula la fracción ganados/total", () => {
    expect(tasaConversion(3, 10)).toBe(0.3);
  });

  it("1 cuando todos los leads del período se ganaron", () => {
    expect(tasaConversion(5, 5)).toBe(1);
  });

  it("0 cuando no se ganó ninguno", () => {
    expect(tasaConversion(0, 5)).toBe(0);
  });
});
