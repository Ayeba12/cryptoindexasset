"use client";

import Image from "next/image";
import Link from "next/link";
import { usePublicSite } from "./frame";

export function Brand({ footer = false }: { footer?: boolean }) {
  const { preview } = usePublicSite();
  return <Link className={`pp-brand${footer ? " pp-brand-footer" : ""}`} href={preview ? "/design-preview/home" : "/"} aria-label="Crypto Index Asset home">
    <span className="pp-brand-mark" aria-hidden="true">
      <Image className="pp-logo-light" src="/brand/ca-on-light.svg" width={80} height={52} alt="" />
      <Image className="pp-logo-dark" src="/brand/ca-on-dark.svg" width={80} height={52} alt="" />
    </span>
  </Link>;
}
