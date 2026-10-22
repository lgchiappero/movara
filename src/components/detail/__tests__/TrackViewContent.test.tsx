import { describe, it, expect, vi, beforeEach } from "vitest";
import { StrictMode } from "react";
import { render } from "@testing-library/react";
import TrackViewContent from "@/components/detail/TrackViewContent";

const trackViewContent = vi.fn();
vi.mock("@/lib/meta-pixel", () => ({ trackViewContent: (m: string) => trackViewContent(m) }));

beforeEach(() => trackViewContent.mockClear());

describe("TrackViewContent", () => {
  it("manda un solo ViewContent con el nombre del modelo, aun en StrictMode y re-renders", () => {
    const { rerender } = render(
      <StrictMode>
        <TrackViewContent modelo="MOVARA Flex 38" />
      </StrictMode>
    );
    rerender(
      <StrictMode>
        <TrackViewContent modelo="MOVARA Flex 38" />
      </StrictMode>
    );
    expect(trackViewContent).toHaveBeenCalledTimes(1);
    expect(trackViewContent).toHaveBeenCalledWith("MOVARA Flex 38");
  });

  it("si cambia el modelo, mide el nuevo", () => {
    const { rerender } = render(<TrackViewContent modelo="MOVARA Flex 18" />);
    rerender(<TrackViewContent modelo="MOVARA Flex 38" />);
    expect(trackViewContent.mock.calls).toEqual([["MOVARA Flex 18"], ["MOVARA Flex 38"]]);
  });
});
