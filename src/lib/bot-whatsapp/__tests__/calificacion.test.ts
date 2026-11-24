import { describe, it, expect, vi, afterEach } from "vitest";
import {
  OPCIONES,
  CIERRES_CALIFICADO,
  bloqueEstado,
  camposPreguntados,
  contenidoConOpciones,
  indiceDe,
  nombreDePila,
  opcionesPara,
  preguntasDe,
  problemaDeRespuesta,
  siguientePaso,
  textoCierre,
  textoCorreccion,
  frasesProhibidas,
  escribeLasOpciones,
} from "../calificacion";
import { generarTurno, datosCombinados, correccionPara, CORRECCION_CIERRE, CORRECCION_DERIVAR, CORRECCION_OPCIONES } from "../turno";
import { LIMITES_INTERACTIVO } from "@/lib/whatsapp-cloud/cliente";
import type { MotorIA, ResultadoIA } from "../ia";
import type { RespuestaBot } from "../respuesta";

const VACIOS = { nombre: null, uso: null, zona: null, terreno: null, personas: null, plazo: null, origen: null, origenDetalle: null };
const resp = (r: Partial<RespuestaBot> & { datos?: Partial<RespuestaBot["datosExtraidos"]> } = {}): RespuestaBot => ({
  esLead: true,
  respuesta: "¿En qué localidad la instalarías y ya tenés terreno?",
  accion: "RESPONDER",
  motivo: "m",
  ...r,
  datosExtraidos: { ...VACIOS, ...r.datos },
});
const USO = { input_tokens: 10, output_tokens: 5 };

afterEach(() => vi.restoreAllMocks());

describe("opciones de botones y listas", () => {
  it("respetan los límites de Meta", () => {
    for (const { interactivo } of Object.values(OPCIONES)) {
      const max = interactivo.tipo === "botones" ? LIMITES_INTERACTIVO.tituloBoton : LIMITES_INTERACTIVO.tituloFila;
      expect(interactivo.opciones.length).toBeLessThanOrEqual(interactivo.tipo === "botones" ? 3 : 10);
      for (const o of interactivo.opciones) expect(o.titulo.length).toBeLessThanOrEqual(max);
      if (interactivo.tipo === "lista") expect(interactivo.boton.length).toBeLessThanOrEqual(LIMITES_INTERACTIVO.botonLista);
    }
    expect(OPCIONES.USO.interactivo.opciones.map((o) => o.titulo)).toEqual(["Para vivir", "Para alquilar o invertir", "Campo o fin de semana", "Empresa u obra", "Otro"]);
    expect(OPCIONES.TERRENO.interactivo.opciones.map((o) => o.titulo)).toEqual(["Sí, tengo terreno", "Lo estoy buscando", "Todavía no"]);
    expect(OPCIONES.PLAZO.interactivo.opciones.map((o) => o.titulo)).toEqual(["Lo antes posible", "En unos meses", "Solo averiguando"]);
  });
});

describe("siguientePaso", () => {
  it("de a dos datos, en orden; solo lo que falta del paso", () => {
    expect(siguientePaso({}, 0)).toEqual({ tipo: "PREGUNTAR", campos: ["nombre", "uso"], opciones: "USO" });
    expect(siguientePaso({ uso: "vivir" }, 1)).toEqual({ tipo: "PREGUNTAR", campos: ["nombre"], opciones: null });
    expect(siguientePaso({ nombre: "Ana", uso: "vivir" }, 1)).toEqual({ tipo: "PREGUNTAR", campos: ["zona", "terreno"], opciones: "TERRENO" });
    expect(siguientePaso({ nombre: "Ana", uso: "vivir", terreno: "sí" }, 2)).toEqual({ tipo: "PREGUNTAR", campos: ["zona"], opciones: null });
    expect(siguientePaso({ nombre: "Ana", uso: "vivir", zona: "Rafaela", terreno: "sí" }, 2)).toEqual({ tipo: "PREGUNTAR", campos: ["personas", "plazo"], opciones: "PLAZO" });
  });
  it("cierra si no falta nada, o si tras 4 mensajes falta solo lo secundario; un dato en blanco no cuenta", () => {
    const base = { nombre: "Ana", uso: "vivir", zona: "Rafaela", terreno: "sí" };
    expect(siguientePaso({ ...base, personas: "3", plazo: "ya" }, 1)).toEqual({ tipo: "CERRAR" });
    expect(siguientePaso(base, 3)).toEqual({ tipo: "PREGUNTAR", campos: ["personas", "plazo"], opciones: "PLAZO" });
    expect(siguientePaso(base, 4)).toEqual({ tipo: "CERRAR" });
    expect(siguientePaso({ ...base, personas: "3" }, 4)).toEqual({ tipo: "CERRAR" });
    expect(siguientePaso({ ...base, nombre: "  " }, 5)).toEqual({ tipo: "PREGUNTAR", campos: ["nombre"], opciones: null });
  });
});

describe("bloqueEstado", () => {
  it("datos obtenidos, los que faltan, el próximo paso y la corrección", () => {
    const b = bloqueEstado({ datos: { nombre: " Sofía Martínez ", uso: "Para vivir", zona: null }, mensajesBot: 1, correccion: "no repitas" });
    expect(b).toContain("Mensajes que ya mandaste: 1.");
    expect(b).toContain("DATOS YA OBTENIDOS (nunca los vuelvas a preguntar):\n- nombre y apellido: Sofía Martínez\n- para qué la quiere (uso): Para vivir");
    expect(b).toContain("DATOS QUE FALTAN:\n- localidad donde la instalaría\n- si tiene terreno\n- cuántas personas la van a usar\n- para cuándo la necesita");
    expect(b).toContain("preguntar solo localidad donde la instalaría y si tiene terreno.");
    expect(b).toContain("CORRECCIÓN: no repitas");
  });
  it("sin datos y con todo completo", () => {
    expect(bloqueEstado({ datos: {}, mensajesBot: 0 })).toContain("- (ninguno todavía)");
    const todo = bloqueEstado({ datos: { nombre: "a", uso: "b", zona: "c", terreno: "d", personas: "e", plazo: "f" }, mensajesBot: 3 });
    expect(todo).toContain("DATOS QUE FALTAN:\n- (ninguno)");
    expect(todo).toContain('cerrar (accion "CALIFICADO")');
    expect(todo).not.toContain("CORRECCIÓN");
  });
});

describe("qué datos pregunta una respuesta", () => {
  it("solo mira las preguntas, desde el ¿", () => {
    expect(preguntasDe("Para vivir quedan cómodas. Llegan terminadas, ¿en qué localidad sería? Gracias.")).toEqual(["¿en qué localidad sería?"]);
    expect(preguntasDe("Sin preguntas.")).toEqual([]);
    expect(preguntasDe("y vos?")).toEqual(["y vos?"]);
  });
  it.each([
    ["¡Hola! Para empezar, ¿me decís tu nombre y apellido y para qué estás pensando la casa?", ["nombre", "uso"]],
    ["¿Cómo te llamás?", ["nombre"]],
    ["Para vivir son ideales. ¿En qué localidad la instalarías y ya tenés terreno?", ["zona", "terreno"]],
    ["¿Dónde sería?", ["zona"]],
    ["¿Cuántas personas la van a usar y para cuándo la necesitás?", ["personas", "plazo"]],
    ["¿Para cuándo te imaginás tenerla?", ["plazo"]],
    ["¿La querés para vivir o para alquilar?", ["uso"]],
    ["Luciano te va a escribir.", []],
  ])("%s", (texto, campos) => {
    expect(camposPreguntados(texto)).toEqual(campos);
  });
  it("problemaDeRespuesta: repetidos y más de dos datos", () => {
    expect(problemaDeRespuesta("¿En qué localidad sería y tenés terreno?", { nombre: "Ana" })).toBeNull();
    expect(problemaDeRespuesta("¿En qué localidad sería?", { zona: "Rafaela" })).toEqual({ repetidos: ["zona"], demasiados: false });
    expect(problemaDeRespuesta("¿Dónde sería, tenés terreno y para cuándo?", {})).toEqual({ repetidos: [], demasiados: true });
  });
  it("textoCorreccion", () => {
    expect(textoCorreccion({ repetidos: ["zona"], demasiados: false })).toBe(
      "tu respuesta anterior volvía a preguntar localidad donde la instalaría, que ya está obtenido. No lo preguntes: preguntá solo lo que falta.",
    );
    expect(textoCorreccion({ repetidos: [], demasiados: true })).toContain("más de dos datos");
  });
  it("opcionesPara: la del dato preguntado que falta", () => {
    expect(opcionesPara("¿Me decís tu nombre y para qué la querés?", {})).toBe("USO");
    expect(opcionesPara("¿En qué localidad y ya tenés terreno?", {})).toBe("TERRENO");
    expect(opcionesPara("¿Cuántas personas y para cuándo la necesitás?", {})).toBe("PLAZO");
    expect(opcionesPara("¿Ya tenés terreno?", { terreno: "sí" })).toBeNull();
    expect(opcionesPara("¿En qué localidad sería?", {})).toBeNull();
  });
  it("contenidoConOpciones", () => {
    expect(contenidoConOpciones("¿Ya tenés terreno?", OPCIONES.TERRENO.interactivo)).toBe("¿Ya tenés terreno?\n[Opciones: Sí, tengo terreno / Lo estoy buscando / Todavía no]");
    expect(contenidoConOpciones("Hola", null)).toBe("Hola");
  });
});

describe("cierre", () => {
  it("tres variantes con el nombre de pila, sin prometer hoy ni plazos", () => {
    expect(CIERRES_CALIFICADO).toHaveLength(3);
    for (const c of CIERRES_CALIFICADO) {
      for (const t of [c.conNombre("Sofía"), c.sinNombre]) expect(t).not.toMatch(/\bhoy\b|en el d[ií]a|\bhoras?\b|enseguida/i);
      expect(c.conNombre("Sofía")).toContain("Sofía");
    }
    const vistos = new Set(["a", "b", "c", "d", "e", "f", "g"].map((x) => indiceDe(x, 3)));
    expect(vistos.size).toBe(3);
    expect(indiceDe("lead-1", 3)).toBe(indiceDe("lead-1", 3));
  });
  it("nombreDePila y textoCierre", () => {
    expect(nombreDePila("sofía martínez")).toBe("Sofía");
    expect(nombreDePila("  ")).toBeNull();
    expect(nombreDePila(null)).toBeNull();
    expect(nombreDePila("x".repeat(31))).toBeNull();
    const semilla = "a";
    const i = indiceDe(semilla, 3);
    expect(textoCierre("Ana Pérez", semilla)).toBe(CIERRES_CALIFICADO[i].conNombre("Ana"));
    expect(textoCierre(null, semilla)).toBe(CIERRES_CALIFICADO[i].sinNombre);
  });
});

describe("generarTurno", () => {
  function motor(...respuestas: (RespuestaBot | ResultadoIA)[]) {
    const llamadas: unknown[] = [];
    const ia: MotorIA = {
      async responder(_h, ctx) {
        llamadas.push(ctx);
        const r = respuestas.shift()!;
        return "ok" in r ? r : { ok: true, respuesta: r, uso: USO };
      },
    };
    return { ia, llamadas };
  }
  const H = [{ autor: "CLIENTE" as const, tipo: "TEXTO" as const, contenido: "Hola" }];

  it("respuesta buena: una sola llamada y botones del dato preguntado", async () => {
    const { ia, llamadas } = motor(resp({ datos: { nombre: "Ana", uso: "vivir" } }));
    const t = await generarTurno(ia, H, { datos: {}, mensajesBot: 1 }, "l1");
    expect(llamadas).toHaveLength(1);
    expect(t).toMatchObject({ ok: true, texto: "¿En qué localidad la instalarías y ya tenés terreno?", interactivo: OPCIONES.TERRENO.interactivo, regenerado: false, usos: [USO] });
  });

  it("vuelve a pedir un dato ya obtenido: regenera UNA vez con la corrección", async () => {
    const { ia, llamadas } = motor(resp({ respuesta: "¿En qué localidad sería?" }), resp({ respuesta: "¿Ya tenés terreno?" }));
    const t = await generarTurno(ia, H, { datos: { nombre: "Ana", uso: "vivir", zona: "Rafaela" }, mensajesBot: 2 }, "l1");
    expect(llamadas).toHaveLength(2);
    expect((llamadas[1] as { correccion: string }).correccion).toContain("localidad donde la instalaría, que ya está obtenido");
    expect(t).toMatchObject({ ok: true, texto: "¿Ya tenés terreno?", interactivo: OPCIONES.TERRENO.interactivo, regenerado: true, usos: [USO, USO] });
  });

  it("también cuenta lo que el cliente acaba de dar en este mensaje", async () => {
    const { ia, llamadas } = motor(resp({ respuesta: "¿En qué localidad sería?", datos: { zona: "Rafaela" } }), resp({ respuesta: "¿Tenés terreno?", datos: { zona: "Rafaela" } }));
    await generarTurno(ia, H, { datos: { nombre: "Ana", uso: "vivir" }, mensajesBot: 1 }, "l1");
    expect(llamadas).toHaveLength(2);
  });

  it("si la regenerada sigue mal, se manda igual (y se registra); si falla, queda la primera", async () => {
    const info = vi.spyOn(console, "info").mockImplementation(() => {});
    const mala = resp({ respuesta: "¿En qué localidad sería?" });
    const a = motor(mala, mala);
    const t = await generarTurno(a.ia, H, { datos: { zona: "Rafaela" }, mensajesBot: 1 }, "l1");
    expect(t.ok && t.texto).toBe("¿En qué localidad sería?");
    expect(info).toHaveBeenCalledWith(expect.stringContaining("se manda igual"));
    const b = motor(mala, { ok: false, motivo: "ERROR", uso: null });
    const t2 = await generarTurno(b.ia, H, { datos: { zona: "Rafaela" }, mensajesBot: 1 }, "l1");
    expect(t2).toMatchObject({ ok: true, texto: "¿En qué localidad sería?", usos: [USO] });
  });

  it("si la regenerada sigue preguntando cuando ya toca cerrar, cierra igual", async () => {
    vi.spyOn(console, "info").mockImplementation(() => {});
    const datos = { nombre: "Ana", uso: "vivir", zona: "Rafaela", terreno: "sí" };
    const pregunta = resp({ respuesta: "¿Cuántas personas la van a usar?" });
    const { ia } = motor(pregunta, pregunta);
    const t = await generarTurno(ia, H, { datos, mensajesBot: 4 }, "l1");
    expect(t).toMatchObject({ ok: true, respuesta: { accion: "CALIFICADO" }, texto: textoCierre("Ana", "l1"), interactivo: null, regenerado: true });
    expect(vi.mocked(console.info)).toHaveBeenCalledWith(expect.stringContaining("Cierre forzado"));
  });

  it("frase prohibida (hoy, relleno, término técnico): regenera una vez", async () => {
    const { ia, llamadas } = motor(resp({ respuesta: "Es una zona linda. Luciano te escribe hoy. ¿Dónde sería?" }), resp());
    const t = await generarTurno(ia, H, { datos: {}, mensajesBot: 1 }, "l1");
    expect((llamadas[1] as { correccion: string }).correccion).toBe(
      'tu respuesta anterior tenía promete "hoy" o un plazo de respuesta y frases de relleno o elogios genéricos: sacalo.',
    );
    expect(t.ok && t.texto).toBe("¿En qué localidad la instalarías y ya tenés terreno?");
    expect(frasesProhibidas("Los detalles, como la aislación, los ve Luciano.")).toEqual(["términos técnicos"]);
    expect(frasesProhibidas("Luciano te va a escribir a la brevedad.")).toEqual([]);
  });

  it("ya toca cerrar y sigue preguntando: regenera con la corrección de cierre", async () => {
    const datos = { nombre: "Ana", uso: "vivir", zona: "Rafaela", terreno: "sí" };
    const { ia, llamadas } = motor(resp({ respuesta: "¿Cuántas personas la van a usar?" }), resp({ accion: "CALIFICADO", respuesta: "Gracias, Ana." }));
    const t = await generarTurno(ia, H, { datos, mensajesBot: 4 }, "l1");
    expect((llamadas[1] as { correccion: string }).correccion).toBe(CORRECCION_CIERRE);
    expect(t).toMatchObject({ ok: true, texto: textoCierre("Ana", "l1"), interactivo: null });
  });

  it("CALIFICADO usa el cierre fijo con el nombre que acaba de dar; DERIVAR sin botones; error de la IA", async () => {
    const cal = motor(resp({ accion: "CALIFICADO", respuesta: "Gracias", datos: { nombre: "sofía martínez" } }));
    expect(await generarTurno(cal.ia, H, { datos: {}, mensajesBot: 3 }, "x")).toMatchObject({ ok: true, texto: textoCierre("Sofía", "x") });
    const der = motor(resp({ accion: "DERIVAR", respuesta: "Le aviso a Luciano y te contacta. ¿Ya tenés terreno?" }));
    expect(await generarTurno(der.ia, H, { datos: {}, mensajesBot: 0 }, "x")).toMatchObject({ ok: true, interactivo: null });
    const err = motor({ ok: false, motivo: "INVALIDO", uso: USO });
    expect(await generarTurno(err.ia, H, { datos: {}, mensajesBot: 0 }, "x")).toEqual({ ok: false, motivo: "INVALIDO", usos: [USO] });
    const sinUso = motor({ ok: false, motivo: "ERROR", uso: null });
    expect(await generarTurno(sinUso.ia, H, { datos: {}, mensajesBot: 0 }, "x")).toEqual({ ok: false, motivo: "ERROR", usos: [] });
  });

  it.each([
    "Las casas arrancan desde USD 30.000.",
    "Sale unos 45 mil dólares.",
    "Está en $ 25.000.000 aproximadamente.",
    "Ronda los 900 USD por m².",
    "Son 1.200 dólares el m2.",
    "Desde 30000 según el modelo.",
    "Unos 20 millones de pesos.",
    "u$s 800 / m2",
  ])("cifras de precio → regenera: %s", (texto) => {
    expect(frasesProhibidas(texto)).toContain("cifras de precio");
    expect(correccionPara(resp({ respuesta: `${texto} ¿En qué localidad sería?` }), { datos: {}, mensajesBot: 1 })).toContain("cifras de precio");
  });

  it("sin cifras no hay problema de precio", () => {
    expect(frasesProhibidas("Cada casa se arma a medida, así que el precio depende de lo que necesites y Luciano te arma el presupuesto exacto.")).toEqual([]);
    expect(frasesProhibidas("Somos 4 y la necesitamos para marzo, con 2 espacios privados.")).toEqual([]);
  });

  it.each(["¿Cuántos dormitorios necesitás?", "Tiene 2 habitaciones.", "Una habitación más", "un DORMITORIO"])('"dormitorio"/"habitación" → regenera: %s', (texto) => {
    expect(frasesProhibidas(texto)).toEqual(['la palabra "dormitorio" o "habitación" (se dice "espacios privados")']);
    expect(correccionPara(resp({ respuesta: texto }), { datos: {}, mensajesBot: 1 })).toContain('se dice "espacios privados"');
  });

  it("opciones escritas en el texto cuando ya van como lista o botones → regenera", () => {
    expect(escribeLasOpciones("Gracias, Laura. ¿Para qué estás pensando la casa: para vivir, para alquilar, para un campo o para una obra?", "USO")).toBe(true);
    expect(escribeLasOpciones("Para vivir quedan cómodas. ¿Para qué otra cosa la pensás?", "USO")).toBe(false);
    expect(escribeLasOpciones("¿Ya tenés terreno, lo estás buscando o todavía no?", "TERRENO")).toBe(true);
    expect(escribeLasOpciones("¿Cuántos son y la querés lo antes posible o en unos meses?", "PLAZO")).toBe(true);
    const ctx = { datos: { nombre: "Laura" }, mensajesBot: 1 };
    expect(correccionPara(resp({ respuesta: "¿Para qué la pensás: para vivir o para alquilar?" }), ctx)).toBe(CORRECCION_OPCIONES);
    expect(correccionPara(resp({ respuesta: "¿Para qué estás pensando la casa?" }), ctx)).toBeNull();
    // Sin lista (el uso ya está), nombrar usos no es escribir opciones.
    expect(correccionPara(resp({ respuesta: "¿Dónde la instalarías?", datos: { uso: "vivir" } }), ctx)).toBeNull();
  });

  it("DERIVAR que no dice que Luciano le escribe: corrección", () => {
    expect(correccionPara(resp({ accion: "DERIVAR", respuesta: "Le paso tu consulta a Luciano." }), { datos: {}, mensajesBot: 0 })).toBe(CORRECCION_DERIVAR);
    expect(correccionPara(resp({ accion: "DERIVAR", respuesta: "Le aviso a Luciano y te contacta él." }), { datos: {}, mensajesBot: 0 })).toBeNull();
  });

  it("correccionPara ignora NO_RESPONDER y no-leads; datosCombinados no pisa lo guardado", () => {
    expect(correccionPara(resp({ accion: "NO_RESPONDER", respuesta: "¿Dónde?" }), { datos: { zona: "x" }, mensajesBot: 0 })).toBeNull();
    expect(correccionPara(resp({ esLead: false, respuesta: "¿Dónde?" }), { datos: { zona: "x" }, mensajesBot: 0 })).toBeNull();
    expect(datosCombinados({ zona: "Rafaela" }, resp({ datos: { zona: "Sunchales", nombre: " Ana " } }))).toEqual({ zona: "Rafaela", nombre: "Ana" });
  });
});
