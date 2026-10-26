import { describe, it, expect } from "vitest";
import {
  planificarBackfill,
  resumirPlan,
  type ClienteBase,
  type LeadBase,
  type PedidoBase,
  type DatosBackfill,
} from "@/lib/clientes/backfill";

let dia = 0;
const fecha = () => new Date(Date.UTC(2026, 8, 1 + ++dia));

const cliente = (c: Partial<ClienteBase> & { id: string }): ClienteBase => ({
  nombre: "Cliente",
  email: null,
  telefono: null,
  emailNorm: null,
  telefonoNorm: null,
  estado: "interesado",
  estadoManual: false,
  estadoAutomatico: "interesado",
  createdAt: fecha(),
  ...c,
});
const lead = (l: Partial<LeadBase> & { id: string }): LeadBase => ({
  nombre: "Lead",
  apellido: null,
  dni: null,
  email: null,
  telefono: "",
  provincia: null,
  etapa: "nuevo",
  clienteId: null,
  emailNorm: null,
  telefonoNorm: null,
  createdAt: fecha(),
  ...l,
});
const pedido = (p: Partial<PedidoBase> & { id: string }): PedidoBase => ({
  numeroConsulta: `MOV-${p.id}`,
  clienteNombre: "Ana García",
  clienteEmail: null,
  clienteWhatsapp: null,
  tipoCliente: "particular",
  razonSocial: null,
  nombreContacto: null,
  provincia: "Santa Fe",
  localidad: "Rafaela",
  estadoPedido: "consulta",
  leadId: null,
  clienteId: null,
  createdAt: fecha(),
  ...p,
});
const datos = (d: Partial<DatosBackfill>): DatosBackfill => ({
  clientes: [],
  leads: [],
  pedidos: [],
  unidades: [],
  recibosConfirmados: [],
  ...d,
});

describe("planificarBackfill", () => {
  it("pedido sin cliente ni lead: crea los dos y calcula 'pedido iniciado'", () => {
    const plan = planificarBackfill(datos({ pedidos: [pedido({ id: "p1", clienteEmail: "Ana@x.com", clienteWhatsapp: "+54 9 11 1234-5678" })] }));
    expect(plan.clientesNuevos).toHaveLength(1);
    expect(plan.clientesNuevos[0]).toMatchObject({
      desde: "pedido MOV-p1",
      data: { nombre: "Ana García", emailNorm: "ana@x.com", telefonoNorm: "1112345678", provincia: "Santa Fe" },
    });
    expect(plan.leadsNuevos[0]).toMatchObject({ clienteRef: plan.clientesNuevos[0].ref, data: { telefono: "+54 9 11 1234-5678" } });
    expect(plan.pedidoCliente).toEqual([{ pedidoId: "p1", numero: "MOV-p1", clienteRef: plan.clientesNuevos[0].ref }]);
    expect(plan.pedidoLead).toEqual([{ pedidoId: "p1", numero: "MOV-p1", leadRef: plan.leadsNuevos[0].ref }]);
    expect(plan.estados).toEqual([
      { clienteRef: plan.clientesNuevos[0].ref, cambio: { estado: "pedido_iniciado", estadoAutomatico: "pedido_iniciado" } },
    ]);
  });

  it("dos pedidos del mismo email (y uno por teléfono) → un solo cliente y un solo lead", () => {
    const plan = planificarBackfill(
      datos({
        pedidos: [
          pedido({ id: "p1", clienteEmail: "ana@x.com", clienteWhatsapp: "1112345678" }),
          pedido({ id: "p2", clienteEmail: "ANA@x.com ", estadoPedido: "confirmado" }),
          pedido({ id: "p3", clienteEmail: null, clienteWhatsapp: "011 15 1234-5678" }),
        ],
      })
    );
    expect(plan.clientesNuevos).toHaveLength(1);
    expect(plan.leadsNuevos).toHaveLength(1);
    expect(new Set(plan.pedidoCliente.map((p) => p.clienteRef)).size).toBe(1);
    expect(plan.estados[0].cambio.estado).toBe("comprador");
  });

  it("reutiliza clientes y leads existentes, y el cliente del lead que ya tenía el pedido", () => {
    const plan = planificarBackfill(
      datos({
        clientes: [cliente({ id: "c1", email: "ana@x.com", emailNorm: "ana@x.com" }), cliente({ id: "c2" })],
        leads: [lead({ id: "l1", email: "ana@x.com", emailNorm: "ana@x.com" }), lead({ id: "l2", clienteId: "c2" })],
        pedidos: [pedido({ id: "p1", clienteEmail: "ana@x.com" }), pedido({ id: "p2", leadId: "l2", clienteEmail: "otro@x.com" })],
      })
    );
    expect(plan.clientesNuevos).toHaveLength(0);
    expect(plan.leadsNuevos).toHaveLength(0);
    expect(plan.pedidoCliente).toEqual([
      { pedidoId: "p1", numero: "MOV-p1", clienteRef: "c1" },
      { pedidoId: "p2", numero: "MOV-p2", clienteRef: "c2" },
    ]);
    expect(plan.pedidoLead).toEqual([{ pedidoId: "p1", numero: "MOV-p1", leadRef: "l1" }]);
    expect(plan.leadCliente).toEqual([{ leadId: "l1", clienteRef: "c1" }]);
  });

  it("leads sin pedido: cliente 'interesado' salvo los perdidos, que quedan sin cliente", () => {
    const plan = planificarBackfill(
      datos({
        leads: [
          lead({ id: "l1", nombre: "Juan", apellido: "Pérez", telefono: "3492 123456", provincia: "Santa Fe", dni: "1" }),
          lead({ id: "l2", etapa: "perdido", email: "p@x.com" }),
          lead({ id: "l3", telefono: "+54 3492 123456" }),
        ],
      })
    );
    expect(plan.clientesNuevos).toHaveLength(1);
    expect(plan.clientesNuevos[0]).toMatchObject({
      desde: "lead l1",
      data: { nombre: "Juan Pérez", provincia: "Santa Fe", dni: "1", telefonoNorm: "3492123456" },
    });
    // l3 tiene el mismo teléfono que l1: mismo cliente.
    expect(plan.leadCliente.map((l) => l.leadId)).toEqual(["l1", "l3"]);
    expect(plan.perdidosSinCliente).toBe(1);
    expect(plan.estados).toEqual([]);
  });

  it("un lead perdido con pedido sí queda vinculado (por el pedido)", () => {
    const plan = planificarBackfill(
      datos({
        leads: [lead({ id: "l1", etapa: "perdido", email: "a@x.com", emailNorm: "a@x.com" })],
        pedidos: [pedido({ id: "p1", clienteEmail: "a@x.com" })],
      })
    );
    expect(plan.leadCliente).toEqual([{ leadId: "l1", clienteRef: plan.clientesNuevos[0].ref }]);
    expect(plan.perdidosSinCliente).toBe(0);
  });

  it("estado de clientes existentes por unidades, recibos y pedidos; cancelados no cuentan", () => {
    const plan = planificarBackfill(
      datos({
        clientes: [cliente({ id: "c1" }), cliente({ id: "c2" }), cliente({ id: "c3", estado: "comprador", estadoAutomatico: "comprador" })],
        pedidos: [pedido({ id: "p1", clienteId: "c3", estadoPedido: "cancelado" })],
        unidades: ["c1", "c2"],
        recibosConfirmados: ["c2"],
      })
    );
    const por = Object.fromEntries(plan.estados.map((e) => [e.clienteRef, e.cambio.estado]));
    expect(por).toEqual({ c1: "comprador", c2: "entregado", c3: "interesado" });
    expect(plan.pedidoCliente).toEqual([]);
  });

  it("completa las claves que faltan y es idempotente con los datos ya vinculados", () => {
    const base = datos({
      clientes: [cliente({ id: "c1", email: "Ana@x.com", telefono: "11 1234 5678" })],
      leads: [lead({ id: "l1", email: "ana@x.com", clienteId: "c1" })],
      pedidos: [pedido({ id: "p1", clienteId: "c1", leadId: "l1", clienteEmail: "ana@x.com" })],
    });
    const plan = planificarBackfill(base);
    expect(plan.clavesCliente).toEqual([{ id: "c1", emailNorm: "ana@x.com", telefonoNorm: "1112345678" }]);
    expect(plan.clavesLead).toEqual([{ id: "l1", emailNorm: "ana@x.com", telefonoNorm: null }]);

    const yaAplicado = planificarBackfill({
      ...base,
      clientes: [cliente({ ...base.clientes[0], emailNorm: "ana@x.com", telefonoNorm: "1112345678", estado: "pedido_iniciado", estadoAutomatico: "pedido_iniciado" })],
      leads: [lead({ ...base.leads[0], emailNorm: "ana@x.com" })],
    });
    const resumen = resumirPlan(yaAplicado);
    const conteos = Object.entries(resumen).filter(([, v]) => typeof v === "number");
    expect(conteos.every(([, v]) => v === 0)).toBe(true);
    expect(resumen.clientesNuevosPorEstado).toEqual({});
  });

  it("respeta un estado manual existente", () => {
    const plan = planificarBackfill(
      datos({
        clientes: [cliente({ id: "c1", estado: "comprador", estadoManual: true, estadoAutomatico: "interesado" })],
        pedidos: [pedido({ id: "p1", clienteId: "c1", estadoPedido: "presupuestado" })],
      })
    );
    expect(plan.estados).toEqual([{ clienteRef: "c1", cambio: { estadoAutomatico: "presupuestado" } }]);
  });
});

describe("resumirPlan", () => {
  it("cuenta creados y vinculados, separando existentes de nuevos", () => {
    const plan = planificarBackfill(
      datos({
        clientes: [cliente({ id: "c1", email: "a@x.com", emailNorm: "a@x.com" })],
        leads: [lead({ id: "l1", email: "b@x.com", emailNorm: "b@x.com" }), lead({ id: "l2", telefono: "1199998888" })],
        pedidos: [
          pedido({ id: "p1", clienteEmail: "a@x.com", numeroConsulta: null }),
          pedido({ id: "p2", clienteEmail: "b@x.com", estadoPedido: "confirmado" }),
        ],
      })
    );
    expect(resumirPlan(plan)).toEqual({
      clientesNuevos: 2,
      clientesNuevosDesdePedidos: 1,
      clientesNuevosDesdeLeads: 1,
      leadsNuevos: 1,
      pedidosVinculadosACliente: 2,
      pedidosVinculadosAClienteExistente: 1,
      pedidosVinculadosALead: 2,
      pedidosVinculadosALeadExistente: 1,
      leadsVinculadosACliente: 2,
      leadsVinculadosAClienteExistente: 0,
      perdidosSinCliente: 0,
      clavesClienteACompletar: 0,
      clavesLeadACompletar: 1,
      estadosQueCambian: 2,
      clientesNuevosPorEstado: { comprador: 1, interesado: 1 },
    });
    expect(plan.leadsNuevos[0].desde).toBe("pedido p1");
  });
});
