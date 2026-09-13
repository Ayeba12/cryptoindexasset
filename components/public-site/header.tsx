"use client";

import { useRef, useState, type MouseEvent } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Dialog, NavigationMenu } from "radix-ui";
import { ArrowUpRightIcon, CaretDownIcon, ListIcon, XIcon } from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import { PublicDestination, ThemeToggle, usePublicSite } from "./frame";
import { Brand } from "./brand";

export function PublicHeader() {
  const [open, setOpen] = useState(false);
  const [desktopMenu, setDesktopMenu] = useState("");
  const { portal, visit, preview } = usePublicSite();
  const router = useRouter();
  const pathname = usePathname();
  const desktopTriggers = useRef<Record<string, HTMLButtonElement | null>>({});
  const trigger = useRef<HTMLButtonElement>(null);
  const mobileNavigation = useRef<HTMLElement>(null);
  const pendingHref = useRef<string | null>(null);
  const pendingPreview = useRef<{ label: string; route: string } | null>(null);
  const homeAnchor = (hash: string) => preview || pathname === "/" ? hash : `/${hash}`;
  const groups = [
    { label: "Product", links: [
      { label: "Account overview", description: "Balances and activity in one view.", href: homeAnchor("#account") },
      { label: "How it works", description: "Know the steps before you begin.", href: preview ? "#process" : "/how-it-works" },
      { label: "Copy trading", description: "Understand the strategy you follow.", href: preview ? "#copy-trading" : "/copy-trading" },
    ] },
    { label: "Resources", links: preview ? [
      { label: "FAQs", description: "Answers before you create an account.", href: "#questions" },
      { label: "Fees", description: "Understand the costs involved.", href: "/fees" },
      { label: "Security", description: "Account access and custody details.", href: "/security" },
      { label: "Contact", description: "Ask a question about the service.", href: "/contact" },
    ] : [
      { label: "Account questions", description: "Answers before you create an account.", href: homeAnchor("#questions") },
      { label: "Fees", description: "Transparent fee schedule and withdrawal costs.", href: "/fees" },
      { label: "Security", description: "Account security and custodial safeguards.", href: "/security" },
      { label: "Risk disclosure", description: "Market volatility and copy-trading risks.", href: "/risk-disclosure" },
      { label: "About", description: "The purpose behind the platform.", href: "/about" },
      { label: "Contact", description: "Find help and prepare your enquiry.", href: "/contact" },
    ] },
  ];
  const navigation = preview ? [
    ["How it works", "#process"], ["Copy trading", "#copy-trading"], ["For investors", "#details"],
    ["About", "/about"], ["Help", "#questions"], ["Fees", "/fees"], ["Security", "/security"], ["Risk disclosure", "/risk-disclosure"], ["Contact", "/contact"],
  ] : [
    ["Home", "/"], ["How it works", "/how-it-works"], ["Copy trading", "/copy-trading"],
    ["Fees", "/fees"], ["Security", "/security"], ["Risk disclosure", "/risk-disclosure"],
    ["About", "/about"], ["Contact", "/contact"], ["Terms and conditions", "/terms"], ["Privacy policy", "/policy"], ["Cookie policy", "/cookie-policy"],
    ["Sign in", "/login"], ["Create account", "/register"],
  ];

  const closeForLink = (event: MouseEvent<HTMLAnchorElement>, href: string) => {
    if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    event.preventDefault();
    pendingHref.current = href;
    setOpen(false);
  };

  return <header className="pp-header">
    <div className="pp-shell pp-header-inner">
      <Brand />
      <NavigationMenu.Root className="pp-desktop-nav" aria-label="Main navigation" value={desktopMenu} onValueChange={setDesktopMenu} delayDuration={120}>
        <NavigationMenu.List className="pp-nav-list">
          {groups.map((group) => <NavigationMenu.Item value={group.label} key={group.label}>
            <NavigationMenu.Trigger className="pp-nav-trigger" ref={(element) => { desktopTriggers.current[group.label] = element; }}>
              {group.label}<CaretDownIcon size={14} aria-hidden="true" />
            </NavigationMenu.Trigger>
            <NavigationMenu.Content className="pp-nav-panel">
              <p className="pp-nav-panel-label">{group.label === "Product" ? "Get to know your account" : "Before you decide"}</p>
              <ul className="pp-nav-panel-links">
                {group.links.map((link) => <li key={link.href}>
                  {preview && !link.href.startsWith("#")
                    ? <Button variant="ghost" onClick={() => {
                      setDesktopMenu("");
                      const returnTarget = desktopTriggers.current[group.label];
                      if (returnTarget) visit({ label: link.label, route: link.href, trigger: returnTarget });
                    }}><span>{link.label}</span><small>{link.description}</small></Button>
                    : <NavigationMenu.Link asChild><Link href={link.href} prefetch={false} onClick={() => setDesktopMenu("")} aria-current={pathname === link.href ? "page" : undefined}><span>{link.label}</span><small>{link.description}</small></Link></NavigationMenu.Link>}
                </li>)}
              </ul>
              <Link className="pp-nav-panel-footer" href={homeAnchor("#details")} onClick={() => setDesktopMenu("")}>Read the details before investing<ArrowUpRightIcon size={18} aria-hidden="true" /></Link>
            </NavigationMenu.Content>
          </NavigationMenu.Item>)}
          <NavigationMenu.Item><NavigationMenu.Link asChild><Link href={preview ? "#copy-trading" : "/copy-trading"} aria-current={!preview && pathname === "/copy-trading" ? "page" : undefined}>Copy trading</Link></NavigationMenu.Link></NavigationMenu.Item>
          <NavigationMenu.Item><NavigationMenu.Link asChild><Link href={homeAnchor("#details")}>For investors</Link></NavigationMenu.Link></NavigationMenu.Item>
          <NavigationMenu.Item><PublicDestination label="About" route="/about">About</PublicDestination></NavigationMenu.Item>
        </NavigationMenu.List>
      </NavigationMenu.Root>
      <div className="pp-header-actions">
        {!preview && <ThemeToggle />}
        <PublicDestination className="pp-text-link pp-sign-in" route="/login" label="Sign in">Sign in</PublicDestination>
        <PublicDestination className="pp-button pp-header-create" variant="default" route="/register" label="Create account">Create account</PublicDestination>
        <Dialog.Root open={open} onOpenChange={setOpen}>
          <Dialog.Trigger asChild><Button ref={trigger} variant="ghost" className="pp-icon-button pp-menu-trigger" aria-label="Open menu"><ListIcon size={24} aria-hidden="true" /></Button></Dialog.Trigger>
          {portal && <Dialog.Portal container={portal}>
            <Dialog.Overlay className="pp-overlay" />
            <Dialog.Content className="pp-sheet" onOpenAutoFocus={(event) => {
              event.preventDefault();
              mobileNavigation.current?.querySelector<HTMLElement>("a, button")?.focus();
            }} onCloseAutoFocus={(event) => {
              const href = pendingHref.current;
              if (href) {
                event.preventDefault();
                pendingHref.current = null;
                if (href.startsWith("#")) {
                  const target = document.getElementById(href.slice(1));
                  window.location.hash = href;
                  target?.focus({ preventScroll: true });
                  target?.scrollIntoView({ block: "start" });
                } else router.push(href);
              }
              if (pendingPreview.current && trigger.current) {
                event.preventDefault();
                visit({ ...pendingPreview.current, trigger: trigger.current });
                pendingPreview.current = null;
              }
            }}>
              <Dialog.Title className="pp-h3">Explore</Dialog.Title>
              <Dialog.Description className="pp-small">{preview ? "Crypto Index Asset public portal preview." : "Account guides and information before you invest."}</Dialog.Description>
              <nav ref={mobileNavigation} aria-label="Mobile navigation" className="pp-sheet-nav">
                {navigation.map(([label, href]) => preview && !href.startsWith("#")
                  ? <Button variant="ghost" className="pp-text-link" key={label} onClick={() => { pendingPreview.current = { label, route: href }; setOpen(false); }}>{label}</Button>
                  : <Link href={href} prefetch={false} key={label} aria-current={pathname === href ? "page" : undefined} onClick={(event) => closeForLink(event, href)}>{label}</Link>)}
              </nav>
              {preview ? <Button className="pp-button" onClick={() => { pendingPreview.current = { label: "Create account", route: "/register" }; setOpen(false); }}>Create account</Button>
                : <Button asChild className="pp-button"><Link href="/register" prefetch={false} onClick={(event) => closeForLink(event, "/register")}>Create account</Link></Button>}
              {preview && <p className="pp-small">Preview only. Account actions are not connected.</p>}
              <Dialog.Close asChild><Button className="pp-icon-button pp-dialog-close" variant="ghost" aria-label="Close menu"><XIcon size={24} aria-hidden="true" /></Button></Dialog.Close>
            </Dialog.Content>
          </Dialog.Portal>}
        </Dialog.Root>
      </div>
    </div>
  </header>;
}
