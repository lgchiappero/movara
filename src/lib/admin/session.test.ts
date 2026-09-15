// @vitest-environment node
//
// jose (webapi build) compara `instanceof Uint8Array` contra el realm de
// Node — bajo jsdom (el entorno global del proyecto) el Uint8Array de jsdom
// es un constructor distinto y la verificación falla con un error confuso
// de "tipo de key inválido" aunque el valor sí sea un Uint8Array real.
// session.ts es código server-only, así que forzar entorno Node acá es
// correcto y no un workaround artificial.
import { describe, it, expect, beforeEach, vi } from "vitest";
import { createSessionToken, verifySessionToken } from "@/lib/admin/session";

beforeEach(() => {
  vi.stubEnv("AUTH_SECRET", "test-secret-de-al-menos-32-caracteres-para-hs256");
});

describe("createSessionToken / verifySessionToken", () => {
  it("un token recién creado verifica y devuelve el userId original", async () => {
    const token = await createSessionToken("user-123");
    const payload = await verifySessionToken(token);
    expect(payload).toEqual({ sub: "user-123" });
  });

  it("rechaza un token manipulado", async () => {
    const token = await createSessionToken("user-123");
    const tampered = token.slice(0, -4) + "abcd";
    expect(await verifySessionToken(tampered)).toBeNull();
  });

  it("rechaza un token firmado con otro secreto", async () => {
    const token = await createSessionToken("user-123");
    vi.stubEnv("AUTH_SECRET", "otro-secreto-completamente-distinto-32-caracteres");
    expect(await verifySessionToken(token)).toBeNull();
  });

  it("rechaza basura que no es un JWT", async () => {
    expect(await verifySessionToken("no-soy-un-jwt")).toBeNull();
  });
});
