import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";

// ── Mocks ────────────────────────────────────────────────────────────────────
// framer-motion and next/link are imported by ConfiguradorMovara.tsx but are
// not needed for testing StepDatos in isolation.

vi.mock("framer-motion", () => ({
  motion: {
    div: ({ children, ...props }: React.ComponentPropsWithRef<"div">) => (
      <div {...props}>{children}</div>
    ),
  },
  AnimatePresence: ({ children }: { children?: React.ReactNode }) => <>{children}</>,
}));

vi.mock("next/link", () => ({
  default: ({ children, href }: { children: React.ReactNode; href: string }) => (
    <a href={href}>{children}</a>
  ),
}));

import { StepDatos } from "@/components/configurador/ConfiguradorMovara";
import {
  particularSchema,
  empresaSchema,
} from "@/lib/validators/configurador";

// ── TestHarness ───────────────────────────────────────────────────────────────
// Mirrors the parent ConfiguradorMovara logic: controls state and reflects
// step6Valid as a disabled prop on the "Siguiente" button.

type TipoCliente = "particular" | "empresa";

function TestHarness({ initialType = "particular" as TipoCliente }) {
  const [tipoCliente, setTipoCliente] = useState<TipoCliente>(initialType);
  const [nombre, setNombre] = useState("");
  const [razonSocial, setRazonSocial] = useState("");
  const [nombreContacto, setNombreContacto] = useState("");
  const [telefono, setTelefono] = useState("");
  const [email, setEmail] = useState("");

  const canAdvance =
    tipoCliente === "particular"
      ? particularSchema.safeParse({ nombre: nombre.trim(), telefono, email: email.trim() }).success
      : empresaSchema.safeParse({
          razonSocial: razonSocial.trim(),
          nombreContacto: nombreContacto.trim(),
          telefono,
          email: email.trim(),
        }).success;

  return (
    <>
      <StepDatos
        tipoCliente={tipoCliente}
        setTipoCliente={setTipoCliente}
        nombre={nombre}
        setNombre={setNombre}
        razonSocial={razonSocial}
        setRazonSocial={setRazonSocial}
        nombreContacto={nombreContacto}
        setNombreContacto={setNombreContacto}
        telefono={telefono}
        setTelefono={setTelefono}
        email={email}
        setEmail={setEmail}
      />
      <button type="button" disabled={!canAdvance}>
        Siguiente
      </button>
    </>
  );
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function renderHarness(initialType: TipoCliente = "particular") {
  const user = userEvent.setup();
  render(<TestHarness initialType={initialType} />);
  return { user };
}

const VALID = {
  nombre: "Juan García",
  telefono: "+54 9 11 1234-5678",
  email: "juan@example.com",
  razonSocial: "Constructora S.A.",
  nombreContacto: "María López",
};

// ── Tests ─────────────────────────────────────────────────────────────────────

describe("StepDatos — toggle Particular / Empresa", () => {
  it("muestra el campo 'Nombre y apellido' por defecto (Particular)", () => {
    renderHarness();
    expect(screen.getByPlaceholderText("Ej: Juan García")).toBeInTheDocument();
  });

  it("al cambiar a Empresa muestra 'Razón social' y 'Nombre de contacto'", async () => {
    const { user } = renderHarness();

    await user.click(screen.getByRole("button", { name: "Empresa" }));

    expect(screen.getByPlaceholderText("Ej: Constructora Ejemplo S.A.")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("Ej: María López")).toBeInTheDocument();
  });

  it("volver a Particular oculta los campos de empresa", async () => {
    const { user } = renderHarness("empresa");

    await user.click(screen.getByRole("button", { name: "Particular" }));

    expect(screen.queryByPlaceholderText("Ej: Constructora Ejemplo S.A.")).not.toBeInTheDocument();
    expect(screen.getByPlaceholderText("Ej: Juan García")).toBeInTheDocument();
  });

  it("los campos teléfono y email se mantienen al cambiar de tipo", async () => {
    const { user } = renderHarness();

    await user.type(screen.getByPlaceholderText("Ej: +54 9 11 1234-5678"), VALID.telefono);
    await user.type(screen.getByPlaceholderText("tu@email.com"), VALID.email);
    await user.click(screen.getByRole("button", { name: "Empresa" }));

    // Shared fields remain with same value
    expect(screen.getByPlaceholderText("Ej: +54 9 11 1234-5678")).toHaveValue(VALID.telefono);
    expect(screen.getByPlaceholderText("contacto@empresa.com")).toHaveValue(VALID.email);
  });
});

describe("StepDatos — validación de email en tiempo real", () => {
  it("no muestra error de email antes de tocar el campo", () => {
    renderHarness();
    expect(screen.queryByText(/email inválido/i)).not.toBeInTheDocument();
  });

  it("muestra error después de blur con email inválido", async () => {
    const { user } = renderHarness();
    const emailInput = screen.getByPlaceholderText("tu@email.com");

    await user.type(emailInput, "noemail");
    fireEvent.blur(emailInput);

    expect(screen.getByText(/email inválido/i)).toBeInTheDocument();
  });

  it("borde rojo cuando el email es inválido y fue tocado", async () => {
    const { user } = renderHarness();
    const emailInput = screen.getByPlaceholderText("tu@email.com");

    await user.type(emailInput, "malformado@");
    fireEvent.blur(emailInput);

    expect(emailInput.className).toMatch(/red/);
  });

  it("error desaparece en tiempo real al corregir el email sin re-blur", async () => {
    const { user } = renderHarness();
    const emailInput = screen.getByPlaceholderText("tu@email.com");

    // Touch with invalid value
    await user.type(emailInput, "malo");
    fireEvent.blur(emailInput);
    expect(screen.getByText(/email inválido/i)).toBeInTheDocument();

    // Fix the email — error should disappear without re-blurring
    await user.clear(emailInput);
    await user.type(emailInput, "valido@example.com");
    expect(screen.queryByText(/email inválido/i)).not.toBeInTheDocument();
  });

  it("borde verde cuando el email es válido y fue tocado", async () => {
    const { user } = renderHarness();
    const emailInput = screen.getByPlaceholderText("tu@email.com");

    await user.type(emailInput, VALID.email);
    fireEvent.blur(emailInput);

    expect(emailInput.className).toMatch(/green/);
  });
});

describe("StepDatos — validación de nombre", () => {
  it("no muestra error de nombre antes de tocar el campo", () => {
    renderHarness();
    // Only one specific error about nombre should not be there
    expect(screen.queryByText(/mínimo 3/i)).not.toBeInTheDocument();
  });

  it("muestra error si el nombre tiene menos de 3 caracteres al hacer blur", async () => {
    const { user } = renderHarness();
    const nombreInput = screen.getByPlaceholderText("Ej: Juan García");

    await user.type(nombreInput, "AB");
    fireEvent.blur(nombreInput);

    expect(screen.getByText(/mínimo 3/i)).toBeInTheDocument();
  });

  it("muestra error si el nombre contiene números", async () => {
    const { user } = renderHarness();
    const nombreInput = screen.getByPlaceholderText("Ej: Juan García");

    await user.type(nombreInput, "Juan123");
    fireEvent.blur(nombreInput);

    expect(screen.getByText(/solo letras/i)).toBeInTheDocument();
  });

  it("borde verde cuando el nombre es válido", async () => {
    const { user } = renderHarness();
    const nombreInput = screen.getByPlaceholderText("Ej: Juan García");

    await user.type(nombreInput, VALID.nombre);
    fireEvent.blur(nombreInput);

    expect(nombreInput.className).toMatch(/green/);
  });
});

describe("StepDatos — validación de teléfono", () => {
  it("muestra error con teléfono demasiado corto al hacer blur", async () => {
    const { user } = renderHarness();
    const telInput = screen.getByPlaceholderText("Ej: +54 9 11 1234-5678");

    await user.type(telInput, "1234");
    fireEvent.blur(telInput);

    expect(screen.getByText(/mínimo 8 dígitos/i)).toBeInTheDocument();
  });

  it("acepta teléfono con formato internacional sin error", async () => {
    const { user } = renderHarness();
    const telInput = screen.getByPlaceholderText("Ej: +54 9 11 1234-5678");

    await user.type(telInput, VALID.telefono);
    fireEvent.blur(telInput);

    expect(screen.queryByText(/mínimo 8/i)).not.toBeInTheDocument();
    expect(telInput.className).toMatch(/green/);
  });
});

describe("StepDatos — botón Siguiente deshabilitado", () => {
  it("botón deshabilitado con formulario vacío", () => {
    renderHarness();
    expect(screen.getByRole("button", { name: "Siguiente" })).toBeDisabled();
  });

  it("botón deshabilitado con solo nombre completo (faltan campos)", async () => {
    const { user } = renderHarness();

    await user.type(screen.getByPlaceholderText("Ej: Juan García"), VALID.nombre);

    expect(screen.getByRole("button", { name: "Siguiente" })).toBeDisabled();
  });

  it("botón habilitado cuando todos los campos Particular son válidos", async () => {
    const { user } = renderHarness();

    await user.type(screen.getByPlaceholderText("Ej: Juan García"), VALID.nombre);
    await user.type(screen.getByPlaceholderText("Ej: +54 9 11 1234-5678"), VALID.telefono);
    await user.type(screen.getByPlaceholderText("tu@email.com"), VALID.email);

    expect(screen.getByRole("button", { name: "Siguiente" })).toBeEnabled();
  });

  it("botón se deshabilita si el email se vuelve inválido", async () => {
    const { user } = renderHarness();
    const emailInput = screen.getByPlaceholderText("tu@email.com");

    await user.type(screen.getByPlaceholderText("Ej: Juan García"), VALID.nombre);
    await user.type(screen.getByPlaceholderText("Ej: +54 9 11 1234-5678"), VALID.telefono);
    await user.type(emailInput, VALID.email);
    expect(screen.getByRole("button", { name: "Siguiente" })).toBeEnabled();

    await user.clear(emailInput);
    await user.type(emailInput, "invalido");
    expect(screen.getByRole("button", { name: "Siguiente" })).toBeDisabled();
  });

  it("botón deshabilitado en Empresa con campos incompletos", async () => {
    const { user } = renderHarness("empresa");

    await user.type(screen.getByPlaceholderText("Ej: Constructora Ejemplo S.A."), VALID.razonSocial);
    // Sin nombre de contacto, teléfono ni email

    expect(screen.getByRole("button", { name: "Siguiente" })).toBeDisabled();
  });

  it("botón habilitado cuando todos los campos Empresa son válidos", async () => {
    const { user } = renderHarness("empresa");

    await user.type(screen.getByPlaceholderText("Ej: Constructora Ejemplo S.A."), VALID.razonSocial);
    await user.type(screen.getByPlaceholderText("Ej: María López"), VALID.nombreContacto);
    await user.type(screen.getByPlaceholderText("Ej: +54 9 11 1234-5678"), VALID.telefono);
    await user.type(screen.getByPlaceholderText("contacto@empresa.com"), VALID.email);

    expect(screen.getByRole("button", { name: "Siguiente" })).toBeEnabled();
  });
});
