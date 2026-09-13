"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { PauseIcon, PlayIcon, SquaresFourIcon } from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";

export function CardMarquee({ id, label, children, reverse = false }: {
  id: string;
  label: string;
  children: ReactNode;
  reverse?: boolean;
}) {
  const root = useRef<HTMLDivElement>(null);
  const [ready, setReady] = useState(false);
  const [active, setActive] = useState(false);
  const [paused, setPaused] = useState(false);
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    const element = root.current;
    if (!element || !("IntersectionObserver" in window)) return;
    const preference = window.matchMedia("(prefers-reduced-motion: reduce)");
    let visible = false;
    const update = () => {
      setReady(!preference.matches);
      setActive(visible && !document.hidden && !preference.matches);
    };
    const observer = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
      update();
    });
    observer.observe(element);
    update();
    document.addEventListener("visibilitychange", update);
    preference.addEventListener("change", update);
    return () => {
      observer.disconnect();
      document.removeEventListener("visibilitychange", update);
      preference.removeEventListener("change", update);
    };
  }, []);

  return <div ref={root} className="pp-people-marquee" data-ready={ready} data-loop={ready && !expanded}
    data-running={active && !paused && !expanded} data-reverse={reverse}>
    <div className="pp-people-controls">
      <p className="pp-small">{expanded ? "All examples, at your own pace." : "Pause to read, or view every example together."}</p>
      <div className="pp-people-control-actions">
        {!expanded && <Button variant="outline" className="pp-button" aria-label={`${paused ? "Resume" : "Pause"} ${label} scrolling`}
          onClick={() => setPaused((value) => !value)}>
          {paused ? <PlayIcon size={16} aria-hidden="true" /> : <PauseIcon size={16} aria-hidden="true" />}
          {paused ? "Resume" : "Pause"}
        </Button>}
        <Button variant="ghost" className="pp-button" aria-controls={id} aria-expanded={expanded}
          onClick={() => setExpanded((value) => !value)}>
          <SquaresFourIcon size={16} aria-hidden="true" />
          {expanded ? `Show scrolling ${label}` : `View all ${label}`}
        </Button>
      </div>
    </div>
    <div id={id} className="pp-people-window">
      <div className="pp-people-track">
        <ul className="pp-people-list" aria-label={`Example ${label}`}>{children}</ul>
        <ul className="pp-people-list pp-people-copy" aria-hidden="true" inert>{children}</ul>
      </div>
    </div>
  </div>;
}
