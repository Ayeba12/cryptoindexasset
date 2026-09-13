"use client";

import Image from "next/image";
import { usePublicSite } from "./frame";

const scenes = {
  "01-hero-overview": [1536, 1024],
  "02-trader-discovery": [1448, 1086],
  "03-strategy-profile": [1448, 1086],
  "04-copy-settings": [1448, 1086],
  "05-portfolio-allocation": [1586, 992],
  "06-trade-activity": [1448, 1086],
  "07-mobile-companion": [1448, 1086],
  "08-closing-mockup": [1672, 941],
} as const;

export type ProductScene = keyof typeof scenes;

export function ProductImage({ scene, alt, sizes, priority = false }: {
  scene: ProductScene;
  alt: string;
  sizes: string;
  priority?: boolean;
}) {
  const { resolvedTheme } = usePublicSite();
  const [width, height] = scenes[scene];
  // A single source per slot: no CSS inversion, hidden alternate image, or mixed-theme panel.
  return <Image key={`${scene}-${resolvedTheme}`} data-product-scene={scene} data-image-theme={resolvedTheme}
    src={`/images/copy-trading/paired/${scene}-${resolvedTheme}.webp`}
    width={width} height={height} alt={alt} sizes={sizes} priority={priority} />;
}
