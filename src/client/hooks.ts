import { useEffect, useRef, useState } from "react";

export function useVisibility(onVisible?: () => void) {
  const visibilityRef = useRef(null);

  useEffect(() => {
    if (!onVisible) return;
    const observer = new IntersectionObserver(
      (entries) => {
        const target = entries[0];
        if (target?.isIntersecting) {
          onVisible();
        }
      },
      {
        root: null,
        rootMargin: "100px",
        threshold: 0.1,
      },
    );

    const currentTarget = visibilityRef.current;
    if (currentTarget) {
      observer.observe(currentTarget);
    }

    return () => {
      if (currentTarget) {
        observer.unobserve(currentTarget);
      }
      observer.disconnect();
    };
  }, [onVisible]);
  return visibilityRef;
}

export function useBreakpoint(query: string) {
  const [matches, setMatches] = useState<boolean | null>(null);

  useEffect(() => {
    // bail on SSR
    if (typeof window === "undefined") return;

    const media = window.matchMedia(query);

    // set initial state
    setMatches(media.matches);

    // listener for changes
    const listener = (e: MediaQueryListEvent) => setMatches(e.matches);
    media.addEventListener("change", listener);

    return () => media.removeEventListener("change", listener);
  }, [query]);

  return matches;
}
