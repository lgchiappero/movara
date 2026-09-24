import { describe, it, expect, beforeEach } from "vitest";
import { useConfiguradorStore } from "@/store/configurador";

function resetStore() {
  useConfiguradorStore.setState({
    provincia: null,
    modeloKey: null,
    uso: null,
    fuenteSeleccion: "provincia",
    step: 1,
    open: false,
  });
}

describe("useConfiguradorStore", () => {
  beforeEach(resetStore);

  it("estado inicial", () => {
    const s = useConfiguradorStore.getState();
    expect(s.open).toBe(false);
    expect(s.step).toBe(1);
    expect(s.provincia).toBeNull();
    expect(s.modeloKey).toBeNull();
    expect(s.uso).toBeNull();
    expect(s.fuenteSeleccion).toBe("provincia");
  });

  it("openConfigurador abre y resetea el resto del estado", () => {
    useConfiguradorStore.getState().setProvincia("Buenos Aires");
    useConfiguradorStore.getState().setModeloKey("pampa", "provincia");
    useConfiguradorStore.getState().goNext();

    useConfiguradorStore.getState().openConfigurador();

    const s = useConfiguradorStore.getState();
    expect(s.open).toBe(true);
    expect(s.step).toBe(1);
    expect(s.provincia).toBeNull();
    expect(s.modeloKey).toBeNull();
    expect(s.uso).toBeNull();
    expect(s.fuenteSeleccion).toBe("provincia");
  });

  it("closeConfigurador cierra sin tocar el resto del estado", () => {
    useConfiguradorStore.getState().setProvincia("Córdoba");
    useConfiguradorStore.getState().openConfigurador();
    useConfiguradorStore.getState().closeConfigurador();

    const s = useConfiguradorStore.getState();
    expect(s.open).toBe(false);
    expect(s.provincia).toBeNull(); // openConfigurador ya lo había reseteado
  });

  it("setProvincia actualiza solo la provincia", () => {
    useConfiguradorStore.getState().setProvincia("Mendoza");
    expect(useConfiguradorStore.getState().provincia).toBe("Mendoza");
  });

  it("setModeloKey actualiza modeloKey y fuenteSeleccion juntos", () => {
    useConfiguradorStore.getState().setModeloKey("pehuen", "manual");
    const s = useConfiguradorStore.getState();
    expect(s.modeloKey).toBe("pehuen");
    expect(s.fuenteSeleccion).toBe("manual");
  });

  it("setUso actualiza solo el uso", () => {
    useConfiguradorStore.getState().setUso("turismo");
    expect(useConfiguradorStore.getState().uso).toBe("turismo");
  });

  it("goNext avanza el paso pero no pasa de 4", () => {
    for (let i = 0; i < 10; i++) useConfiguradorStore.getState().goNext();
    expect(useConfiguradorStore.getState().step).toBe(4);
  });

  it("goBack retrocede el paso pero no baja de 1", () => {
    useConfiguradorStore.getState().goNext();
    for (let i = 0; i < 10; i++) useConfiguradorStore.getState().goBack();
    expect(useConfiguradorStore.getState().step).toBe(1);
  });
});
