import { describe, it, expect, beforeEach } from "vitest";
import { useWizardStore, buildWhatsAppMessage, type WizardStore } from "@/store/wizard";

function resetStore() {
  useWizardStore.setState({
    open: false,
    step: 1,
    model: null,
    habitaciones: null,
    cocina: null,
    banio: null,
    ciudad: "",
    provincia: "",
    uso: null,
    consulta: "",
  });
}

const MODEL = { slug: "familiar-65", name: "Familiar 65" };

describe("buildWhatsAppMessage", () => {
  it("retorna string vacío cuando model es null", () => {
    const state = { model: null } as WizardStore;
    expect(buildWhatsAppMessage(state)).toBe("");
  });

  it("genera mensaje completo con todos los campos", () => {
    const state = {
      model: MODEL,
      habitaciones: 3,
      cocina: true,
      banio: true,
      ciudad: "Mar del Plata",
      provincia: "Buenos Aires",
      uso: "familiar",
      consulta: "",
    } as unknown as WizardStore;

    const msg = buildWhatsAppMessage(state);
    expect(msg).toContain("Familiar 65");
    expect(msg).toContain("3 habitaciones");
    expect(msg).not.toContain("habitaciónes");
    expect(msg).toContain("con cocina");
    expect(msg).toContain("con baño");
    expect(msg).toContain("Mar del Plata");
    expect(msg).toContain("Buenos Aires");
    expect(msg).toContain("Vivienda familiar");
  });

  it("usa singular para 1 habitación", () => {
    const state = {
      model: MODEL,
      habitaciones: 1,
      cocina: true,
      banio: false,
      ciudad: "Rosario",
      provincia: "Santa Fe",
      uso: "oficina",
      consulta: "",
    } as unknown as WizardStore;

    expect(buildWhatsAppMessage(state)).toContain("1 habitación");
    expect(buildWhatsAppMessage(state)).not.toContain("1 habitaciones");
  });

  it("usa '4 o más habitaciones' para habitaciones = 4", () => {
    const state = {
      model: MODEL,
      habitaciones: 4,
      cocina: true,
      banio: false,
      ciudad: "Córdoba",
      provincia: "Córdoba",
      uso: "familiar",
      consulta: "",
    } as unknown as WizardStore;

    expect(buildWhatsAppMessage(state)).toContain("4 o más habitaciones");
  });

  it("muestra 'sin cocina' y 'sin baño' cuando ambos son false", () => {
    const state = {
      model: MODEL,
      habitaciones: 1,
      cocina: false,
      banio: false,
      ciudad: "Neuquén",
      provincia: "Neuquén",
      uso: "oficina",
      consulta: "",
    } as unknown as WizardStore;

    const msg = buildWhatsAppMessage(state);
    expect(msg).toContain("sin cocina");
    expect(msg).toContain("sin baño");
  });

  it("incluye consulta cuando no está vacía", () => {
    const state = {
      model: MODEL,
      habitaciones: 2,
      cocina: true,
      banio: true,
      ciudad: "Salta",
      provincia: "Salta",
      uso: "familiar",
      consulta: "¿Tienen financiación en pesos?",
    } as unknown as WizardStore;

    expect(buildWhatsAppMessage(state)).toContain("¿Tienen financiación en pesos?");
  });

  it("no incluye línea de consulta cuando la consulta está vacía", () => {
    const state = {
      model: MODEL,
      habitaciones: 2,
      cocina: true,
      banio: false,
      ciudad: "Tucumán",
      provincia: "Tucumán",
      uso: "turistico",
      consulta: "   ",
    } as unknown as WizardStore;

    const lines = buildWhatsAppMessage(state).split("\n");
    const hasConsulta = lines.some((l) => l.startsWith("💬"));
    expect(hasConsulta).toBe(false);
  });

  it("traduce uso 'otro' correctamente", () => {
    const state = {
      model: MODEL,
      habitaciones: 1,
      cocina: false,
      banio: false,
      ciudad: "La Plata",
      provincia: "Buenos Aires",
      uso: "otro",
      consulta: "",
    } as unknown as WizardStore;

    expect(buildWhatsAppMessage(state)).toContain("Otro");
  });

  it("usa el valor crudo para uso desconocido", () => {
    const state = {
      model: MODEL,
      habitaciones: 1,
      cocina: false,
      banio: false,
      ciudad: "La Plata",
      provincia: "Buenos Aires",
      uso: "desconocido",
      consulta: "",
    } as unknown as WizardStore;

    expect(buildWhatsAppMessage(state)).toContain("desconocido");
  });
});

describe("useWizardStore — acciones", () => {
  beforeEach(resetStore);

  it("openWizard abre el modal en paso 1 y resetea campos", () => {
    const { openWizard, goNext } = useWizardStore.getState();
    goNext();
    openWizard(MODEL);

    const s = useWizardStore.getState();
    expect(s.open).toBe(true);
    expect(s.step).toBe(1);
    expect(s.model).toEqual(MODEL);
    expect(s.habitaciones).toBeNull();
    expect(s.cocina).toBeNull();
    expect(s.banio).toBeNull();
    expect(s.ciudad).toBe("");
    expect(s.provincia).toBe("");
    expect(s.uso).toBeNull();
    expect(s.consulta).toBe("");
  });

  it("closeWizard cierra el modal sin tocar el resto del estado", () => {
    useWizardStore.getState().openWizard(MODEL);
    useWizardStore.getState().closeWizard();
    expect(useWizardStore.getState().open).toBe(false);
  });

  it("goNext avanza el paso pero no pasa de 6", () => {
    const { openWizard } = useWizardStore.getState();
    openWizard(MODEL);
    for (let i = 0; i < 10; i++) useWizardStore.getState().goNext();
    expect(useWizardStore.getState().step).toBe(6);
  });

  it("goBack retrocede el paso pero no baja de 1", () => {
    useWizardStore.getState().openWizard(MODEL);
    for (let i = 0; i < 5; i++) useWizardStore.getState().goBack();
    expect(useWizardStore.getState().step).toBe(1);
  });

  it("setters individuales actualizan solo su campo", () => {
    useWizardStore.getState().openWizard(MODEL);
    useWizardStore.getState().setHabitaciones(3);
    useWizardStore.getState().setCocina(true);
    useWizardStore.getState().setBanio(true);
    useWizardStore.getState().setCiudad("Rosario");
    useWizardStore.getState().setProvincia("Santa Fe");
    useWizardStore.getState().setUso("turistico");
    useWizardStore.getState().setConsulta("Consulta");

    const s = useWizardStore.getState();
    expect(s.habitaciones).toBe(3);
    expect(s.cocina).toBe(true);
    expect(s.banio).toBe(true);
    expect(s.ciudad).toBe("Rosario");
    expect(s.provincia).toBe("Santa Fe");
    expect(s.uso).toBe("turistico");
    expect(s.consulta).toBe("Consulta");
  });
});
