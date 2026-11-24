import { describe, it, expect } from "vitest";
import { leerVcf, telefonosDeVcf } from "../vcard";
import { prepararImportacion, telefonosValidos, normalizarImportado, limpiarCaracteristica, MAX_ETIQUETA_IMPORTADA } from "../importar-excluidos";

const vcf = (...lineas: string[]) => lineas.join("\r\n");

describe("leerVcf", () => {
  it("vCard 3.0 (iPhone): nombre FN y varios teléfonos, con grupos y parámetros", () => {
    const texto = vcf(
      "BEGIN:VCARD",
      "VERSION:3.0",
      "N:Martínez;Sofía;;;",
      "FN:Sofía Martínez",
      "item1.TEL;type=CELL;type=VOICE;type=pref:+54 9 3493 66-7214",
      "TEL;TYPE=HOME:03493 15 111111",
      "EMAIL:sofia@ejemplo.com",
      "END:VCARD",
    );
    expect(leerVcf(texto)).toEqual([{ nombre: "Sofía Martínez", telefonos: ["+54 9 3493 66-7214", "03493 15 111111"] }]);
  });

  it("vCard 2.1 (Android): quoted-printable en UTF-8 con línea partida", () => {
    const texto = vcf(
      "BEGIN:VCARD",
      "VERSION:2.1",
      "N;CHARSET=UTF-8;ENCODING=QUOTED-PRINTABLE:;Jos=C3=A9;;;",
      "FN;CHARSET=UTF-8;ENCODING=QUOTED-PRINTABLE:Jos=C3=A9 Gonz=C3=A1lez =",
      "(Corral=C3=B3n)",
      "TEL;CELL:3493667214",
      "END:VCARD",
    );
    expect(leerVcf(texto)).toEqual([{ nombre: "José González (Corralón)", telefonos: ["3493667214"] }]);
  });

  it("vCard 4.0: línea plegada, tel: URI, escapes; sin FN usa N; sin nombre queda null", () => {
    const texto = vcf(
      "BEGIN:VCARD",
      "VERSION:4.0",
      "FN:Pérez\\, Juan \; hijo\\nsegunda",
      " línea",
      "TEL;VALUE=uri:tel:+1-415-555-0123",
      "END:VCARD",
      "BEGIN:VCARD",
      "N:Gómez;Ana;María;Sra.;",
      "TEL:",
      "TEL:3493 222222",
      "END:VCARD",
      "BEGIN:VCARD",
      "TEL:3493 333333",
      "END:VCARD",
    );
    expect(leerVcf(texto)).toEqual([
      { nombre: "Pérez, Juan ; hijo segundalínea", telefonos: ["+1-415-555-0123"] },
      { nombre: "Ana María Gómez", telefonos: ["3493 222222"] },
      { nombre: null, telefonos: ["3493 333333"] },
    ]);
  });

  it("ignora líneas sueltas fuera de una tarjeta, sin dos puntos y la basura", () => {
    expect(leerVcf("TEL:3493667214\nhola\n\n BEGIN raro\nBEGIN:VCARD\nsin dos puntos\nEND:VCARD")).toEqual([{ nombre: null, telefonos: [] }]);
    expect(leerVcf("")).toEqual([]);
    expect(leerVcf("=C3=A9 sin nada")).toEqual([]);
  });

  it("quoted-printable con un = que no es escape lo deja como está", () => {
    expect(leerVcf(vcf("BEGIN:VCARD", "FN;QUOTED-PRINTABLE:a=ZZb ñ", "END:VCARD"))[0].nombre).toBe("a=ZZb ñ");
  });

  it("telefonosDeVcf: un renglón por teléfono con el nombre del contacto", () => {
    expect(telefonosDeVcf([{ nombre: "Ana", telefonos: ["1", "2"] }, { nombre: null, telefonos: ["3"] }])).toEqual([
      { telefono: "1", nombre: "Ana" },
      { telefono: "2", nombre: "Ana" },
      { telefono: "3", nombre: null },
    ]);
    const [largo] = telefonosDeVcf([{ nombre: "n".repeat(300), telefonos: ["9".repeat(100)] }]);
    expect(largo).toEqual({ telefono: "9".repeat(60), nombre: "n".repeat(MAX_ETIQUETA_IMPORTADA) });
  });
});

describe("prepararImportacion", () => {
  it("normaliza, separa repetidos, ya excluidos e inválidos; el nombre es la etiqueta", () => {
    const filas = [
      { telefono: "+54 9 3493 66-7214", nombre: "  Sofía   Martínez " },
      { telefono: "03493 15 667214", nombre: "Sofía (otra vez)" }, // mismo número
      { telefono: "3493 111111", nombre: "Ya estaba" },
      { telefono: "667214", nombre: "Sin área" },
      { telefono: "+1 415 555 0123", nombre: null },
      { telefono: "3493 222222", nombre: "x".repeat(200) },
    ];
    const r = prepararImportacion(filas, new Set(["5493493111111"]));
    expect(r).toEqual({
      nuevos: [
        { telefono: "5493493667214", etiqueta: "Sofía Martínez" },
        { telefono: "14155550123", etiqueta: "OTRO" },
        { telefono: "5493493222222", etiqueta: "x".repeat(MAX_ETIQUETA_IMPORTADA) },
      ],
      repetidos: 1,
      yaExcluidos: 1,
      invalidos: 1,
      completados: 0,
    });
  });

  it("telefonosValidos: normalizados y sin repetir", () => {
    expect(telefonosValidos([{ telefono: "3493667214", nombre: null }, { telefono: "+54 9 3493 66-7214", nombre: null }, { telefono: "abc", nombre: null }])).toEqual([
      "5493493667214",
    ]);
  });
});

describe("característica por defecto", () => {
  it("limpiarCaracteristica: 2 a 4 dígitos, sin el 0 de adelante", () => {
    expect(limpiarCaracteristica("3493")).toBe("3493");
    expect(limpiarCaracteristica(" 0 3493 ")).toBe("3493");
    expect(limpiarCaracteristica("011")).toBe("11");
    for (const x of ["", "0", "1", "12345", "abc", "0011"]) expect(limpiarCaracteristica(x)).toBeNull();
  });

  it("completa solo números locales que con la característica dan 10 dígitos", () => {
    expect(normalizarImportado("66-7214", "3493")).toEqual({ telefono: "5493493667214", completado: true });
    expect(normalizarImportado("15 667214", "3493")).toEqual({ telefono: "5493493667214", completado: true });
    expect(normalizarImportado("4567-8901", "11")).toEqual({ telefono: "5491145678901", completado: true });
    expect(normalizarImportado("155 1234", "3493")).toBeNull(); // 7 dígitos con 4 de área: no cierra
    expect(normalizarImportado("12345", "3493")).toBeNull();
    expect(normalizarImportado("+667214", "3493")).toBeNull(); // internacional: no se toca
    expect(normalizarImportado("00667214", "3493")).toBeNull();
    expect(normalizarImportado("667214", null)).toBeNull();
    // Un número completo nunca se completa (se normaliza como siempre).
    expect(normalizarImportado("3492 123456", "3493")).toEqual({ telefono: "5493492123456", completado: false });
  });

  it("prepararImportacion cuenta los completados entre los nuevos", () => {
    const filas = [
      { telefono: "66-7214", nombre: "Ana" },
      { telefono: "3493 667214", nombre: "Ana repetida" },
      { telefono: "15 111111", nombre: "Ya estaba" },
      { telefono: "15 222222", nombre: "Beto" },
    ];
    expect(prepararImportacion(filas, new Set(["5493493111111"]), "3493")).toEqual({
      nuevos: [
        { telefono: "5493493667214", etiqueta: "Ana" },
        { telefono: "5493493222222", etiqueta: "Beto" },
      ],
      repetidos: 1,
      yaExcluidos: 1,
      invalidos: 0,
      completados: 2,
    });
    expect(telefonosValidos(filas, "3493")).toEqual(["5493493667214", "5493493111111", "5493493222222"]);
  });
});
