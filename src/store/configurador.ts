import { create } from "zustand";

export type ConfiguradorState = {
  provincia: string | null;
  modeloKey: string | null;
  uso: "vivienda" | "turismo" | "trabajo" | null;
  fuenteSeleccion: "provincia" | "manual";
};

export type ConfiguradorStore = ConfiguradorState & {
  open: boolean;
  step: number;
  openConfigurador: () => void;
  closeConfigurador: () => void;
  setProvincia: (p: string | null) => void;
  setModeloKey: (key: string | null, fuente: "provincia" | "manual") => void;
  setUso: (uso: ConfiguradorState["uso"]) => void;
  goNext: () => void;
  goBack: () => void;
};

const RESET: ConfiguradorState & { step: number } = {
  provincia: null,
  modeloKey: null,
  uso: null,
  fuenteSeleccion: "provincia",
  step: 1,
};

export const useConfiguradorStore = create<ConfiguradorStore>()((set) => ({
  ...RESET,
  open: false,

  openConfigurador: () => set({ ...RESET, open: true }),
  closeConfigurador: () => set({ open: false }),

  setProvincia: (provincia) => set({ provincia }),
  setModeloKey: (modeloKey, fuenteSeleccion) => set({ modeloKey, fuenteSeleccion }),
  setUso: (uso) => set({ uso }),

  goNext: () => set((s) => ({ step: Math.min(s.step + 1, 4) })),
  goBack: () => set((s) => ({ step: Math.max(s.step - 1, 1) })),
}));
