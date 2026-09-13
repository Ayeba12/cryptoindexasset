"use client";

import { QRCodeSVG } from "qrcode.react";

import { cn } from "@/lib/utils";

/**
 * QR code for a deposit destination. Renders the exact validated string
 * supplied by the caller inside the `.ca-qr` quiet zone (white background,
 * 12px padding, black modules in both themes), 192px, error level M.
 */
export function QrCode({
  value,
  size = 192,
  label = "QR code for the deposit address shown below",
  className,
}: {
  /** Exact payload; never derived or reformatted here. */
  value: string;
  size?: number;
  label?: string;
  className?: string;
}) {
  return (
    <div className={cn("ca-qr", className)} role="img" aria-label={label} data-slot="qr">
      <QRCodeSVG value={value} size={size} level="M" bgColor="#ffffff" fgColor="#000000" marginSize={0} aria-hidden="true" />
    </div>
  );
}
