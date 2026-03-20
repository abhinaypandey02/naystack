import { useEffect, useRef, useState } from "react";

/**
 * Tracks when a DOM element enters the viewport and calls a callback.
 * Uses `IntersectionObserver` with `rootMargin: "100px"` and `threshold: 0.1`.
 *
 * Attach the returned ref to the element you want to observe.
 *
 * @param onVisible - Optional callback invoked once when the observed element becomes visible.
 * @returns A ref object to attach to the observed element (e.g. `<div ref={ref}>`).
 *
 * @example Lazy-load content when a section enters the viewport:
 * ```tsx
 * import { useVisibility } from "naystack/client";
 *
 * function LazySection() {
 *   const [loaded, setLoaded] = useState(false);
 *   const ref = useVisibility(() => setLoaded(true));
 *
 *   return (
 *     <section ref={ref}>
 *       {loaded ? <HeavyContent /> : <Placeholder />}
 *     </section>
 *   );
 * }
 * ```
 *
 * @example Trigger analytics when an element is seen:
 * ```tsx
 * const ref = useVisibility(() => trackImpression("hero-banner"));
 * return <div ref={ref}>...</div>;
 * ```
 *
 * @category Client
 */
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

/**
 * Returns whether a CSS media query currently matches. Useful for responsive behavior in JS.
 *
 * Returns `null` during SSR / before the first client-side check (to avoid hydration mismatches).
 *
 * @param query - A valid CSS media query string (e.g. `"(min-width: 768px)"`, `"(prefers-color-scheme: dark)"`).
 * @returns `true` if the query matches, `false` if it doesn't, or `null` during SSR.
 *
 * @example Responsive navigation:
 * ```tsx
 * import { useBreakpoint } from "naystack/client";
 *
 * function ResponsiveNav() {
 *   const isMobile = useBreakpoint("(max-width: 639px)");
 *   if (isMobile === null) return <Skeleton />;  // SSR fallback
 *   return isMobile ? <MobileNav /> : <DesktopNav />;
 * }
 * ```
 *
 * @example Detect user preferences:
 * ```tsx
 * const prefersReducedMotion = useBreakpoint("(prefers-reduced-motion: reduce)");
 * ```
 *
 * @category Client
 */
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
