import { useEffect } from "react";
import { getStoredLanguage } from "@/lib/language";
import { shouldAllowStorefrontPrefetch } from "@/lib/navigation/storefront-prefetch";

const warmed = new Set<string>();
const VIEWPORT_ROOT_MARGIN = "120px";
const MAX_VIEWPORT_PREFETCH = 8;

function warmPdp(slug: string): void {
  if (!shouldAllowStorefrontPrefetch()) return;
  const lang = getStoredLanguage();
  const url = `/api/v1/products/${encodeURIComponent(slug)}?lang=${encodeURIComponent(lang)}`;
  if (warmed.has(url) || warmed.size >= MAX_VIEWPORT_PREFETCH) return;
  warmed.add(url);
  void fetch(url, { method: "GET", credentials: "same-origin", cache: "default" }).catch(() => {
    warmed.delete(url);
  });
}

/**
 * Prefetch PDP JSON for listing cards that enter the viewport (narrow, deduped).
 */
export function usePlpViewportPdpSync(enabled: boolean): void {
  useEffect(() => {
    if (!enabled || typeof IntersectionObserver === "undefined") {
      return;
    }

    const observed = new WeakSet<Element>();
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          const slug = entry.target.getAttribute("data-plp-slug")?.trim();
          if (slug) warmPdp(slug);
          observer.unobserve(entry.target);
        }
      },
      { rootMargin: VIEWPORT_ROOT_MARGIN, threshold: 0.2 },
    );

    const scan = () => {
      document.querySelectorAll("[data-plp-slug]").forEach((node) => {
        if (observed.has(node)) return;
        observed.add(node);
        observer.observe(node);
      });
    };

    scan();
    const mutation = new MutationObserver(scan);
    mutation.observe(document.body, { childList: true, subtree: true });
    return () => {
      observer.disconnect();
      mutation.disconnect();
    };
  }, [enabled]);
}
