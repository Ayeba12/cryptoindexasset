"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { COOKIE_NOTICE_KEY, COOKIE_NOTICE_VERSION, hasCurrentCookieNotice } from "@/lib/public-cookie-notice";

const OPEN_EVENT = "ca:open-cookie-notice";

export function CookieSettingsButton() {
  return <Button variant="ghost" className="pp-text-link" type="button" onClick={(event) => {
    window.dispatchEvent(new CustomEvent(OPEN_EVENT, { detail: event.currentTarget }));
  }}>Cookie settings</Button>;
}

export function CookieNotice() {
  const [visible, setVisible] = useState(false);
  const heading = useRef<HTMLHeadingElement>(null);
  const returnTarget = useRef<HTMLElement | null>(null);
  const focusWhenOpened = useRef(false);

  useEffect(() => {
    const sync = () => {
      try { setVisible(!hasCurrentCookieNotice(localStorage.getItem(COOKIE_NOTICE_KEY))); }
      catch (error) { console.warn("Cookie notice preference could not be read.", error); setVisible(true); }
    };
    const open = (event: Event) => {
      returnTarget.current = (event as CustomEvent<HTMLElement>).detail;
      if (heading.current) { heading.current.focus(); return; }
      focusWhenOpened.current = true;
      setVisible(true);
    };
    const storage = (event: StorageEvent) => { if (event.key === COOKIE_NOTICE_KEY || event.key === null) sync(); };
    sync();
    window.addEventListener(OPEN_EVENT, open);
    window.addEventListener("storage", storage);
    return () => { window.removeEventListener(OPEN_EVENT, open); window.removeEventListener("storage", storage); };
  }, []);

  useEffect(() => {
    if (visible && focusWhenOpened.current) {
      heading.current?.focus();
      focusWhenOpened.current = false;
    }
  }, [visible]);

  const acknowledge = () => {
    try { localStorage.setItem(COOKIE_NOTICE_KEY, JSON.stringify({ version: COOKIE_NOTICE_VERSION, acknowledgedAt: Date.now() })); }
    catch (error) { console.warn("Cookie notice acknowledgement could not be saved; hidden for this visit only.", error); }
    setVisible(false);
    if (returnTarget.current?.isConnected) returnTarget.current.focus();
    else document.getElementById("main-content")?.focus({ preventScroll: true });
    returnTarget.current = null;
  };

  if (!visible) return null;
  return (
    <aside className="pp-cookie-notice" aria-labelledby="cookie-notice-title">
      <div className="pp-shell pp-cookie-inner">
        <div>
          <h2 id="cookie-notice-title" className="pp-footer-label" ref={heading} tabIndex={-1}>
            Cookies &amp; your choices
          </h2>
          <p className="pp-small">
            We use storage for your selected settings and cookies for sign-in when enabled. No optional analytics or advertising tools are enabled in this build. You can reopen this notice from Cookie settings.
          </p>
        </div>
        <div className="pp-actions">
          <Button variant="outline" className="pp-button" asChild>
            <Link href="/cookie-policy" prefetch={false}>Cookie policy</Link>
          </Button>
          <Button className="pp-button" onClick={acknowledge}>
            Got it
          </Button>
        </div>
      </div>
    </aside>
  );
}
