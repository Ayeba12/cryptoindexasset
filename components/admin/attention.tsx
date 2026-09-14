"use client";

import Link from "next/link";
import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { usePathname } from "next/navigation";
import { getAdminAttention } from "@/lib/admin/attention.server";
import { useAdmin } from "./provider";

type Counts = { deposits: number; withdrawals: number; verification: number };
const Context = createContext<{ counts: Counts | null; unavailable: boolean }>({ counts: null, unavailable: false });
export const useAttention = () => useContext(Context);

export function AttentionProvider({ children }: { children: ReactNode }) {
  const { preview, state, fault } = useAdmin();
  const pathname = usePathname();
  const [counts, setCounts] = useState<Counts | null>(null);
  const [unavailable, setUnavailable] = useState(false);
  useEffect(() => {
    if (preview) return;
    let disposed = false;
    let busy = false;
    async function refresh() {
      if (busy || document.hidden) return;
      busy = true;
      try {
        const next = await getAdminAttention();
        if (!disposed) { setCounts(next); setUnavailable(false); }
      } catch { if (!disposed) setUnavailable(true); }
      finally { busy = false; }
    }
    void refresh();
    const timer = window.setInterval(refresh, 30_000);
    document.addEventListener("visibilitychange", refresh);
    window.addEventListener("focus", refresh);
    window.addEventListener("admin-review-updated", refresh);
    return () => { disposed = true; clearInterval(timer); document.removeEventListener("visibilitychange", refresh); window.removeEventListener("focus", refresh); window.removeEventListener("admin-review-updated", refresh); };
  }, [preview, state, pathname]);
  const previewCounts = {
    deposits: state?.requests.filter(r => r.kind === "Deposit" && r.status === "Pending review").length ?? 0,
    withdrawals: state?.requests.filter(r => r.kind === "Withdrawal" && r.status === "Pending review").length ?? 0,
    verification: state?.users.filter(u => u.verification === "Pending review").length ?? 0,
  };
  return <Context.Provider value={{ counts: preview ? fault === "empty" ? { deposits: 0, withdrawals: 0, verification: 0 } : previewCounts : counts, unavailable: preview ? fault === "read-error" : unavailable }}>{children}</Context.Provider>;
}

export function AttentionSummary() {
  const { counts, unavailable } = useAttention();
  const { preview } = useAdmin();
  const base = preview ? "/design-preview/admin" : "/admin";
  const total = counts ? counts.deposits + counts.withdrawals + counts.verification : null;
  return <section id="admin-attention" aria-label="Needs attention" className="mb-6 rounded-lg border border-border bg-muted/30 p-4">
    <div className="flex flex-wrap items-baseline justify-between gap-2">
      <h2 className="ca-h3">Needs attention{total !== null ? ` · ${total}` : ""}</h2>
      <p className="ca-help" role="status">{unavailable ? "Updates unavailable. Counts may be out of date." : total === null ? "Checking review queues…" : total === 0 ? "All caught up. No pending reviews." : `${total} pending ${total === 1 ? "review" : "reviews"}${preview ? " in this preview" : " · checks every 30 seconds"}`}</p>
    </div>
    <div className="mt-3 flex flex-wrap gap-3">
      {([["verification", "KYC documents"], ["deposits", "Deposits"], ["withdrawals", "Withdrawals"]] as const).map(([key, label]) => <Link key={key} href={`${base}/${key}`} className="inline-flex min-h-10 items-center gap-3 rounded-md border border-border bg-background px-3 py-2 text-sm hover:bg-muted focus-visible:outline focus-visible:outline-2 focus-visible:outline-ring">
        {label}<span className="rounded-full bg-primary px-2 py-0.5 font-mono text-xs text-primary-foreground">{counts?.[key] ?? "—"}</span><span className="sr-only"> awaiting review</span>
      </Link>)}
    </div>
  </section>;
}
