"use client";

import { useEffect, useRef, type ReactNode } from "react";

export function PublicMotion({ children }: { children: ReactNode }) {
  const root = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const element = root.current;
    if (!element || !("IntersectionObserver" in window) || !("animate" in Element.prototype)) return;
    const preference = window.matchMedia("(prefers-reduced-motion: reduce)");
    const animations = new Set<Animation>();
    const observer = new IntersectionObserver((entries) => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        observer.unobserve(entry.target);
        if (preference.matches || document.hidden || entry.target.contains(document.activeElement)) continue;
        const target = entry.target as HTMLElement;
        const image = target.dataset.reveal === "image";
        const siblings = target.parentElement?.hasAttribute("data-stagger")
          ? Array.from(target.parentElement.children).filter((child) => child.hasAttribute("data-reveal")) : [];
        const delay = Math.min(Math.max(siblings.indexOf(target), 0), 3) * 60;
        const animation = entry.target.animate([
          { opacity: image ? 0.65 : 0.35, transform: image ? "translateY(16px) scale(0.98)" : "translateY(24px)" },
          { opacity: 1, transform: "translateY(0) scale(1)" },
        ], { duration: 640, delay, fill: "backwards", easing: "cubic-bezier(0.22, 1, 0.36, 1)" });
        animations.add(animation);
        animation.onfinish = () => animations.delete(animation);
      }
    }, { threshold: 0.06 });
    element.querySelectorAll("[data-reveal]").forEach((target) => observer.observe(target));
    const finish = () => { animations.forEach((animation) => animation.finish()); animations.clear(); };
    const onPreference = () => { if (preference.matches) finish(); };
    const onVisibility = () => { if (document.hidden) finish(); };
    // Keyboard users never have to follow a moving focus target.
    element.addEventListener("focusin", finish);
    document.addEventListener("visibilitychange", onVisibility);
    preference.addEventListener("change", onPreference);
    return () => {
      observer.disconnect();
      animations.forEach((animation) => animation.cancel());
      element.removeEventListener("focusin", finish);
      document.removeEventListener("visibilitychange", onVisibility);
      preference.removeEventListener("change", onPreference);
    };
  }, []);
  return <div ref={root} className="pp-motion-root">{children}</div>;
}
