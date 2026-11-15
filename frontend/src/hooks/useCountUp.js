import { useEffect, useRef, useState } from "react";

export const prefersReducedMotion = () =>
  typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

// Animates a number toward `target` whenever it changes (or when `run` turns on).
export default function useCountUp(target, { run = true, duration = 1100 } = {}) {
  const [value, setValue] = useState(run && !prefersReducedMotion() ? 0 : target);
  const from = useRef(0);
  useEffect(() => {
    if (!run || !Number.isFinite(target)) return undefined;
    if (prefersReducedMotion()) {
      setValue(target);
      return undefined;
    }
    const start = performance.now();
    const begin = from.current;
    let frame;
    const tick = (now) => {
      const t = Math.min(1, (now - start) / duration);
      const eased = 1 - (1 - t) ** 3;
      setValue(begin + (target - begin) * eased);
      if (t < 1) frame = requestAnimationFrame(tick);
      else from.current = target;
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [target, run, duration]);
  return value;
}
