"use client";
import { useState, type ReactNode } from "react";
import { CoinsIcon, BankIcon } from "@phosphor-icons/react";

export const COIN_LOGOS: Record<string, string> = {
  BTC: "/images/icon/btc.png",
  ETH: "/images/icon/eth.png",
  BCH: "/images/icon/bch.svg",
  LTC: "/images/icon/ltc.png",
  XRP: "/images/icon/xrp.png",
  USDT: "/images/icon/usdt.svg",
};
export function CoinIdentity({
  currency,
  children,
}: {
  currency: string;
  children?: ReactNode;
}) {
  const [failedSource, setFailedSource] = useState("");
  const src = COIN_LOGOS[currency];
  const Fallback = currency === "USD" ? BankIcon : CoinsIcon;
  return (
    <span className="inline-flex min-w-0 items-center gap-2 align-middle">
      <span
        className="inline-flex size-6 shrink-0 items-center justify-center"
        aria-hidden="true"
      >
        {src && failedSource !== src ? (
          <img
            src={src}
            width={24}
            height={24}
            alt=""
            className="size-6 rounded-full object-contain"
            onError={() => setFailedSource(src)}
          />
        ) : (
          <Fallback size={24} />
        )}
      </span>
      <span className="min-w-0">{children ?? currency}</span>
    </span>
  );
}
