import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import SeccionSegura from "./SeccionSegura";
import { seccionSegura } from "./DatoNoDisponible";

function Rompe(): React.ReactNode {
  throw new Error("dato raro");
}

describe("SeccionSegura / seccionSegura", () => {
  it("si la sección de cliente falla muestra 'Dato no disponible' con su título, y lo demás sigue", () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    render(
      <div>
        <SeccionSegura titulo="Gestión del pedido">
          <Rompe />
        </SeccionSegura>
        <p>Resto del pedido</p>
      </div>
    );
    expect(screen.getByText("Gestión del pedido")).toBeInTheDocument();
    expect(screen.getByText("Dato no disponible.")).toBeInTheDocument();
    expect(screen.getByText("Resto del pedido")).toBeInTheDocument();
  });

  it("sin error muestra la sección", () => {
    render(<SeccionSegura titulo="X"><p>Contenido</p></SeccionSegura>);
    expect(screen.getByText("Contenido")).toBeInTheDocument();
  });

  it("seccionSegura (servidor) atrapa el error al armar y devuelve el aviso", () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    render(<>{seccionSegura("Materiales elegidos", () => { throw new Error("x"); })}</>);
    expect(screen.getByText("Materiales elegidos")).toBeInTheDocument();
    expect(screen.getByText("Dato no disponible.")).toBeInTheDocument();
    render(<>{seccionSegura("Y", () => <p>ok</p>)}</>);
    expect(screen.getByText("ok")).toBeInTheDocument();
  });
});
