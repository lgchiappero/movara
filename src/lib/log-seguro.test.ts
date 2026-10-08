import { describe, it, expect } from "vitest";
import { resumenError } from "./log-seguro";

describe("resumenError", () => {
  it("solo tipo y código, nunca el mensaje", () => {
    const e = Object.assign(new Error("dni 30123456 de ana@x.com"), { name: "PrismaClientKnownRequestError", code: "P2002" });
    expect(resumenError(e)).toBe("PrismaClientKnownRequestError (P2002)");
    expect(resumenError(Object.assign(new Error("x"), { code: 500 }))).toBe("Error (500)");
    expect(resumenError(new TypeError("secreto"))).toBe("TypeError");
    expect(resumenError({ name: "" })).toBe("Error");
    expect(resumenError("texto con datos")).toBe("string");
    expect(resumenError(null)).toBe("object");
  });
});
