import { create } from "zustand";

export type WizardModel = {
  slug: string;
  name: string;
  category: string;
};

export type WizardStore = {
  open: boolean;
  step: number;

  // Step 1
  model: WizardModel | null;
  // Step 2
  habitaciones: number | null; // 1 | 2 | 3 | 4  (4 = "4+")
  cocina: boolean | null;
  banio: boolean | null;
  banioAdicional: boolean | null;
  // Step 3
  ciudad: string;
  provincia: string;
  // Step 4
  uso: string | null;
  // Step 5
  consulta: string;

  // Actions
  openWizard: (model: WizardModel) => void;
  closeWizard: () => void;
  goNext: () => void;
  goBack: () => void;
  setHabitaciones: (n: number) => void;
  setCocina: (v: boolean) => void;
  setBanio: (v: boolean) => void;
  setBanioAdicional: (v: boolean) => void;
  setCiudad: (v: string) => void;
  setProvincia: (v: string) => void;
  setUso: (v: string) => void;
  setConsulta: (v: string) => void;
};

const INITIAL: Omit<WizardStore, keyof ReturnType<typeof actions>> = {
  open: false,
  step: 1,
  model: null,
  habitaciones: null,
  cocina: null,
  banio: null,
  banioAdicional: null,
  ciudad: "",
  provincia: "",
  uso: null,
  consulta: "",
};

// Needed just for the type inference trick above — not used at runtime
const actions = () => ({} as Pick<WizardStore,
  "openWizard" | "closeWizard" | "goNext" | "goBack" |
  "setHabitaciones" | "setCocina" | "setBanio" | "setBanioAdicional" |
  "setCiudad" | "setProvincia" | "setUso" | "setConsulta"
>);

export const useWizardStore = create<WizardStore>()((set) => ({
  open: false,
  step: 1,
  model: null,
  habitaciones: null,
  cocina: null,
  banio: null,
  banioAdicional: null,
  ciudad: "",
  provincia: "",
  uso: null,
  consulta: "",

  openWizard: (model) =>
    set({ open: true, step: 1, model, habitaciones: null, cocina: null, banio: null, banioAdicional: null, ciudad: "", provincia: "", uso: null, consulta: "" }),

  closeWizard: () => set({ open: false }),

  goNext: () => set((s) => ({ step: Math.min(s.step + 1, 6) })),
  goBack: () => set((s) => ({ step: Math.max(s.step - 1, 1) })),

  setHabitaciones: (n) => set({ habitaciones: n }),
  setCocina: (v) => set({ cocina: v }),
  setBanio: (v) => set({ banio: v, banioAdicional: v ? null : false }),
  setBanioAdicional: (v) => set({ banioAdicional: v }),
  setCiudad: (v) => set({ ciudad: v }),
  setProvincia: (v) => set({ provincia: v }),
  setUso: (v) => set({ uso: v }),
  setConsulta: (v) => set({ consulta: v }),
}));

// ── Message builder ───────────────────────────────────────────
export function buildWhatsAppMessage(s: WizardStore): string {
  if (!s.model) return "";

  const hab =
    s.habitaciones === 4
      ? "4 o más habitaciones"
      : s.habitaciones === 1
      ? "1 habitación"
      : `${s.habitaciones} habitaciones`;

  const cocinaTxt = s.cocina ? "con cocina" : "sin cocina";
  const banioTxt = s.banio
    ? s.banioAdicional
      ? "con 2 baños"
      : "con baño"
    : "sin baño";

  const usoLabels: Record<string, string> = {
    familiar: "Vivienda familiar",
    turistico: "Alquiler turístico",
    oficina: "Oficina en casa",
    otro: "Otro",
  };

  let msg = `Hola Habitatt! 👋 Me interesa el modelo ${s.model.name}.\n`;
  msg += `🏠 Configuración: ${hab}, ${cocinaTxt}, ${banioTxt}.\n`;
  msg += `📍 Ubicación: ${s.ciudad}, ${s.provincia}.\n`;
  msg += `🎯 Uso: ${usoLabels[s.uso ?? ""] ?? s.uso}.\n`;
  if (s.consulta.trim()) msg += `💬 ${s.consulta.trim()}\n`;
  msg += `Quedo a la espera. Gracias!`;
  return msg;
}

void INITIAL; // suppress unused variable warning
