"use client";

import { useTheme } from "next-themes";
import { useState, type ReactNode } from "react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { SessionAccount } from "@/lib/dashboard/contracts";
import type { DashboardMode } from "@/lib/dashboard/data-source";
import { SETTINGS_TABS } from "@/lib/dashboard/navigation";

import { DashboardLink } from "./dashboard-link";

/** Name/email/initials the shell shows for any session state. */
export function accountIdentity(account: SessionAccount | null): { name: string; email: string | null; initials: string } {
  if (!account) return { name: "Account", email: null, initials: "" };
  switch (account.state) {
    case "authenticated":
      return { name: account.displayName, email: account.email, initials: account.initials };
    case "unprovisioned":
    case "restricted":
      return { name: account.email, email: null, initials: account.email.charAt(0).toUpperCase() };
    default:
      return { name: "Account", email: null, initials: "" };
  }
}

/**
 * Account menu: identity label, Profile / Security / Verification / Help,
 * theme radio group (Light / Dark / System) and Sign out. Live sign-out is a
 * POST form to `/api/auth/logout` (the route signs out server-side and
 * redirects); preview sign-out opens a dialog explaining the preview is not
 * connected. Pass the trigger element as `children`.
 */
export function UserMenu({
  account,
  mode,
  children,
  align = "end",
  side,
}: {
  account: SessionAccount | null;
  mode: DashboardMode;
  children: ReactNode;
  align?: "start" | "center" | "end";
  side?: "top" | "right" | "bottom" | "left";
}) {
  const { theme, setTheme } = useTheme();
  const [previewDialogOpen, setPreviewDialogOpen] = useState(false);
  const identity = accountIdentity(account);

  return (
    <>
      <DropdownMenu modal={false}>
        <DropdownMenuTrigger asChild>{children}</DropdownMenuTrigger>
        <DropdownMenuContent align={align} side={side} sideOffset={6} className="w-64 min-w-[14rem]" data-user-menu="true">
          <DropdownMenuLabel className="flex flex-col gap-0.5 px-2 py-2">
            <span className="ca-body truncate font-medium text-foreground">{identity.name}</span>
            {identity.email ? <span className="ca-help truncate">{identity.email}</span> : null}
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuGroup>
            {SETTINGS_TABS.map((tab) => (
              <DropdownMenuItem key={tab.id} asChild className="ca-body min-h-8">
                <DashboardLink href={tab.href}>{tab.label}</DashboardLink>
              </DropdownMenuItem>
            ))}
            <DropdownMenuItem asChild className="ca-body min-h-8">
              <DashboardLink href="/dashboard/help">Help</DashboardLink>
            </DropdownMenuItem>
          </DropdownMenuGroup>
          <DropdownMenuSeparator />
          <DropdownMenuLabel className="ca-label px-2 py-1.5 text-muted-foreground">Theme</DropdownMenuLabel>
          <DropdownMenuRadioGroup value={theme ?? "system"} onValueChange={(value) => setTheme(value)}>
            {THEME_OPTIONS.map((option) => (
              <DropdownMenuRadioItem
                key={option.value}
                value={option.value}
                className="ca-body min-h-8"
                onSelect={(event) => event.preventDefault()}
              >
                {option.label}
              </DropdownMenuRadioItem>
            ))}
          </DropdownMenuRadioGroup>
          <DropdownMenuSeparator />
          {mode === "live" ? (
            <form method="post" action="/api/auth/logout" className="contents">
              <DropdownMenuItem asChild className="ca-body min-h-8 w-full">
                <button type="submit">Sign out</button>
              </DropdownMenuItem>
            </form>
          ) : (
            <DropdownMenuItem className="ca-body min-h-8" onSelect={() => setPreviewDialogOpen(true)}>
              Sign out
            </DropdownMenuItem>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
      {mode === "preview" ? (
        <Dialog open={previewDialogOpen} onOpenChange={setPreviewDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle className="ca-h3">Sign out is not connected</DialogTitle>
              <DialogDescription className="ca-body ca-form-prose">
                This is the design review. It renders fixture data and is not connected to an account, so there is
                no session to end. On the live dashboard, Sign out posts to the logout route and returns to the login
                page.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button type="button" variant="outline" size="lg" onClick={() => setPreviewDialogOpen(false)}>
                Close
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      ) : null}
    </>
  );
}

const THEME_OPTIONS = [
  { value: "light", label: "Light" },
  { value: "dark", label: "Dark" },
  { value: "system", label: "System" },
] as const;
