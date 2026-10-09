import { useEffect, useRef } from "react";
import type { RefObject } from "react";

interface UseRevealOptions {
  threshold?: number;
  rootMargin?: string;
}

/**
 * Adds the "is-visible" class to the element once it enters the viewport.
 * Pair with the .reveal utility from index.css.
 * With prefers-reduced-motion, or without IntersectionObserver, the element is shown immediately.
 */
export function useReveal<T extends HTMLElement = HTMLDivElement>({
  threshold = 0.15,
  rootMargin = "0px 0px -10% 0px",
}: UseRevealOptions = {}): RefObject<T | null> {
  const ref = useRef<T>(null);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduceMotion || typeof IntersectionObserver === "undefined") {
      element.classList.add("is-visible");
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-visible");
            observer.unobserve(entry.target);
          }
        }
      },
      { threshold, rootMargin },
    );

    observer.observe(element);
    return () => observer.disconnect();
  }, [threshold, rootMargin]);

  return ref;
}
