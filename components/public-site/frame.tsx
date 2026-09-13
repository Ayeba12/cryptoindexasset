"use client";

import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Dialog } from "radix-ui";
import { ArrowUpRightIcon, MoonIcon, SunIcon, XIcon } from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";

type Theme = "dark" | "light" | "system";
type Destination = { label: string; route: string; trigger: HTMLElement };
type PublicContextValue = {
  preview: boolean;
  portal: HTMLDivElement | null;
  theme: Theme;
  resolvedTheme: "dark" | "light";
  setTheme: (theme: Theme) => void;
  visit: (destination: Destination) => void;
};
const PublicContext = createContext<PublicContextValue | null>(null);

export function usePublicSite() {
  const value = useContext(PublicContext);
  if (!value) throw new Error("Public controls require PublicFrame.");
  return value;
}

export function PublicFrame({ children, preview = false, compact = false }: { children: ReactNode; preview?: boolean; compact?: boolean }) {
  const [theme, setThemeState] = useState<Theme>(preview ? "dark" : "system");
  const [systemDark, setSystemDark] = useState(true);
  const [portal, setPortal] = useState<HTMLDivElement | null>(null);
  const [destination, setDestination] = useState<Destination | null>(null);
  const lastTrigger = useRef<HTMLElement | null>(null);
  const pathname = usePathname();

  useEffect(() => {
    const preference = window.matchMedia("(prefers-color-scheme: dark)");
    const update = () => setSystemDark(preference.matches);
    update();
    if (!preview) {
      try {
        const saved = localStorage.getItem("ca-public-theme");
        if (saved === "dark" || saved === "light" || saved === "system") setThemeState(saved);
      } catch (error) { console.warn("Public theme preference could not be read; using system theme.", error); }
    }
    preference.addEventListener("change", update);
    return () => preference.removeEventListener("change", update);
  }, [preview]);

  const setTheme = (next: Theme) => {
    setThemeState(next);
    if (!preview) {
      try { localStorage.setItem("ca-public-theme", next); }
      catch (error) { console.warn("Public theme preference could not be saved.", error); }
    }
  };
  const resolvedTheme = theme === "system" ? (systemDark ? "dark" : "light") : theme;

  return <PublicContext.Provider value={{ preview, portal, theme, resolvedTheme, setTheme, visit: (next) => {
    if (!preview) return;
    lastTrigger.current = next.trigger;
    setDestination(next);
  } }}>
    <div className="public-site" data-theme={resolvedTheme} data-mode={preview ? "preview" : "public"}>
      <a className="pp-skip" href={preview ? "#preview-main" : "#main-content"}>Skip to content</a>
      {preview && <aside className="pp-review-bar" aria-label="Design review tools">
        <span>Design review <span className="pp-review-note">/ no live transactions</span></span>
        <nav aria-label="Design previews">
          <Link href="/design-preview/home" aria-current={pathname === "/design-preview/home" ? "page" : undefined}>Homepage</Link>
          <Link href="/design-preview" aria-current={pathname === "/design-preview" ? "page" : undefined}>Components</Link>
          <ThemeSelect />
        </nav>
      </aside>}
      {!compact && <noscript><p className="pp-no-script">{preview ? "Design preview. No live service is connected." : "The navigation links are also available in the footer. Theme controls require JavaScript."}</p></noscript>}
      {children}
      <div ref={setPortal} />
      {preview && <Dialog.Root open={destination !== null} onOpenChange={(open) => { if (!open) setDestination(null); }}>
        {portal && <Dialog.Portal container={portal}>
          <Dialog.Overlay className="pp-overlay" />
          <Dialog.Content className="pp-dialog" onCloseAutoFocus={(event) => {
            event.preventDefault();
            lastTrigger.current?.focus();
          }}>
            <Dialog.Title className="pp-h3">{destination?.label}</Dialog.Title>
            <Dialog.Description className="pp-dialog-description">This destination is not connected in the design preview.</Dialog.Description>
            <p>Planned route: <code>{destination?.route}</code></p>
            <p className="pp-small">No account is created, message sent or money moved. This review covers the appearance and behaviour of the public interface.</p>
            <div className="pp-actions"><Dialog.Close asChild><Button className="pp-button">Back to preview</Button></Dialog.Close></div>
            <Dialog.Close asChild><Button variant="ghost" className="pp-icon-button pp-dialog-close" aria-label="Close dialog"><XIcon aria-hidden="true" size={20} /></Button></Dialog.Close>
          </Dialog.Content>
        </Dialog.Portal>}
      </Dialog.Root>}
    </div>
  </PublicContext.Provider>;
}

export function ThemeSelect() {
  const { theme, setTheme, preview } = usePublicSite();
  return <label className="pp-theme-label">
    <span className="pp-sr-only">{preview ? "Preview colour theme" : "Website colour theme"}</span>
    <select value={theme} onChange={(event) => setTheme(event.target.value as Theme)}>
      <option value="system">System theme</option>
      <option value="light">Light theme</option>
      <option value="dark">Dark theme</option>
    </select>
  </label>;
}

export function ThemeToggle() {
  const { resolvedTheme, setTheme } = usePublicSite();
  return <Button variant="ghost" className="pp-icon-button" aria-label={`Switch to ${resolvedTheme === "dark" ? "light" : "dark"} theme`}
    onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}>
    {resolvedTheme === "dark" ? <SunIcon size={20} aria-hidden="true" /> : <MoonIcon size={20} aria-hidden="true" />}
  </Button>;
}

export function PublicDestination({ children, route, label, className = "pp-text-link", variant = "ghost", arrow = false }: {
  children: ReactNode; route: string; label: string; className?: string;
  variant?: "default" | "outline" | "ghost"; arrow?: boolean;
}) {
  const { visit, preview } = usePublicSite();
  const content = <>{children}{arrow && <ArrowUpRightIcon size={20} aria-hidden="true" />}</>;
  if (!preview) return <Button asChild variant={variant} className={className}><Link href={route} prefetch={false}>{content}</Link></Button>;
  return <Button type="button" variant={variant} className={className}
    onClick={(event) => visit({ label, route, trigger: event.currentTarget })}>{content}</Button>;
}
