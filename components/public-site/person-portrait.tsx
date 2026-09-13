"use client";

import Image from "next/image";
import { useState } from "react";

export function PersonPortrait({ name, src, alt, size = 64 }: {
  name: string;
  src?: string | null;
  alt?: string | null;
  size?: number;
}) {
  const [failedSource, setFailedSource] = useState<string | null>(null);
  const source = src?.trim();
  const supported = source && (/^https?:\/\//i.test(source) || /^\/(?!\/)/.test(source) || /^data:image\/(png|jpeg|webp);base64,/i.test(source));
  if (!supported || failedSource === source) {
    const initials = name.trim().split(/\s+/).filter(Boolean).slice(0, 2).map(part => Array.from(part)[0]).join("").toUpperCase() || "?";
    return <span className="pp-person-portrait" role="img" aria-label={`Portrait unavailable for ${name}`}
      style={{ width: size, height: size, display: "inline-grid", placeItems: "center", flexShrink: 0 }}>{initials}</span>;
  }
  return <Image className="pp-person-portrait" src={source} alt={alt?.trim() || `Portrait of ${name}`}
    width={size} height={size} sizes={`${size}px`} unoptimized={source.startsWith("data:")}
    onError={() => setFailedSource(source)} />;
}
