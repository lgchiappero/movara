"use client";

import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";
import { trackPageView } from "@/lib/meta-pixel";

export function MetaPixelPageView() {
  const pathname = usePathname();
  const isFirst = useRef(true);

  useEffect(() => {
    // Skip first render — the pixel init script already fires PageView on load.
    if (isFirst.current) {
      isFirst.current = false;
      return;
    }
    trackPageView();
  }, [pathname]);

  return null;
}
