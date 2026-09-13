"use client";

import Link from "next/link";
import { useRef, useState } from "react";
import { UserCircleIcon, SignOutIcon } from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ConfirmDialog } from "@/components/dashboard/confirm-dialog";
import { ACCOUNT_PAGES } from "@/lib/admin/account";
import { useAdmin } from "./provider";
import { useAdminRoute } from "./shell";

export function AdminAccountMenu({ expanded = false }: { expanded?: boolean }) {
  const { state, preview } = useAdmin();
  const { href } = useAdminRoute();
  const [exit, setExit] = useState(false);
  const trigger = useRef<HTMLButtonElement>(null);
  const name = state?.account.name ?? "Administrator";
  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            ref={trigger}
            variant="ghost"
            size={expanded ? "default" : "icon-lg"}
            className={
              expanded ? "w-full justify-start min-h-12 gap-3" : "shrink-0"
            }
            aria-label="Admin account menu"
          >
            <UserCircleIcon size={24} aria-hidden="true" />
            {expanded && (
              <span className="ca-rail-hidden min-w-0 text-start">
                <span className="block truncate ca-label">{name}</span>
                <span className="block ca-help">Account & settings</span>
              </span>
            )}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent
          align="end"
          side={expanded ? "top" : "bottom"}
          className="w-64"
        >
          <DropdownMenuLabel>
            <span className="block truncate">{name}</span>
            <span className="block ca-help truncate">
              {state?.account.email ?? "Restricted workspace"}
            </span>
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          {ACCOUNT_PAGES.map(([slug, label]) => (
            <DropdownMenuItem key={slug} asChild className="min-h-11">
              <Link href={href(`account/${slug}`)}>{label}</Link>
            </DropdownMenuItem>
          ))}
          <DropdownMenuSeparator />
          {preview ? (
            <DropdownMenuItem
              className="min-h-11"
              onSelect={() => setExit(true)}
            >
              <SignOutIcon aria-hidden="true" />
              Log out
            </DropdownMenuItem>
          ) : (
            <form method="post" action="/api/auth/logout">
              <DropdownMenuItem asChild className="min-h-11 w-full">
                <button type="submit">
                  <SignOutIcon aria-hidden="true" />
                  Log out
                </button>
              </DropdownMenuItem>
            </form>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
      <ConfirmDialog
        open={exit}
        returnFocusRef={trigger}
        onOpenChange={setExit}
        title="Leave the admin preview?"
        description="There is no signed-in account in this preview. Leaving discards unsaved edits and this browser’s fictional admin changes. Your real session is not changed."
        confirmLabel="Leave preview"
        cancelLabel="Keep reviewing"
        onConfirm={() => {
          window.location.assign("/design-preview/home");
        }}
      />
    </>
  );
}
