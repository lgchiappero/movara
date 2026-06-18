import { describe, it, expect } from "vitest";
import {
  nombreSchema,
  razonSocialSchema,
  telefonoSchema,
  emailSchema,
  localidadSchema,
  particularSchema,
  empresaSchema,
  validateField,
  sanitizarLinea,
  normalizarTelefono,
  sanitizarMensaje,
} from "@/lib/validators/configurador";

// ─── nombreSchema ─────────────────────────────────────────

describe("nombreSchema", () => {
  it.each([
    "Juan García",
    "María-José",
    "Ana",
    "José Luis",
    "O'Brien",
  ])("acepta '%s'", (val) => {
    expect(nombreSchema.safeParse(val).success).toBe(true);
  });

  it("rechaza menos de 3 caracteres", () => {
    expect(nombreSchema.safeParse("AB").success).toBe(false);
  });

  it("rechaza string vacío", () => {
    expect(nombreSchema.safeParse("").success).toBe(false);
  });

  it("rechaza números en el nombre", () => {
    expect(nombreSchema.safeParse("Juan123").success).toBe(false);
  });

  it("rechaza caracteres HTML", () => {
    expect(nombreSchema.safeParse("Juan<script>alert(1)</script>").success).toBe(false);
  });

  it("rechaza signo igual y otros especiales", () => {
    expect(nombreSchema.safeParse("Juan=Garcia").success).toBe(false);
  });

  it("rechaza más de 100 caracteres", () => {
    expect(nombreSchema.safeParse("A".repeat(101)).success).toBe(false);
  });

  it("acepta exactamente 100 caracteres de letras", () => {
    expect(nombreSchema.safeParse("a".repeat(100)).success).toBe(true);
  });

  it("incluye mensaje de error descriptivo al fallar", () => {
    const result = nombreSchema.safeParse("AB");
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].message).toMatch(/mínimo/i);
    }
  });
});

// ─── razonSocialSchema ────────────────────────────────────

describe("razonSocialSchema", () => {
  it.each([
    "Constructora ABC S.A.",
    "Empresa & Cía",
    "MOVARA Corp.",
    "Tech Startup 2024",
    "Grupo, S.R.L.",
  ])("acepta '%s'", (val) => {
    expect(razonSocialSchema.safeParse(val).success).toBe(true);
  });

  it("rechaza HTML/tags", () => {
    expect(razonSocialSchema.safeParse("<script>alert(1)</script>").success).toBe(false);
  });

  it("rechaza menos de 3 caracteres", () => {
    expect(razonSocialSchema.safeParse("AB").success).toBe(false);
  });

  it("rechaza más de 150 caracteres", () => {
    expect(razonSocialSchema.safeParse("A".repeat(151)).success).toBe(false);
  });

  it("rechaza paréntesis angulares", () => {
    expect(razonSocialSchema.safeParse("Empresa <nombre>").success).toBe(false);
  });
});

// ─── telefonoSchema ───────────────────────────────────────

describe("telefonoSchema", () => {
  it.each([
    "+54 9 11 1234-5678",
    "+541112345678",
    "011 1234-5678",
    "(011) 4444-5555",
    "01112345678",
  ])("acepta '%s'", (val) => {
    expect(telefonoSchema.safeParse(val).success).toBe(true);
  });

  it("rechaza menos de 8 caracteres", () => {
    expect(telefonoSchema.safeParse("1234567").success).toBe(false);
  });

  it("rechaza letras", () => {
    expect(telefonoSchema.safeParse("abcdefghij").success).toBe(false);
  });

  it("rechaza más de 20 caracteres", () => {
    expect(telefonoSchema.safeParse("1".repeat(21)).success).toBe(false);
  });

  it("rechaza string vacío", () => {
    expect(telefonoSchema.safeParse("").success).toBe(false);
  });
});

// ─── emailSchema ──────────────────────────────────────────

describe("emailSchema", () => {
  it.each([
    "user@example.com",
    "contacto@empresa.com.ar",
    "nombre.apellido@dominio.org",
    "test+tag@mail.io",
  ])("acepta '%s'", (val) => {
    expect(emailSchema.safeParse(val).success).toBe(true);
  });

  it("rechaza email sin arroba", () => {
    expect(emailSchema.safeParse("sindoblearroba.com").success).toBe(false);
  });

  it("rechaza email sin dominio después de @", () => {
    expect(emailSchema.safeParse("user@").success).toBe(false);
  });

  it("rechaza email sin punto en dominio", () => {
    expect(emailSchema.safeParse("user@nodot").success).toBe(false);
  });

  it("rechaza string vacío", () => {
    expect(emailSchema.safeParse("").success).toBe(false);
  });

  it("rechaza más de 254 caracteres", () => {
    const local = "a".repeat(243);
    expect(emailSchema.safeParse(`${local}@example.com`).success).toBe(false);
  });

  it("acepta exactamente 254 caracteres", () => {
    // 241 + "@example.com" (12) = 253 — should pass
    const valid = "a".repeat(241) + "@example.com";
    expect(valid.length).toBeLessThanOrEqual(254);
    expect(emailSchema.safeParse(valid).success).toBe(true);
  });
});

// ─── localidadSchema ──────────────────────────────────────

describe("localidadSchema", () => {
  it.each([
    "Buenos Aires",
    "Río Cuarto",
    "San Carlos de Bariloche",
    "Mendoza",
    "Córdoba",
  ])("acepta '%s'", (val) => {
    expect(localidadSchema.safeParse(val).success).toBe(true);
  });

  it("rechaza un solo carácter", () => {
    expect(localidadSchema.safeParse("A").success).toBe(false);
  });

  it("rechaza números", () => {
    expect(localidadSchema.safeParse("Ciudad2024").success).toBe(false);
  });

  it("rechaza caracteres HTML", () => {
    expect(localidadSchema.safeParse("Ciudad<script>").success).toBe(false);
  });

  it("rechaza más de 100 caracteres", () => {
    expect(localidadSchema.safeParse("a".repeat(101)).success).toBe(false);
  });
});

// ─── particularSchema ─────────────────────────────────────

describe("particularSchema", () => {
  const valid = {
    nombre: "Juan García",
    telefono: "+54 9 11 1234-5678",
    email: "juan@example.com",
  };

  it("acepta un conjunto de datos válidos", () => {
    expect(particularSchema.safeParse(valid).success).toBe(true);
  });

  it("rechaza nombre inválido", () => {
    expect(particularSchema.safeParse({ ...valid, nombre: "AB" }).success).toBe(false);
  });

  it("rechaza teléfono inválido", () => {
    expect(particularSchema.safeParse({ ...valid, telefono: "123" }).success).toBe(false);
  });

  it("rechaza email inválido", () => {
    expect(particularSchema.safeParse({ ...valid, email: "noemail" }).success).toBe(false);
  });

  it("rechaza nombre vacío", () => {
    expect(particularSchema.safeParse({ ...valid, nombre: "" }).success).toBe(false);
  });

  it("rechaza objeto vacío", () => {
    expect(particularSchema.safeParse({}).success).toBe(false);
  });
});

// ─── empresaSchema ────────────────────────────────────────

describe("empresaSchema", () => {
  const valid = {
    razonSocial: "Constructora S.A.",
    nombreContacto: "María López",
    telefono: "+54 9 11 1234-5678",
    email: "contacto@constructora.com",
  };

  it("acepta un conjunto de datos válidos", () => {
    expect(empresaSchema.safeParse(valid).success).toBe(true);
  });

  it("rechaza razón social demasiado corta", () => {
    expect(empresaSchema.safeParse({ ...valid, razonSocial: "AB" }).success).toBe(false);
  });

  it("rechaza nombre de contacto demasiado corto", () => {
    expect(empresaSchema.safeParse({ ...valid, nombreContacto: "AB" }).success).toBe(false);
  });

  it("rechaza email malformado", () => {
    expect(empresaSchema.safeParse({ ...valid, email: "bad" }).success).toBe(false);
  });

  it("rechaza objeto vacío", () => {
    expect(empresaSchema.safeParse({}).success).toBe(false);
  });
});

// ─── validateField ────────────────────────────────────────

describe("validateField", () => {
  it("devuelve null para un valor válido", () => {
    expect(validateField(emailSchema, "ok@example.com")).toBeNull();
  });

  it("devuelve string con mensaje de error para valor inválido", () => {
    const msg = validateField(emailSchema, "noemail");
    expect(msg).toBeTypeOf("string");
    expect(msg!.length).toBeGreaterThan(0);
  });

  it("devuelve el primer mensaje de error disponible", () => {
    const msg = validateField(nombreSchema, "AB");
    expect(msg).toMatch(/mínimo/i);
  });

  it("funciona con telefonoSchema", () => {
    expect(validateField(telefonoSchema, "123")).not.toBeNull();
    expect(validateField(telefonoSchema, "+54 9 11 1234-5678")).toBeNull();
  });
});

// ─── sanitizarLinea ───────────────────────────────────────

describe("sanitizarLinea", () => {
  it("elimina saltos de línea \\n", () => {
    expect(sanitizarLinea("hola\nmundo")).toBe("hola mundo");
  });

  it("elimina carriage return \\r", () => {
    expect(sanitizarLinea("hola\rmundo")).toBe("hola mundo");
  });

  it("elimina tabs \\t", () => {
    expect(sanitizarLinea("hola\tmundo")).toBe("hola mundo");
  });

  it("hace trim de espacios al inicio y al fin", () => {
    expect(sanitizarLinea("  hola mundo  ")).toBe("hola mundo");
  });

  it("no modifica strings normales", () => {
    expect(sanitizarLinea("texto normal")).toBe("texto normal");
  });

  it("maneja string vacío", () => {
    expect(sanitizarLinea("")).toBe("");
  });

  it("maneja múltiples caracteres de control combinados", () => {
    expect(sanitizarLinea("a\r\nb\tc")).toBe("a  b c");
  });
});

// ─── normalizarTelefono ───────────────────────────────────

describe("normalizarTelefono", () => {
  it("mantiene el + inicial y extrae solo dígitos", () => {
    expect(normalizarTelefono("+54 9 11 1234-5678")).toBe("+5491112345678");
  });

  it("extrae solo dígitos cuando no hay + inicial", () => {
    expect(normalizarTelefono("011 1234-5678")).toBe("01112345678");
  });

  it("maneja paréntesis en el número", () => {
    expect(normalizarTelefono("(011) 4444-5555")).toBe("01144445555");
  });

  it("ya normalizado no cambia", () => {
    expect(normalizarTelefono("+5491112345678")).toBe("+5491112345678");
  });

  it("descarta + que no esté al inicio", () => {
    expect(normalizarTelefono("54+911+12345678")).toBe("5491112345678");
  });
});

// ─── sanitizarMensaje ─────────────────────────────────────

describe("sanitizarMensaje", () => {
  it("trunca a 1500 caracteres por defecto", () => {
    const long = "a".repeat(2000);
    expect(sanitizarMensaje(long).length).toBe(1500);
  });

  it("acepta longitud personalizada", () => {
    const long = "a".repeat(500);
    expect(sanitizarMensaje(long, 200).length).toBe(200);
  });

  it("no trunca mensajes más cortos que el límite", () => {
    const short = "Hola MOVARA! Necesito información.";
    expect(sanitizarMensaje(short)).toBe(short);
  });

  it("devuelve string vacío sin modificar", () => {
    expect(sanitizarMensaje("")).toBe("");
  });

  it("trunca exactamente en el límite", () => {
    const msg = "a".repeat(1500);
    expect(sanitizarMensaje(msg)).toBe(msg);
    expect(sanitizarMensaje("a".repeat(1501)).length).toBe(1500);
  });
});
