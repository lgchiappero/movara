import { describe, it, expect } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import ContactForm from "../ContactForm";

// userEvent sin delays para que los tests sean rápidos
const user = () => userEvent.setup({ delay: null });

// Selectores: los labels no tienen htmlFor, usamos placeholder/querySelector
const getNombre = () => screen.getByPlaceholderText(/juan garcía/i);
const getEmail = () => screen.getByPlaceholderText(/juan@email.com/i);
const getTextarea = () => document.querySelector("textarea") as HTMLTextAreaElement;

describe("ContactForm", () => {
  it("renderiza con el nombre del modelo pre-cargado en el textarea", () => {
    render(<ContactForm modelName="Familiar 65" />);
    expect(getTextarea().value).toContain("Familiar 65");
  });

  it("los inputs tienen maxLength para prevenir payloads excesivos", () => {
    render(<ContactForm modelName="Test" />);
    expect(getNombre()).toHaveAttribute("maxLength", "100");
    expect(getEmail()).toHaveAttribute("maxLength", "254");
    expect(screen.getByPlaceholderText(/\+54 9 11/i)).toHaveAttribute("maxLength", "30");
    expect(getTextarea()).toHaveAttribute("maxLength", "2000");
  });

  it("muestra error si nombre está vacío al enviar", async () => {
    const u = user();
    render(<ContactForm modelName="Test" />);
    await u.click(screen.getByRole("button", { name: /solicitar presupuesto/i }));
    expect(screen.getByText(/ingresá tu nombre/i)).toBeInTheDocument();
  });

  it("muestra error si email es inválido", async () => {
    const u = user();
    render(<ContactForm modelName="Test" />);
    await u.type(getNombre(), "Test User");
    await u.type(getEmail(), "no-es-email");
    await u.click(screen.getByRole("button", { name: /solicitar presupuesto/i }));
    expect(screen.getByText(/email inválido/i)).toBeInTheDocument();
  });

  it("muestra error si la consulta está vacía", async () => {
    const u = user();
    render(<ContactForm modelName="Test" />);
    await u.type(getNombre(), "Test User");
    await u.type(getEmail(), "test@test.com");
    await u.clear(getTextarea());
    await u.click(screen.getByRole("button", { name: /solicitar presupuesto/i }));
    expect(screen.getByText(/escribí tu consulta/i)).toBeInTheDocument();
  });

  it("muestra estado de éxito tras enviar datos válidos", async () => {
    const u = user();
    render(<ContactForm modelName="Familiar 65" />);
    await u.type(getNombre(), "Ana Pérez");
    await u.type(getEmail(), "ana@test.com");
    await u.click(screen.getByRole("button", { name: /solicitar presupuesto/i }));
    // handleSubmit espera 900ms reales — waitFor con timeout generoso
    await waitFor(() => expect(screen.getByText(/consulta enviada/i)).toBeInTheDocument(), {
      timeout: 2000,
    });
  }, 4000);

  it("permite enviar otra consulta desde el estado de éxito", async () => {
    const u = user();
    render(<ContactForm modelName="Familiar 65" />);
    await u.type(getNombre(), "Ana Pérez");
    await u.type(getEmail(), "ana@test.com");
    await u.click(screen.getByRole("button", { name: /solicitar presupuesto/i }));
    await waitFor(() => screen.getByText(/consulta enviada/i), { timeout: 2000 });
    await u.click(screen.getByRole("button", { name: /enviar otra consulta/i }));
    expect(screen.getByRole("button", { name: /solicitar presupuesto/i })).toBeInTheDocument();
  }, 4000);
});
