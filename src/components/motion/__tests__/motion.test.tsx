import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";

const inView = vi.fn(() => false);
const reduce = vi.fn(() => false);
const pathname = vi.fn(() => "/");

vi.mock("framer-motion", async (importOriginal) => {
  const actual = await importOriginal<typeof import("framer-motion")>();
  return { ...actual, useInView: () => inView(), useReducedMotion: () => reduce() };
});
vi.mock("next/navigation", () => ({ usePathname: () => pathname() }));

import Reveal from "../Reveal";
import CountUp from "../CountUp";
import MotionProvider from "../MotionProvider";
import PageTransition, { debeAnimar, resetPrimeraCarga } from "../PageTransition";

beforeEach(() => {
  inView.mockReturnValue(false);
  reduce.mockReturnValue(false);
  pathname.mockReturnValue("/");
  resetPrimeraCarga();
});

describe("Reveal", () => {
  it("queda oculto hasta entrar al viewport", () => {
    render(<Reveal className="x">contenido</Reveal>);
    const el = screen.getByText("contenido");
    expect(el).toHaveAttribute("data-visible", "false");
    expect(el).toHaveClass("x");
    expect(el.style.opacity).toBe("0");
  });

  it("se marca visible al entrar al viewport", () => {
    inView.mockReturnValue(true);
    render(<Reveal delay={0.2} y={10}>contenido</Reveal>);
    expect(screen.getByText("contenido")).toHaveAttribute("data-visible", "true");
  });

  it("con prefers-reduced-motion se muestra sin animación inicial", () => {
    reduce.mockReturnValue(true);
    render(<Reveal>contenido</Reveal>);
    const el = screen.getByText("contenido");
    expect(el).toHaveAttribute("data-visible", "true");
    expect(el.style.opacity).not.toBe("0");
  });
});

describe("CountUp", () => {
  it("arranca en 0 fuera del viewport", () => {
    render(<CountUp to={90} className="n" />);
    const el = screen.getByLabelText("90");
    expect(el).toHaveTextContent("0");
    expect(el).toHaveClass("n");
  });

  it("cuenta hasta el valor final al entrar al viewport", async () => {
    inView.mockReturnValue(true);
    render(<CountUp to={12} duration={0.05} />);
    await waitFor(() => expect(screen.getByLabelText("12")).toHaveTextContent("12"));
  });

  it("con prefers-reduced-motion muestra el valor final directo", () => {
    inView.mockReturnValue(true);
    reduce.mockReturnValue(true);
    render(<CountUp to={3} />);
    expect(screen.getByLabelText("3")).toHaveTextContent("3");
  });

  it("detiene la animación al desmontarse", () => {
    inView.mockReturnValue(true);
    const { unmount } = render(<CountUp to={90} duration={5} />);
    expect(() => unmount()).not.toThrow();
  });
});

describe("MotionProvider", () => {
  it("renderiza a sus hijos", () => {
    render(<MotionProvider>hola</MotionProvider>);
    expect(screen.getByText("hola")).toBeInTheDocument();
  });
});

describe("PageTransition", () => {
  it("debeAnimar excluye /admin y /studio pero no rutas parecidas", () => {
    expect(debeAnimar("/")).toBe(true);
    expect(debeAnimar("/modelos")).toBe(true);
    expect(debeAnimar("/administrar")).toBe(true);
    expect(debeAnimar("/admin")).toBe(false);
    expect(debeAnimar("/admin/unidades/1")).toBe(false);
    expect(debeAnimar("/studio/desk")).toBe(false);
  });

  it("en /admin renderiza los hijos sin wrapper animado", () => {
    pathname.mockReturnValue("/admin/pagos");
    const { container } = render(<PageTransition><p>panel</p></PageTransition>);
    expect(container.firstChild).toBe(screen.getByText("panel"));
  });

  it("la primera carga no arranca en opacity 0; las navegaciones siguientes sí hacen fade", () => {
    const { unmount } = render(<PageTransition><p>home</p></PageTransition>);
    expect((screen.getByText("home").parentElement as HTMLElement).style.opacity).not.toBe("0");
    unmount();

    pathname.mockReturnValue("/modelos");
    render(<PageTransition><p>modelos</p></PageTransition>);
    expect((screen.getByText("modelos").parentElement as HTMLElement).style.opacity).toBe("0");
  });
});
