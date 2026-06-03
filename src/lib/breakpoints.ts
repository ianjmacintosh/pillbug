import { useEffect, useState } from "react";

export const BREAKPOINT_MOBILE = 640;

export function useIsMobile(): boolean {
  const [isMobile, setIsMobile] = useState(
    () => window.matchMedia(`(max-width: ${BREAKPOINT_MOBILE}px)`).matches,
  );

  useEffect(() => {
    const mq = window.matchMedia(`(max-width: ${BREAKPOINT_MOBILE}px)`);
    const handler = (e: MediaQueryListEvent) => setIsMobile(e.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);

  return isMobile;
}
