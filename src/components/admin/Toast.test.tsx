import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ToastProvider, useToast } from "./Toast";

function Trigger() {
  const { showSuccess, showError } = useToast();
  return (
    <div>
      <button onClick={() => showSuccess()}>success-default</button>
      <button onClick={() => showSuccess("Cliente actualizado")}>success-custom</button>
      <button onClick={() => showError("No pudimos guardar")}>error</button>
    </div>
  );
}

describe("ToastProvider / useToast", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("useToast lanza si se usa fuera de ToastProvider", () => {
    function Standalone() {
      useToast();
      return null;
    }
    expect(() => render(<Standalone />)).toThrow(/useToast debe usarse dentro/);
  });

  it("showSuccess sin mensaje muestra 'Guardado correctamente' con ✓", async () => {
    const user = userEvent.setup();
    render(
      <ToastProvider>
        <Trigger />
      </ToastProvider>
    );
    await user.click(screen.getByText("success-default"));
    const toast = await screen.findByRole("status");
    expect(toast.textContent).toContain("Guardado correctamente");
    expect(toast.textContent).toContain("✓");
  });

  it("showSuccess con mensaje custom lo usa en vez del default", async () => {
    const user = userEvent.setup();
    render(
      <ToastProvider>
        <Trigger />
      </ToastProvider>
    );
    await user.click(screen.getByText("success-custom"));
    expect(await screen.findByText("Cliente actualizado")).toBeInTheDocument();
  });

  it("showError muestra el mensaje con ✗", async () => {
    const user = userEvent.setup();
    render(
      <ToastProvider>
        <Trigger />
      </ToastProvider>
    );
    await user.click(screen.getByText("error"));
    const toast = await screen.findByRole("status");
    expect(toast.textContent).toContain("No pudimos guardar");
    expect(toast.textContent).toContain("✗");
  });

  it("varios toasts se apilan a la vez", async () => {
    const user = userEvent.setup();
    render(
      <ToastProvider>
        <Trigger />
      </ToastProvider>
    );
    await user.click(screen.getByText("success-default"));
    await user.click(screen.getByText("error"));
    await waitFor(() => expect(screen.getAllByRole("status")).toHaveLength(2));
  });

  it("el toast desaparece solo después de un tiempo", async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    render(
      <ToastProvider>
        <Trigger />
      </ToastProvider>
    );
    screen.getByText("success-default").click();
    await vi.waitFor(() => expect(screen.getByRole("status")).toBeInTheDocument());

    vi.advanceTimersByTime(3000);
    await vi.waitFor(() => expect(screen.queryByRole("status")).not.toBeInTheDocument());
  });
});
