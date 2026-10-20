import { describe, it, expect, vi, beforeEach } from "vitest";
import { StrictMode } from "react";
import { render } from "@testing-library/react";

const ruta = vi.hoisted(() => ({ actual: "/" }));
vi.mock("next/navigation", () => ({ usePathname: () => ruta.actual }));
vi.mock("@/lib/meta-pixel", () => ({ trackPageView: vi.fn() }));

import { MetaPixelPageView } from "../MetaPixelPageView";
import { trackPageView } from "@/lib/meta-pixel";

beforeEach(() => {
  ruta.actual = "/";
  vi.mocked(trackPageView).mockClear();
});

describe("MetaPixelPageView", () => {
  it("la carga inicial no manda PageView: lo manda el script del píxel", () => {
    render(<MetaPixelPageView />);
    expect(trackPageView).not.toHaveBeenCalled();
  });

  it("en StrictMode (efecto doble) tampoco duplica el PageView inicial", () => {
    render(
      <StrictMode>
        <MetaPixelPageView />
      </StrictMode>
    );
    expect(trackPageView).not.toHaveBeenCalled();
  });

  it("cada cambio de ruta manda un PageView; re-render en la misma ruta, no", () => {
    const { rerender } = render(
      <StrictMode>
        <MetaPixelPageView />
      </StrictMode>
    );
    ruta.actual = "/modelos";
    rerender(
      <StrictMode>
        <MetaPixelPageView />
      </StrictMode>
    );
    expect(trackPageView).toHaveBeenCalledTimes(1);
    rerender(
      <StrictMode>
        <MetaPixelPageView />
      </StrictMode>
    );
    expect(trackPageView).toHaveBeenCalledTimes(1);
    ruta.actual = "/agendar";
    rerender(
      <StrictMode>
        <MetaPixelPageView />
      </StrictMode>
    );
    expect(trackPageView).toHaveBeenCalledTimes(2);
  });
});
