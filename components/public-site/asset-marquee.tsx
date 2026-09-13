"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { PauseIcon, PlayIcon } from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";

const assets = [["Bitcoin", "btc"], ["Ethereum", "eth"], ["Litecoin", "ltc"], ["XRP", "xrp"]] as const;

export function AssetMarquee() {
  const root = useRef<HTMLDivElement>(null);
  const [paused, setPaused] = useState(false);
  const [active, setActive] = useState(false);
  useEffect(() => {
    const element = root.current;
    if (!element || !("IntersectionObserver" in window)) return;
    let visible = false;
    const update = () => setActive(visible && !document.hidden);
    const observer = new IntersectionObserver(([entry]) => { visible = entry.isIntersecting; update(); });
    observer.observe(element);
    document.addEventListener("visibilitychange", update);
    return () => { observer.disconnect(); document.removeEventListener("visibilitychange", update); };
  }, []);
  return <div ref={root} className="pp-marquee" data-running={active && !paused}>
    <div className="pp-marquee-heading">
      <p className="pp-small" id="asset-strip-heading">Assets in focus</p>
      <Button variant="ghost" className="pp-icon-button pp-marquee-control" aria-label={paused ? "Play asset logo animation" : "Pause asset logo animation"}
        onClick={() => setPaused((value) => !value)}>
        {paused ? <PlayIcon size={16} aria-hidden="true" /> : <PauseIcon size={16} aria-hidden="true" />}
      </Button>
    </div>
    <div className="pp-marquee-window">
      <div className="pp-marquee-track">
        {[false, true].map((duplicate) => <ul className="pp-marquee-list" key={String(duplicate)} aria-hidden={duplicate || undefined} aria-labelledby={duplicate ? undefined : "asset-strip-heading"}>
          {assets.map(([name, symbol]) => <li key={symbol}>
            <Image src={`/images/icon/${symbol}.png`} width={40} height={40} alt="" />
            <span>{name}</span>
          </li>)}
        </ul>)}
      </div>
    </div>
    <p className="pp-marquee-note">Asset availability and networks are confirmed in your account.</p>
  </div>;
}
