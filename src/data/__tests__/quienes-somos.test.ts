import { describe, it, expect } from "vitest";
import { QUIENES_SOMOS_DEFAULTS as D, resolverQuienesSomos } from "../quienes-somos";

describe("resolverQuienesSomos", () => {
  it("sin documento en Sanity usa todos los textos por defecto", () => {
    const r = resolverQuienesSomos(null);
    expect(r.hero).toEqual({ title: D.hero.title, subtitle: D.hero.subtitle, backgroundImage: null });
    expect(r.historia).toEqual(D.historia);
    expect(r.presencia).toEqual(D.presencia);
    expect(r.mision).toEqual(D.mision);
    expect(r.vision).toEqual(D.vision);
    expect(r.valores).toEqual(D.valores);
  });

  it("los defaults tienen 2 párrafos de historia, 3 bloques de presencia y 4 valores", () => {
    expect(D.historia.content).toHaveLength(2);
    expect(D.presencia.bloques.map((b) => b.subtitulo)).toEqual([
      "Dónde estamos",
      "Cómo llegamos a cada punto de la Argentina",
      "Hacia dónde vamos",
    ]);
    expect(D.valores.map((v) => v.title)).toEqual(["Transparencia", "Calidad verificable", "Acompañamiento", "Diseño"]);
  });

  it("lo cargado en Sanity gana y lo vacío cae al default, campo por campo", () => {
    const imagen = { asset: { _id: "img" } };
    const historia = [{ _type: "block", _key: "x" }];
    const r = resolverQuienesSomos({
      hero: { title: "Otro título", subtitle: "   ", backgroundImage: imagen },
      historia: { title: null, content: historia },
      presencia: { title: "", bloques: [{ _key: "a", subtitulo: "Uno", texto: "Texto uno" }] },
      mision: { text: "Otra misión" },
      vision: { title: "Mirada" },
      valores: [{ _key: "v", icon: "🤝", title: "Cercanía", description: "Cerca" }],
    });
    expect(r.hero).toEqual({ title: "Otro título", subtitle: D.hero.subtitle, backgroundImage: imagen });
    expect(r.historia).toEqual({ title: D.historia.title, content: historia });
    expect(r.presencia).toEqual({ title: D.presencia.title, bloques: [{ _key: "a", subtitulo: "Uno", texto: "Texto uno" }] });
    expect(r.mision).toEqual({ title: D.mision.title, text: "Otra misión" });
    expect(r.vision).toEqual({ title: "Mirada", text: D.vision.text });
    expect(r.valores).toEqual([{ _key: "v", icon: "🤝", title: "Cercanía", description: "Cerca" }]);
  });

  it("descarta bloques y valores incompletos, y genera keys si faltan", () => {
    const r = resolverQuienesSomos({
      historia: { content: [] },
      presencia: {
        bloques: [
          { subtitulo: "Sin texto" },
          { subtitulo: "Completo", texto: "Sí" },
        ],
      },
      valores: [{ description: "sin título" }, { title: "Solo título" }],
    });
    expect(r.historia.content).toEqual(D.historia.content);
    expect(r.presencia.bloques).toEqual([{ _key: "bloque-0", subtitulo: "Completo", texto: "Sí" }]);
    expect(r.valores).toEqual([{ _key: "valor-0", icon: null, title: "Solo título", description: "" }]);
  });

  it("si todos los bloques y valores están vacíos, usa los defaults", () => {
    const r = resolverQuienesSomos({ presencia: { bloques: [{ texto: "x" }] }, valores: [{ title: " " }] });
    expect(r.presencia.bloques).toEqual(D.presencia.bloques);
    expect(r.valores).toEqual(D.valores);
  });

  it("ignora la sección Equipo aunque tenga datos", () => {
    const r = resolverQuienesSomos({ equipo: [{ _key: "e", name: "Ana" }] });
    expect(r).not.toHaveProperty("equipo");
  });
});
