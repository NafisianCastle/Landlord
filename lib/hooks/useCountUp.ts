"use client";

import { useLayoutEffect, useState } from "react";

const DURATION_MS = 600;

/**
 * Animates a number from 0 up to `target` once on mount. Renders the final
 * value straight away when the user prefers reduced motion (or the
 * environment can't tell, e.g. server render or tests).
 */
export function useCountUp(target: number): number {
  const [value, setValue] = useState(target);

  useLayoutEffect(() => {
    const reduce =
      typeof window.matchMedia !== "function" ||
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let frame = 0;
    let start: number | null = null;
    const tick = (now: number) => {
      start ??= now;
      const progress = reduce || target === 0 ? 1 : Math.min(1, (now - start) / DURATION_MS);
      const eased = 1 - (1 - progress) ** 3;
      setValue(progress < 1 ? target * eased : target);
      if (progress < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [target]);

  return value;
}
