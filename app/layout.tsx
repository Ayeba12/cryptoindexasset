import type { Metadata } from "next";
import localFont from "next/font/local";
import { GeistMono } from "geist/font/mono";
import "./globals.css";
import { TooltipProvider } from "@/components/ui/tooltip";

const spaceGrotesk = localFont({
  src: "../node_modules/@fontsource-variable/space-grotesk/files/space-grotesk-latin-wght-normal.woff2",
  variable: "--font-space-grotesk",
  weight: "300 700",
  fallback: ["Arial", "sans-serif"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Crypto Index Asset | Cryptocurrency Copy Trading & Asset Management",
  description: "Enterprise multi-currency portfolio management and institutional copy trading platform.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${spaceGrotesk.variable} ${GeistMono.variable}`}
    >
      <body className="flex min-h-screen flex-col bg-background font-mono text-foreground antialiased">
        <TooltipProvider>{children}</TooltipProvider>
      </body>
    </html>
  );
}
