import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import ConsultarButton from "../ConsultarButton";

const mockOpenWizard = vi.fn();
vi.mock("@/store/wizard", () => ({
  useWizardStore: (selector: (s: { openWizard: typeof mockOpenWizard }) => unknown) =>
    selector({ openWizard: mockOpenWizard }),
}));

const MODEL = { slug: "familiar-65", name: "Familiar 65", category: "familiar" };

describe("ConsultarButton", () => {
  it("renderiza el botón", () => {
    render(<ConsultarButton model={MODEL} />);
    expect(screen.getByRole("button", { name: /me interesa este modelo/i })).toBeInTheDocument();
  });

  it("llama a openWizard con el modelo al hacer click", async () => {
    const user = userEvent.setup();
    render(<ConsultarButton model={MODEL} />);
    await user.click(screen.getByRole("button"));
    expect(mockOpenWizard).toHaveBeenCalledWith(MODEL);
  });
});
