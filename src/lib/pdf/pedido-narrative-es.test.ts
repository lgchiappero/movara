import { describe, it, expect } from "vitest";
import { buildPedidoNarrativeEs } from "@/lib/pdf/pedido-narrative-es";
import type { PedidoRecord } from "@/lib/pdf/pedido-record";

const base: PedidoRecord = {
  clienteNombre: "Cliente de prueba",
  clienteWhatsapp: null,
  modelo: null,
  finalidad: null,
  provincia: null,
  localidad: null,
  habitaciones: null,
  incluyeCocina: false,
  tipoCocina: null,
  incluyeBano: false,
  tipoAgua: null,
  lavarropas: null,
  materiales: null,
  upgrades: [],
  notasConfiguracion: null,
};

function findGroup(items: ReturnType<typeof buildPedidoNarrativeEs>, title: string) {
  const group = items.find((i) => i.type === "group" && i.title === title);
  if (!group || group.type !== "group") throw new Error(`group not found: ${title}`);
  return group;
}

describe("buildPedidoNarrativeEs — pedidos cargados a mano desde el admin", () => {
  it("no rompe con todos los campos nulos", () => {
    expect(() => buildPedidoNarrativeEs(base)).not.toThrow();
  });

  it("muestra el texto libre cargado a mano cuando no matchea un id de catálogo", () => {
    const items = buildPedidoNarrativeEs({
      ...base,
      materiales: { exterior: "Blanco liso con detalles dorados" },
    });
    const group = findGroup(items, "Apariencia exterior");
    expect(group.bullets.some((b) => b.includes("Blanco liso con detalles dorados"))).toBe(true);
  });

  it("sigue mostrando el label del catálogo cuando el id sí matchea", () => {
    const items = buildPedidoNarrativeEs({ ...base, materiales: { exterior: "blanco" } });
    const group = findGroup(items, "Apariencia exterior");
    expect(group.bullets.some((b) => b.includes("Blanco"))).toBe(true);
  });

  it("muestra el label de un extra admin (ADMIN_EXTRAS) que no está en el catálogo público", () => {
    const items = buildPedidoNarrativeEs({ ...base, upgrades: ["banera", "piso-spc"] });
    const group = findGroup(items, "Mejoras a cotizar");
    expect(group.bullets).toContain("Bañera");
    expect(group.bullets).toContain("Piso SPC");
  });

  it("incluye las notas del cliente cuando están presentes", () => {
    const items = buildPedidoNarrativeEs({
      ...base,
      notasConfiguracion: "Quiere entrega antes de diciembre",
    });
    const line = items.find(
      (i) => i.type === "line" && i.label === "Notas del cliente"
    );
    expect(line).toBeDefined();
    if (line?.type === "line") {
      expect(line.value).toBe("Quiere entrega antes de diciembre");
    }
  });

  it("omite la línea de notas cuando no hay notasConfiguracion", () => {
    const items = buildPedidoNarrativeEs(base);
    expect(items.some((i) => i.type === "line" && i.label === "Notas del cliente")).toBe(false);
  });
});
