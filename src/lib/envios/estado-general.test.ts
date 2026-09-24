import { describe, it, expect } from "vitest";
import { estadoGeneralEnvio } from "@/lib/envios/estado-general";

describe("estadoGeneralEnvio", () => {
  it("devuelve null si no hay unidades", () => {
    expect(estadoGeneralEnvio([])).toBeNull();
  });

  it("devuelve el estado de la única unidad", () => {
    expect(estadoGeneralEnvio([{ estadoFabricacion: "embarcado" }])).toBe("embarcado");
  });

  it("devuelve el estado menos avanzado entre varias unidades", () => {
    const unidades = [
      { estadoFabricacion: "en_destino" },
      { estadoFabricacion: "en_produccion" },
      { estadoFabricacion: "embarcado" },
    ];
    expect(estadoGeneralEnvio(unidades)).toBe("en_produccion");
  });

  it("no importa el orden de las unidades", () => {
    const unidades = [{ estadoFabricacion: "entregado" }, { estadoFabricacion: "pendiente" }];
    expect(estadoGeneralEnvio(unidades)).toBe("pendiente");
  });

  it("si todas están entregadas, el estado general es entregado", () => {
    const unidades = [{ estadoFabricacion: "entregado" }, { estadoFabricacion: "entregado" }];
    expect(estadoGeneralEnvio(unidades)).toBe("entregado");
  });
});
