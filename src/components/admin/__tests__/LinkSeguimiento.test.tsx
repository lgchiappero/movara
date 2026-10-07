import { describe, it, expect, vi } from "vitest";
import { render, screen, act } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import LinkSeguimiento from "../LinkSeguimiento";

const URL_SEG = "https://movara.com.ar/mi-pedido?t=" + "d".repeat(64);

describe("LinkSeguimiento", () => {
  it("muestra el link y lo copia al portapapeles", async () => {
    const user = userEvent.setup();
    const writeText = vi.spyOn(navigator.clipboard, "writeText").mockResolvedValue();
    render(<LinkSeguimiento url={URL_SEG} />);
    expect(screen.getByLabelText("Link de seguimiento")).toHaveValue(URL_SEG);
    await user.click(screen.getByRole("button", { name: "Copiar" }));
    expect(writeText).toHaveBeenCalledWith(URL_SEG);
    expect(await screen.findByRole("button", { name: "¡Copiado!" })).toBeInTheDocument();
  });

  it("si el portapapeles falla no muestra 'Copiado'", async () => {
    const user = userEvent.setup();
    vi.spyOn(navigator.clipboard, "writeText").mockRejectedValue(new Error("denegado"));
    render(<LinkSeguimiento url={URL_SEG} />);
    await user.click(screen.getByRole("button", { name: "Copiar" }));
    expect(screen.getByRole("button", { name: "Copiar" })).toBeInTheDocument();
  });

  it("el 'Copiado' vuelve a 'Copiar' después de 2 segundos", async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    vi.spyOn(navigator.clipboard, "writeText").mockResolvedValue();
    render(<LinkSeguimiento url={URL_SEG} />);
    await user.click(screen.getByRole("button", { name: "Copiar" }));
    expect(await screen.findByRole("button", { name: "¡Copiado!" })).toBeInTheDocument();
    await act(async () => {
      vi.advanceTimersByTime(2100);
    });
    expect(screen.getByRole("button", { name: "Copiar" })).toBeInTheDocument();
    vi.useRealTimers();
  });

  it("al enfocar el input selecciona todo el link", async () => {
    render(<LinkSeguimiento url={URL_SEG} />);
    const input = screen.getByLabelText("Link de seguimiento") as HTMLInputElement;
    input.focus();
    expect(input.selectionStart).toBe(0);
    expect(input.selectionEnd).toBe(URL_SEG.length);
  });
});
