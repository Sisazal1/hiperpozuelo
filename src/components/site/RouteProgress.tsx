"use client";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

/**
 * Thin top bar that appears as soon as an internal link is clicked and finishes
 * when the route changes, so a slow page never feels like a dead click.
 */
export default function RouteProgress() {
  const pathname = usePathname();
  const [state, setState] = useState<"idle" | "loading" | "done">("idle");

  useEffect(() => {
    const onClick = (event: MouseEvent) => {
      if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      const anchor = (event.target as HTMLElement | null)?.closest("a");
      if (!anchor || anchor.target === "_blank" || anchor.hasAttribute("download")) return;
      const href = anchor.getAttribute("href");
      if (!href || !href.startsWith("/") || href.startsWith("//")) return;
      const url = new URL(href, window.location.href);
      if (url.pathname === window.location.pathname) return;
      setState("loading");
    };
    document.addEventListener("click", onClick);
    return () => document.removeEventListener("click", onClick);
  }, []);

  useEffect(() => {
    setState((current) => (current === "loading" ? "done" : current));
    const timer = window.setTimeout(() => setState("idle"), 420);
    return () => window.clearTimeout(timer);
  }, [pathname]);

  return <div className={`route-progress is-${state}`} aria-hidden="true"><span /></div>;
}
