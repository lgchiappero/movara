import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";

vi.mock("next/image", () => ({
  default: ({ src, alt, ...props }: React.ImgHTMLAttributes<HTMLImageElement> & { src: string }) => (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={src} alt={alt} {...props} />
  ),
}));
vi.mock("@/components/admin/LoginForm", () => ({ default: () => <div>LoginForm</div> }));

import AdminLoginPage from "../page";

describe("AdminLoginPage", () => {
  it("renderiza el logo, el título 'Ingresar' y el LoginForm", () => {
    render(<AdminLoginPage />);
    expect(screen.getByAltText("MOVARA")).toBeInTheDocument();
    expect(screen.getByText("Ingresar")).toBeInTheDocument();
    expect(screen.getByText("LoginForm")).toBeInTheDocument();
  });
});
