import { describe, it, expect } from "vitest";
import {
  calcularPasos,
  pasoActual,
  accionesPasoActual,
  proximoPasoCorto,
  type DatosTimelineUnidad,
} from "@/lib/envios/timeline";

const BASE: DatosTimelineUnidad = {
  clienteId: "c1",
  modelo: null,
  precioCliente: null,
  estadoFabricacion: "pendiente",
  createdAt: new Date("2026-01-01"),
  fechaEntrega: null,
  fechaEmbarque: null,
  primerCobroFecha: null,
};

function estadoDe(id: string, pasos: ReturnType<typeof calcularPasos>) {
  return pasos.find((p) => p.id === id)!.estado;
}

describe("calcularPasos", () => {
  it("unidad recién vinculada a un cliente: venta_cerrada completado, unidad_creada actual, resto pendiente", () => {
    const pasos = calcularPasos(BASE);
    expect(estadoDe("venta_cerrada", pasos)).toBe("completado");
    expect(estadoDe("unidad_creada", pasos)).toBe("actual");
    expect(estadoDe("cobro_anticipo", pasos)).toBe("pendiente");
    expect(estadoDe("en_produccion", pasos)).toBe("pendiente");
  });

  it("sin clienteId, venta_cerrada queda actual (caso defensivo, no debería pasar en la práctica)", () => {
    const pasos = calcularPasos({ ...BASE, clienteId: null });
    expect(estadoDe("venta_cerrada", pasos)).toBe("actual");
    expect(estadoDe("unidad_creada", pasos)).toBe("pendiente");
  });

  it("con modelo y precio, cobro_anticipo pasa a actual", () => {
    const pasos = calcularPasos({ ...BASE, modelo: "Flex 18", precioCliente: 50000 });
    expect(estadoDe("unidad_creada", pasos)).toBe("completado");
    expect(estadoDe("cobro_anticipo", pasos)).toBe("actual");
  });

  it("con el primer cobro registrado, en_produccion pasa a actual (estado pendiente todavía)", () => {
    const pasos = calcularPasos({
      ...BASE,
      modelo: "Flex 18",
      precioCliente: 50000,
      primerCobroFecha: new Date("2026-02-01"),
    });
    expect(estadoDe("cobro_anticipo", pasos)).toBe("completado");
    expect(estadoDe("en_produccion", pasos)).toBe("actual");
  });

  it("estadoFabricacion=en_produccion: el paso en_produccion es actual (no completado)", () => {
    const pasos = calcularPasos({
      ...BASE,
      modelo: "Flex 18",
      precioCliente: 50000,
      primerCobroFecha: new Date("2026-02-01"),
      estadoFabricacion: "en_produccion",
    });
    expect(estadoDe("en_produccion", pasos)).toBe("actual");
    expect(estadoDe("embarque", pasos)).toBe("pendiente");
  });

  it("estadoFabricacion=produccion_completa: en_produccion completado, embarque pasa a actual", () => {
    const pasos = calcularPasos({
      ...BASE,
      modelo: "Flex 18",
      precioCliente: 50000,
      primerCobroFecha: new Date("2026-02-01"),
      estadoFabricacion: "produccion_completa",
    });
    expect(estadoDe("en_produccion", pasos)).toBe("completado");
    expect(estadoDe("embarque", pasos)).toBe("actual");
  });

  it("estadoFabricacion=embarcado SIN fechaEmbarque: embarque queda actual (falta el dato)", () => {
    const pasos = calcularPasos({
      ...BASE,
      modelo: "Flex 18",
      precioCliente: 50000,
      primerCobroFecha: new Date("2026-02-01"),
      estadoFabricacion: "embarcado",
      fechaEmbarque: null,
    });
    expect(estadoDe("embarque", pasos)).toBe("actual");
  });

  it("estadoFabricacion=embarcado CON fechaEmbarque: embarque sigue actual (todavía no pasó a en_transito)", () => {
    const pasos = calcularPasos({
      ...BASE,
      modelo: "Flex 18",
      precioCliente: 50000,
      primerCobroFecha: new Date("2026-02-01"),
      estadoFabricacion: "embarcado",
      fechaEmbarque: new Date("2026-03-01"),
    });
    expect(estadoDe("embarque", pasos)).toBe("actual");
    expect(estadoDe("en_transito", pasos)).toBe("pendiente");
  });

  it("con fechaEmbarque y estado ya en en_transito, embarque pasa a completado", () => {
    const pasos = calcularPasos({
      ...BASE,
      modelo: "Flex 18",
      precioCliente: 50000,
      primerCobroFecha: new Date("2026-02-01"),
      estadoFabricacion: "en_transito",
      fechaEmbarque: new Date("2026-03-01"),
    });
    expect(estadoDe("embarque", pasos)).toBe("completado");
    expect(estadoDe("en_transito", pasos)).toBe("actual");
  });

  it("aunque el estado real ya avanzó a en_transito, sin fechaEmbarque el gap sigue en embarque (secuencial)", () => {
    const pasos = calcularPasos({
      ...BASE,
      modelo: "Flex 18",
      precioCliente: 50000,
      primerCobroFecha: new Date("2026-02-01"),
      estadoFabricacion: "en_transito",
      fechaEmbarque: null,
    });
    expect(estadoDe("embarque", pasos)).toBe("actual");
    expect(estadoDe("en_transito", pasos)).toBe("pendiente");
  });

  it("estadoFabricacion=en_aduana con fechaEmbarque seteada: en_aduana actual", () => {
    const pasos = calcularPasos({
      ...BASE,
      modelo: "Flex 18",
      precioCliente: 50000,
      primerCobroFecha: new Date("2026-02-01"),
      estadoFabricacion: "en_aduana",
      fechaEmbarque: new Date("2026-03-01"),
    });
    expect(estadoDe("en_transito", pasos)).toBe("completado");
    expect(estadoDe("en_aduana", pasos)).toBe("actual");
  });

  it("estadoFabricacion=en_destino: en_destino actual", () => {
    const pasos = calcularPasos({
      ...BASE,
      modelo: "Flex 18",
      precioCliente: 50000,
      primerCobroFecha: new Date("2026-02-01"),
      estadoFabricacion: "en_destino",
      fechaEmbarque: new Date("2026-03-01"),
    });
    expect(estadoDe("en_aduana", pasos)).toBe("completado");
    expect(estadoDe("en_destino", pasos)).toBe("actual");
  });

  it("estadoFabricacion=entregado SIN fechaEntrega: entregado queda actual", () => {
    const pasos = calcularPasos({
      ...BASE,
      modelo: "Flex 18",
      precioCliente: 50000,
      primerCobroFecha: new Date("2026-02-01"),
      estadoFabricacion: "entregado",
      fechaEmbarque: new Date("2026-03-01"),
      fechaEntrega: null,
    });
    expect(estadoDe("en_destino", pasos)).toBe("completado");
    expect(estadoDe("entregado", pasos)).toBe("actual");
  });

  it("estadoFabricacion=entregado CON fechaEntrega: todos los pasos completados, ninguno actual", () => {
    const pasos = calcularPasos({
      ...BASE,
      modelo: "Flex 18",
      precioCliente: 50000,
      primerCobroFecha: new Date("2026-02-01"),
      estadoFabricacion: "entregado",
      fechaEmbarque: new Date("2026-03-01"),
      fechaEntrega: new Date("2026-06-01"),
    });
    expect(pasos.every((p) => p.estado === "completado")).toBe(true);
  });

  it("fechas: venta_cerrada y unidad_creada usan createdAt, cobro_anticipo usa primerCobroFecha", () => {
    const pasos = calcularPasos({ ...BASE, modelo: "Flex 18", precioCliente: 50000 });
    expect(pasos.find((p) => p.id === "venta_cerrada")!.fecha).toEqual(BASE.createdAt);
    expect(pasos.find((p) => p.id === "unidad_creada")!.fecha).toEqual(BASE.createdAt);
  });

  it("fechas: embarque usa fechaEmbarque y entregado usa fechaEntrega cuando están completos", () => {
    const pasos = calcularPasos({
      ...BASE,
      modelo: "Flex 18",
      precioCliente: 50000,
      primerCobroFecha: new Date("2026-02-01"),
      estadoFabricacion: "entregado",
      fechaEmbarque: new Date("2026-03-01"),
      fechaEntrega: new Date("2026-06-01"),
    });
    expect(pasos.find((p) => p.id === "embarque")!.fecha).toEqual(new Date("2026-03-01"));
    expect(pasos.find((p) => p.id === "entregado")!.fecha).toEqual(new Date("2026-06-01"));
  });

  it("fechas: en_produccion/en_transito/en_aduana/en_destino no tienen fecha propia (siempre null)", () => {
    const pasos = calcularPasos({
      ...BASE,
      modelo: "Flex 18",
      precioCliente: 50000,
      primerCobroFecha: new Date("2026-02-01"),
      estadoFabricacion: "entregado",
      fechaEmbarque: new Date("2026-03-01"),
      fechaEntrega: new Date("2026-06-01"),
    });
    expect(pasos.find((p) => p.id === "en_produccion")!.fecha).toBeNull();
    expect(pasos.find((p) => p.id === "en_transito")!.fecha).toBeNull();
    expect(pasos.find((p) => p.id === "en_aduana")!.fecha).toBeNull();
    expect(pasos.find((p) => p.id === "en_destino")!.fecha).toBeNull();
  });

  it("un paso pendiente nunca muestra fecha aunque su predicado individual sea verdadero", () => {
    // fechaEntrega ya está seteada pero el estado real todavía no llegó ahí
    // -> el paso "entregado" debe quedar pendiente y sin fecha.
    const pasos = calcularPasos({ ...BASE, fechaEntrega: new Date("2026-06-01") });
    expect(estadoDe("entregado", pasos)).toBe("pendiente");
    expect(pasos.find((p) => p.id === "entregado")!.fecha).toBeNull();
  });
});

describe("pasoActual", () => {
  it("devuelve el paso marcado 'actual'", () => {
    const pasos = calcularPasos(BASE);
    expect(pasoActual(pasos)?.id).toBe("unidad_creada");
  });

  it("null cuando todos los pasos están completados", () => {
    const pasos = calcularPasos({
      ...BASE,
      modelo: "Flex 18",
      precioCliente: 50000,
      primerCobroFecha: new Date("2026-02-01"),
      estadoFabricacion: "entregado",
      fechaEmbarque: new Date("2026-03-01"),
      fechaEntrega: new Date("2026-06-01"),
    });
    expect(pasoActual(pasos)).toBeNull();
  });
});

describe("accionesPasoActual", () => {
  it("null cuando no hay paso actual (todo completado)", () => {
    const d: DatosTimelineUnidad = {
      ...BASE,
      modelo: "Flex 18",
      precioCliente: 50000,
      primerCobroFecha: new Date("2026-02-01"),
      estadoFabricacion: "entregado",
      fechaEmbarque: new Date("2026-03-01"),
      fechaEntrega: new Date("2026-06-01"),
    };
    expect(accionesPasoActual(d)).toBeNull();
  });

  it("paso comercial 'unidad_creada' actual: título y acción propios", () => {
    const info = accionesPasoActual(BASE)!;
    expect(info.titulo).toBe("Unidad creada");
    expect(info.acciones).toEqual([{ texto: "Completar modelo y precio de la unidad", anchor: "datos-unidad" }]);
  });

  it("paso comercial 'cobro_anticipo' actual: título y acción propios", () => {
    const d: DatosTimelineUnidad = { ...BASE, modelo: "Flex 18", precioCliente: 50000 };
    const info = accionesPasoActual(d)!;
    expect(info.titulo).toBe("Cobro anticipo");
    expect(info.acciones).toEqual([{ texto: "Registrar el cobro del anticipo", anchor: "cobranza" }]);
  });

  it("paso de fabricación 'en_produccion' actual: usa el label real y sus 2 acciones", () => {
    const d: DatosTimelineUnidad = {
      ...BASE,
      modelo: "Flex 18",
      precioCliente: 50000,
      primerCobroFecha: new Date("2026-02-01"),
      estadoFabricacion: "en_produccion",
    };
    const info = accionesPasoActual(d)!;
    expect(info.titulo).toBe("En producción");
    expect(info.acciones).toHaveLength(2);
    expect(info.acciones[0]).toEqual({ texto: "Registrar pago primera cuota a fábrica", anchor: "cobranza" });
  });

  it("produccion_completa muestra su propio título preciso aunque el nodo visual resaltado sea 'Embarque'", () => {
    const d: DatosTimelineUnidad = {
      ...BASE,
      modelo: "Flex 18",
      precioCliente: 50000,
      primerCobroFecha: new Date("2026-02-01"),
      estadoFabricacion: "produccion_completa",
    };
    const info = accionesPasoActual(d)!;
    expect(info.titulo).toBe("Producción completa");
    expect(info.acciones[0].texto).toBe("Registrar pago saldo a fábrica");
  });

  it("en_aduana actual: sus 3 acciones exactas", () => {
    const d: DatosTimelineUnidad = {
      ...BASE,
      modelo: "Flex 18",
      precioCliente: 50000,
      primerCobroFecha: new Date("2026-02-01"),
      estadoFabricacion: "en_aduana",
      fechaEmbarque: new Date("2026-03-01"),
    };
    const info = accionesPasoActual(d)!;
    expect(info.acciones.map((a) => a.texto)).toEqual([
      "Registrar pago despachante",
      "Subir documentos carpeta 06",
      "Cobrar saldo al cliente",
    ]);
  });

  it("estadoFabricacion fuera del catálogo: fallback defensivo sin acciones", () => {
    const d: DatosTimelineUnidad = {
      ...BASE,
      modelo: "Flex 18",
      precioCliente: 50000,
      primerCobroFecha: new Date("2026-02-01"),
      estadoFabricacion: "estado-inventado",
    };
    const info = accionesPasoActual(d)!;
    expect(info.acciones).toEqual([]);
  });

  it("entregado actual (sin fechaEntrega): sus 3 acciones exactas", () => {
    const d: DatosTimelineUnidad = {
      ...BASE,
      modelo: "Flex 18",
      precioCliente: 50000,
      primerCobroFecha: new Date("2026-02-01"),
      estadoFabricacion: "entregado",
      fechaEmbarque: new Date("2026-03-01"),
      fechaEntrega: null,
    };
    const info = accionesPasoActual(d)!;
    expect(info.acciones.map((a) => a.texto)).toEqual([
      "Subir acta de entrega carpeta 07",
      "Activar garantía",
      "Cerrar cobros",
    ]);
  });
});

describe("proximoPasoCorto", () => {
  it("'✅ Completado' cuando no queda ningún paso pendiente", () => {
    const d: DatosTimelineUnidad = {
      ...BASE,
      modelo: "Flex 18",
      precioCliente: 50000,
      primerCobroFecha: new Date("2026-02-01"),
      estadoFabricacion: "entregado",
      fechaEmbarque: new Date("2026-03-01"),
      fechaEntrega: new Date("2026-06-01"),
    };
    expect(proximoPasoCorto(d)).toBe("✅ Completado");
  });

  it("'Completar datos' cuando falta modelo/precio", () => {
    expect(proximoPasoCorto(BASE)).toBe("Completar datos");
  });

  it("'Cobrar anticipo' cuando falta el primer cobro", () => {
    expect(proximoPasoCorto({ ...BASE, modelo: "Flex 18", precioCliente: 50000 })).toBe("Cobrar anticipo");
  });

  it("'Registrar pago fábrica' en en_produccion", () => {
    const d: DatosTimelineUnidad = {
      ...BASE,
      modelo: "Flex 18",
      precioCliente: 50000,
      primerCobroFecha: new Date("2026-02-01"),
      estadoFabricacion: "en_produccion",
    };
    expect(proximoPasoCorto(d)).toBe("Registrar pago fábrica");
  });

  it("'Subir BL' cuando falta fechaEmbarque en embarcado", () => {
    const d: DatosTimelineUnidad = {
      ...BASE,
      modelo: "Flex 18",
      precioCliente: 50000,
      primerCobroFecha: new Date("2026-02-01"),
      estadoFabricacion: "embarcado",
    };
    expect(proximoPasoCorto(d)).toBe("Subir BL");
  });

  it("'Cobrar saldo' en en_aduana", () => {
    const d: DatosTimelineUnidad = {
      ...BASE,
      modelo: "Flex 18",
      precioCliente: 50000,
      primerCobroFecha: new Date("2026-02-01"),
      estadoFabricacion: "en_aduana",
      fechaEmbarque: new Date("2026-03-01"),
    };
    expect(proximoPasoCorto(d)).toBe("Cobrar saldo");
  });

  it("'Revisar estado' cuando estadoFabricacion está fuera del catálogo (defensivo)", () => {
    const d: DatosTimelineUnidad = {
      ...BASE,
      modelo: "Flex 18",
      precioCliente: 50000,
      primerCobroFecha: new Date("2026-02-01"),
      estadoFabricacion: "estado-inventado",
    };
    expect(proximoPasoCorto(d)).toBe("Revisar estado");
  });

  it("'Activar garantía' en entregado sin fechaEntrega", () => {
    const d: DatosTimelineUnidad = {
      ...BASE,
      modelo: "Flex 18",
      precioCliente: 50000,
      primerCobroFecha: new Date("2026-02-01"),
      estadoFabricacion: "entregado",
      fechaEmbarque: new Date("2026-03-01"),
      fechaEntrega: null,
    };
    expect(proximoPasoCorto(d)).toBe("Activar garantía");
  });
});
