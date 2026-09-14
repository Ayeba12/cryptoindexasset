"use client";
import { useEffect, useState } from "react";
import { CoinIdentity } from "@/components/dashboard/coin-identity";
import { Button } from "@/components/ui/button";
import { Panel, KeyValueList } from "@/components/dashboard/panel";
import { PageHeading } from "@/components/dashboard/page-heading";
import { ConfirmDialog } from "@/components/dashboard/confirm-dialog";
import { Choice } from "@/components/dashboard/views/shared";
import { record, type Request } from "@/lib/admin/model";
import { toggleSignalVisibilityAction } from "@/lib/admin/signals.server";
import {
  getAdminVerificationQueueAction,
  getKycDocumentSignedUrlAction,
  reviewKycAction,
  type AdminKycItem,
} from "@/lib/admin/verification.server";
import {
  getAdminFinancialRequestsAction,
  reviewDepositAction,
  reviewWithdrawalAction,
  type AdminFinancialItem,
} from "@/lib/admin/financials.server";
import { useAdmin } from "./provider";
import { AdminLink, Field, Notice, Status, Records } from "./shared";
import { SignalCreate } from "./signal-create";

export function RequestQueue({ kind }: { kind: Request["kind"] }) {
  const { state, commit, fault } = useAdmin();
  const [liveItems, setLiveItems] = useState<AdminFinancialItem[]>([]);
  const [filter, setFilter] = useState("Pending review");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [decision, setDecision] = useState<"Approved" | "Declined">("Approved");
  const [verifiedAmount, setVerifiedAmount] = useState("");
  const [reason, setReason] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchLive = async () => {
    try {
      const res = await getAdminFinancialRequestsAction(kind);
      if (res.success && res.items) {
        setLiveItems(res.items);
      }
    } catch (err) {
      console.warn("[operations] Error loading live financial requests:", err);
    }
  };

  useEffect(() => {
    fetchLive();
  }, [kind]);

  const liveSelected = liveItems.find((r) => r.id === selectedId);
  const previewSelected = state!.requests.find((r) => r.id === selectedId);

  // Use live rows if available, else preview fallback
  const isLive = liveItems.length > 0;

  const rows = isLive
    ? liveItems.filter((r) => {
        const itemStatus =
          r.status === "PENDING"
            ? "Pending review"
            : r.status === "APPROVED"
              ? "Approved"
              : "Declined";
        return filter === "all" || itemStatus === filter;
      })
    : state!.requests.filter(
        (r) => r.kind === kind && (filter === "all" || r.status === filter),
      );

  async function submit() {
    setError("");
    setMessage("");

    if (decision === "Declined" && reason.trim().length < 8) {
      setError("Provide a decline justification of at least 8 characters.");
      return;
    }

    if (isLive && liveSelected) {
      setIsSubmitting(true);
      try {
        if (kind === "Deposit") {
          const res = await reviewDepositAction(
            liveSelected.id,
            decision,
            verifiedAmount || liveSelected.amount,
            reason,
          );
          if (!res.success) {
            setError(res.error || "Failed to process deposit decision.");
            return;
          }
          setMessage(`Deposit ${liveSelected.id} marked ${decision.toLowerCase()} and credited to customer wallet.`);
        } else {
          const res = await reviewWithdrawalAction(
            liveSelected.id,
            decision,
            reason,
          );
          if (!res.success) {
            setError(res.error || "Failed to process withdrawal decision.");
            return;
          }
          setMessage(
            decision === "Approved"
              ? `Withdrawal ${liveSelected.id} approved and dispatched.`
              : `Withdrawal ${liveSelected.id} declined. Reserved hold has been returned to customer.`
          );
        }

        setSelectedId(null);
        window.dispatchEvent(new Event("admin-review-updated"));
        await fetchLive();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to record decision.");
      } finally {
        setIsSubmitting(false);
      }
      return;
    }

    // Preview state fallback
    try {
      if (!previewSelected || reason.trim().length < 8)
        throw new Error("Provide a review reason of at least 8 characters.");
      commit((current) => {
        const request = current.requests.find((r) => r.id === selectedId);
        if (!request || request.status !== "Pending review")
          throw new Error(
            "This request was already reviewed. Refresh the queue.",
          );
        request.status = decision;
        request.reason = reason;
        record(
          current,
          `${kind} ${decision.toLowerCase()}`,
          request.id,
          reason,
          new Date().toISOString(),
        );
        return current;
      });
      setSelectedId(null);
      setMessage(
        `${kind} marked ${decision.toLowerCase()} in preview. Settlement is not confirmed; balances have not changed.`,
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not review request.");
    }
  }

  return (
    <>
      <PageHeading
        title={`${kind}s`}
        subtitle={
          kind === "Deposit"
            ? "Review incoming requests and on-chain evidence before recording a decision."
            : "Review payout requests. Approval dispatches funds; rejection refunds the reserved hold."
        }
      />
      <div className="ca-sections">
        {message && <Notice tone="success">{message}</Notice>}
        <Panel
          title={`${kind} requests`}
          description={
            isLive
              ? `Live verified records. Decisions atomically update balances, record immutable ledger entries, and notify customers.`
              : `Preview mode. Decisions update local state only.`
          }
        >
          <div className="admin-filter">
            <Choice
              label="Request status"
              value={filter}
              onChange={setFilter}
              options={["Pending review", "Approved", "Declined", "all"].map(
                (value) => ({
                  value,
                  label: value === "all" ? "All requests" : value,
                }),
              )}
            />
          </div>
          <Records
            title={`${kind} requests`}
            headers={[
              "Request",
              "Customer",
              "Amount",
              kind === "Deposit" ? "Network / Proof" : "Destination",
              "Review status",
              "Action",
            ]}
            rows={
              isLive
                ? (rows as AdminFinancialItem[]).map((r) => {
                    const displayStatus =
                      r.status === "PENDING"
                        ? "Pending review"
                        : r.status === "APPROVED"
                          ? "Approved"
                          : "Declined";

                    return {
                      id: r.id,
                      cells: [
                        <div key="id">
                          <span className="font-mono text-xs">{r.id.slice(0, 8)}</span>
                          <p className="ca-help text-xs">{new Date(r.createdAt).toLocaleDateString()}</p>
                        </div>,
                        <div key="user">
                          <p className="font-medium text-sm">{r.userName}</p>
                          <p className="ca-help text-xs">{r.userEmail}</p>
                        </div>,
                        <span key="amount" className="admin-number">
                          <CoinIdentity currency={r.currency}>
                            {r.amount} {r.currency}
                          </CoinIdentity>
                        </span>,
                        <div key="info" className="text-xs max-w-xs truncate">
                          {kind === "Deposit" ? (
                            r.txHash ? (
                              <span title={r.txHash}>Tx: {r.txHash.slice(0, 16)}...</span>
                            ) : (
                              <span>{r.notes || "No hash supplied"}</span>
                            )
                          ) : (
                            <span title={r.destinationAddress || ""}>
                              {r.destinationAddress ? `${r.destinationAddress.slice(0, 16)}...` : "External wallet"}
                            </span>
                          )}
                        </div>,
                        <div key="status">
                          <Status>{displayStatus}</Status>
                          {r.status === "PENDING" && (
                            <p className="ca-help text-xs mt-1">Awaiting review</p>
                          )}
                        </div>,
                        <Button
                          key="review"
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setSelectedId(r.id);
                            setReason("");
                            setError("");
                            setDecision("Approved");
                            setVerifiedAmount(r.amount);
                          }}
                        >
                          {r.status === "PENDING" ? "Review request" : "View details"}
                        </Button>,
                      ],
                    };
                  })
                : (rows as Request[]).map((r) => ({
                    id: r.id,
                    cells: [
                      <div key="id">
                        {r.id}
                        <p className="ca-help">{r.date}</p>
                      </div>,
                      <AdminLink key="user" to={`users/${r.userId}`}>
                        {state!.users.find((u) => u.id === r.userId)?.name ??
                          r.userId}
                      </AdminLink>,
                      <span key="amount" className="admin-number">
                        <CoinIdentity currency={r.currency}>
                          {r.amount} {r.currency}
                        </CoinIdentity>
                      </span>,
                      r.network,
                      <div key="status">
                        <Status>{r.status}</Status>
                        <p className="ca-help mt-2">Settlement not confirmed</p>
                      </div>,
                      <Button
                        key="review"
                        variant="outline"
                        onClick={() => {
                          setSelectedId(r.id);
                          setReason("");
                          setError("");
                          setDecision("Approved");
                          setVerifiedAmount(r.amount);
                        }}
                      >
                        {r.status === "Pending review"
                          ? "Review request"
                          : "View decision"}
                      </Button>,
                    ],
                  }))
            }
          />
        </Panel>
      </div>

      <ConfirmDialog
        open={Boolean(selectedId)}
        onOpenChange={(open) => {
          if (!open) setSelectedId(null);
        }}
        title={`${kind} Request ${selectedId?.slice(0, 8) ?? ""}`}
        description={
          isLive
            ? `Review the financial details below. Decisions atomically mutate ledger accounts and user balances.`
            : `This workflow is in preview mode.`
        }
        details={
          isLive && liveSelected
            ? [
                { label: "Customer", value: `${liveSelected.userName} (${liveSelected.userEmail})` },
                { label: "Requested amount", value: `${liveSelected.amount} ${liveSelected.currency}` },
                {
                  label: "Available balance",
                  value: `${liveSelected.walletAvailable || "0"} ${liveSelected.currency} (Reserved: ${liveSelected.walletReserved || "0"})`,
                },
                ...(kind === "Deposit"
                  ? [
                      { label: "Transaction hash", value: liveSelected.txHash || "Not provided" },
                      { label: "Proof file", value: liveSelected.paymentProof || "No file attached" },
                    ]
                  : [
                      { label: "Destination", value: liveSelected.destinationAddress || "External address" },
                      { label: "Network fee", value: `${liveSelected.fee} ${liveSelected.currency}` },
                    ]),
                {
                  label: "Current status",
                  value: liveSelected.status === "PENDING" ? "Pending review" : liveSelected.status,
                },
              ]
            : previewSelected
              ? [
                  {
                    label: "Customer",
                    value: `${state!.users.find((u) => u.id === previewSelected.userId)?.name} · ${previewSelected.userId}`,
                  },
                  {
                    label: "Amount",
                    value: `${previewSelected.amount} ${previewSelected.currency}`,
                  },
                  {
                    label: "Method / network",
                    value: `${previewSelected.method} / ${previewSelected.network}`,
                  },
                  { label: "Destination", value: previewSelected.destination },
                  { label: "Current decision", value: previewSelected.status },
                ]
              : []
        }
        confirmLabel={isSubmitting ? "Processing..." : decision === "Approved" ? `Approve ${kind}` : `Decline ${kind}`}
        confirmDisabled={
          isSubmitting ||
          (isLive
            ? liveSelected?.status !== "PENDING"
            : previewSelected?.status !== "Pending review") ||
          fault === "denied"
        }
        onConfirm={submit}
        destructive={decision === "Declined"}
      >
        {(isLive ? liveSelected?.status === "PENDING" : previewSelected?.status === "Pending review") ? (
          <>
            <Choice
              label="Decision"
              value={decision}
              onChange={(v) => setDecision(v as "Approved" | "Declined")}
              options={[
                { value: "Approved", label: kind === "Deposit" ? "Verify & credit wallet" : "Approve & dispatch payout" },
                { value: "Declined", label: kind === "Deposit" ? "Decline deposit" : "Decline & release reserved hold" },
              ]}
            />
            {kind === "Deposit" && decision === "Approved" && (
              <Field
                label="Verified credited amount"
                required
                value={verifiedAmount}
                onChange={(e) => setVerifiedAmount(e.target.value)}
              />
            )}
            <Field
              label="Review reason / notes"
              required={decision === "Declined"}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
            />
          </>
        ) : (
          <p className="ca-body">
            Notes: {isLive ? liveSelected?.notes || "No notes recorded" : previewSelected?.reason}
          </p>
        )}
        {fault === "denied" && (
          <p className="ca-help">Your preview role cannot approve requests.</p>
        )}
        {error && <Notice error>{error}</Notice>}
      </ConfirmDialog>
    </>
  );
}

export function VerificationQueue() {
  const { state, commit, fault } = useAdmin();
  const [items, setItems] = useState<AdminKycItem[]>([]);
  const [selectedId, setSelectedId] = useState("");
  const [decision, setDecision] = useState<"Approved" | "Declined">("Approved");
  const [reason, setReason] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [frontUrl, setFrontUrl] = useState<string | null>(null);
  const [backUrl, setBackUrl] = useState<string | null>(null);
  const [loadingDoc, setLoadingDoc] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    async function loadQueue() {
      try {
        const res = await getAdminVerificationQueueAction();
        if (res.success && res.items) {
          setItems(res.items);
        }
      } catch (err) {
        console.warn("[admin] Error loading verification queue:", err);
      }
    }
    loadQueue();
  }, []);

  const selectedItem = items.find((i) => i.id === selectedId);
  const fallbackUser = state!.users.find((u) => u.id === selectedId);

  async function openReview(id: string) {
    setSelectedId(id);
    setError("");
    setReason("");
    setFrontUrl(null);
    setBackUrl(null);

    const doc = items.find((i) => i.id === id);
    if (doc) {
      setLoadingDoc(true);
      try {
        if (doc.hasFront) {
          const frontRes = await getKycDocumentSignedUrlAction(doc.id, "front");
          if (frontRes.success) setFrontUrl(frontRes.url);
        }
        if (doc.hasBack) {
          const backRes = await getKycDocumentSignedUrlAction(doc.id, "back");
          if (backRes.success) setBackUrl(backRes.url);
        }
      } catch (err) {
        console.warn("[admin] Error fetching signed URLs:", err);
      } finally {
        setLoadingDoc(false);
      }
    }
  }

  const rows = items.length > 0
    ? items.map((item) => ({
        id: item.id,
        cells: [
          <div key="customer">
            <p className="font-medium text-foreground">{item.userName}</p>
            <p className="ca-help">{item.userEmail}</p>
          </div>,
          <Status key="status">{item.status}</Status>,
          <span key="doc" className="ca-help">
            {item.documentType} ({item.hasFront ? "Front" : ""}{item.hasBack ? " + Back" : ""})
          </span>,
          <Button
            key="review"
            variant="outline"
            disabled={fault === "denied"}
            onClick={() => openReview(item.id)}
          >
            Review submission
          </Button>,
        ],
      }))
    : state!.users.map((u) => ({
        id: u.id,
        cells: [
          u.name,
          <Status key="status">{u.verification}</Status>,
          "Preview document mock",
          <Button
            key="review"
            variant="outline"
            disabled={fault === "denied"}
            onClick={() => openReview(u.id)}
          >
            Review submission
          </Button>,
        ],
      }));

  return (
    <>
      <PageHeading
        title="Verification"
        subtitle="Review identity submissions with secure 15-minute temporary signed URLs without exposing private documents in public assets."
      />
      <div className="ca-sections">
        {message && <Notice tone="success">{message}</Notice>}
        <Panel title="Identity review queue">
          <Records
            title="Identity submissions"
            headers={["Customer", "Status", "Document access", "Review"]}
            rows={rows}
          />
        </Panel>
      </div>
      <ConfirmDialog
        open={Boolean(selectedId)}
        onOpenChange={(open) => {
          if (!open) {
            setSelectedId("");
            setFrontUrl(null);
            setBackUrl(null);
          }
        }}
        title={`Review ${selectedItem?.userName ?? fallbackUser?.name ?? "identity"}`}
        description="Verify document authenticity before approving. Approving removes account withdrawal and copy-trade restrictions."
        confirmLabel={decision === "Approved" ? "Approve Verification" : "Decline Verification"}
        confirmDisabled={fault === "denied" || isSubmitting}
        busy={isSubmitting}
        onConfirm={async () => {
          try {
            if (reason.trim().length < 8) {
              throw new Error("Give a review justification of at least 8 characters.");
            }
            setIsSubmitting(true);
            if (selectedItem) {
              const res = await reviewKycAction(selectedItem.id, decision, reason);
              if (!res.success) {
                setError(res.error || "Review failed.");
                setIsSubmitting(false);
                return;
              }
              setItems((current) =>
                current.map((item) =>
                  item.id === selectedItem.id
                    ? { ...item, status: decision === "Approved" ? "APPROVED" : "DECLINED" }
                    : item,
                ),
              );
            }
            commit((current) => {
              const userInState = current.users.find(
                (u) => u.id === (selectedItem?.userId ?? selectedId),
              );
              if (userInState) {
                userInState.verification = decision as "Approved" | "Declined";
              }
              record(
                current,
                `Identity ${decision.toLowerCase()}`,
                selectedItem?.userId ?? selectedId,
                reason,
                new Date().toISOString(),
              );
              return current;
            });
            setSelectedId("");
            setMessage(`Identity review recorded: marked ${decision.toLowerCase()} and notification dispatched.`);
          } catch (e) {
            setError(e instanceof Error ? e.message : "Review failed.");
          } finally {
            setIsSubmitting(false);
          }
        }}
      >
        <div className="space-y-4 my-2">
          {loadingDoc && <p className="ca-help">Generating signed preview URLs...</p>}
          <div className="grid gap-3 sm:grid-cols-2">
            {frontUrl && (
              <div className="space-y-1 rounded-lg border border-border p-2">
                <p className="text-xs font-medium text-muted-foreground">Front of document</p>
                <a href={frontUrl} target="_blank" rel="noopener noreferrer" className="block overflow-hidden rounded">
                  <img src={frontUrl} alt="Front of document" className="max-h-48 w-full object-contain rounded bg-muted/40" />
                </a>
              </div>
            )}
            {backUrl && (
              <div className="space-y-1 rounded-lg border border-border p-2">
                <p className="text-xs font-medium text-muted-foreground">Back of document</p>
                <a href={backUrl} target="_blank" rel="noopener noreferrer" className="block overflow-hidden rounded">
                  <img src={backUrl} alt="Back of document" className="max-h-48 w-full object-contain rounded bg-muted/40" />
                </a>
              </div>
            )}
          </div>
          <Choice
            label="Decision"
            value={decision}
            onChange={(v) => setDecision(v as "Approved" | "Declined")}
            options={[
              { value: "Approved", label: "Approve identity" },
              { value: "Declined", label: "Decline (requires resubmission)" },
            ]}
          />
          <Field
            label="Review reason"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            required
            hint="Recorded in audit trail and displayed in customer notification if declined."
          />
          {error && <Notice error>{error}</Notice>}
        </div>
      </ConfirmDialog>
    </>
  );
}
export function Notifications() {
  const { state, commit, fault } = useAdmin();
  const [userId, setUserId] = useState("");
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [review, setReview] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  return (
    <>
      <PageHeading
        title="Notifications"
        subtitle="Compose an account message for one customer at a time."
      />
      <div className="ca-sections">
        {message && <Notice tone="success">{message}</Notice>}
        <Panel
          title="Compose notification"
          description="Preview only. No email, push notification or real account message will be sent."
        >
          <form
            className="space-y-6"
            onSubmit={(e) => {
              e.preventDefault();
              setError("");
              if (!userId || !title.trim() || !body.trim()) {
                setError("Choose a recipient and enter a title and message.");
                return;
              }
              setReview(true);
            }}
          >
            <Choice
              label="Recipient"
              value={userId}
              onChange={setUserId}
              options={state!.users.map((u) => ({
                value: u.id,
                label: `${u.name} · ${u.id}`,
              }))}
            />
            <Field
              label="Title"
              required
              maxLength={120}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
            <Field
              label="Message"
              required
              multiline
              value={body}
              onChange={(e) => setBody(e.target.value)}
            />
            {error && <Notice error>{error}</Notice>}
            <Button type="submit" disabled={fault === "denied"}>
              Review notification
            </Button>
          </form>
        </Panel>
        <Panel title="Preview message history">
          <Records
            title="Preview notifications"
            headers={["Recipient", "Title", "Message"]}
            rows={state!.notifications.map((n) => ({
              id: n.id,
              cells: [
                state!.users.find((u) => u.id === n.userId)?.name ?? n.userId,
                n.title,
                n.message,
              ],
            }))}
          />
        </Panel>
      </div>
      <ConfirmDialog
        open={review}
        onOpenChange={setReview}
        title="Record this preview notification?"
        description="The message will appear in this preview history only. Nothing is sent externally."
        details={[
          {
            label: "Recipient",
            value: state!.users.find((u) => u.id === userId)?.name,
          },
          { label: "Title", value: title },
          { label: "Message", value: body },
        ]}
        confirmLabel="Record in preview"
        onConfirm={() => {
          try {
            commit((current) => {
              current.notifications.unshift({
                id: crypto.randomUUID(),
                userId,
                title,
                message: body,
              });
              record(
                current,
                "Notification recorded",
                userId,
                title,
                new Date().toISOString(),
              );
              return current;
            });
            setReview(false);
            setMessage("Notification recorded in preview only.");
            setTitle("");
            setBody("");
          } catch (e) {
            setError(
              e instanceof Error ? e.message : "Message could not be recorded.",
            );
          }
        }}
      >
        {error && <Notice error>{error}</Notice>}
      </ConfirmDialog>
    </>
  );
}
export function Signals() {
  const { state, commit, fault } = useAdmin();
  const [id, setId] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [isToggling, setIsToggling] = useState(false);
  const selected = state!.signals.find((s) => s.id === id);
  return (
    <>
      <PageHeading
        title="Trading signals"
        subtitle="Create institutional research signals and manage client visibility. Publishing provides actionable analysis to entitled funded accounts."
      />
      <div className="ca-sections">
        {message && <Notice tone="success">{message}</Notice>}
        <SignalCreate onCreated={setMessage} />
        <Panel title="Signal directory & visibility">
          <Records
            title="Trading signals"
            headers={["Signal", "Asset", "Status", "Control"]}
            rows={state!.signals.map((s) => {
              const displayStatus = s.enabled
                ? s.status === "Expired"
                  ? "Expired (Visible)"
                  : "Published Live"
                : "Hidden Draft";
              return {
                id: s.id,
                cells: [
                  <div key="signal" className="max-w-md space-y-2 break-words">
                    <p className="font-medium text-foreground">{s.title}</p>
                    <p className="ca-help">
                      {s.direction} · {s.timeframe} {s.expiresAt ? `· Expires ${new Date(s.expiresAt).toLocaleString()}` : ""}
                    </p>
                    <p className="ca-help">{s.analysis}</p>
                  </div>,
                  <CoinIdentity key="asset" currency={s.asset} />,
                  <Status key="status">{displayStatus}</Status>,
                  <Button
                    key="toggle"
                    variant="outline"
                    disabled={fault === "denied" || isToggling}
                    onClick={() => {
                      setId(s.id);
                      setError("");
                    }}
                  >
                    {s.enabled ? "Hide signal" : "Publish live"}
                  </Button>,
                ],
              };
            })}
          />
        </Panel>
      </div>
      <ConfirmDialog
        open={!!selected}
        onOpenChange={(open) => {
          if (!open) {
            setId("");
            setError("");
          }
        }}
        title={`${selected?.enabled ? "Hide" : "Publish"} this signal?`}
        description={
          selected?.enabled
            ? "Hiding this signal immediately removes it from customer feeds. Drafts remain in administrative storage."
            : "Publishing this signal makes it immediately visible to all clients who have a funded balance or active trade allocation."
        }
        details={[
          { label: "Signal", value: selected?.title },
          { label: "Asset & Direction", value: `${selected?.asset} (${selected?.direction})` },
          { label: "Timeframe", value: selected?.timeframe },
        ]}
        busy={isToggling}
        confirmLabel={selected?.enabled ? "Hide signal" : "Publish live"}
        onConfirm={async () => {
          try {
            setIsToggling(true);
            const res = await toggleSignalVisibilityAction(id, selected?.version);
            if (!res.success) {
              setError(res.error || "Could not update signal visibility.");
              setIsToggling(false);
              return;
            }
            const updated = res.signal!;
            commit((current) => {
              const idx = current.signals.findIndex((s) => s.id === id);
              if (idx >= 0) {
                current.signals[idx] = updated;
              }
              record(
                current,
                `Signal ${updated.enabled ? "published" : "hidden"}`,
                id,
                `Visibility toggled in database to ${updated.enabled ? "Published" : "Draft"}.`,
                new Date().toISOString(),
              );
              return current;
            });
            setId("");
            setMessage(
              `Signal ${updated.enabled ? "published live and visible to entitled clients" : "hidden from customer discovery"}.`,
            );
          } catch (e) {
            setError(
              e instanceof Error ? e.message : "Could not change visibility.",
            );
          } finally {
            setIsToggling(false);
          }
        }}
      >
        {error && <Notice error>{error}</Notice>}
      </ConfirmDialog>
    </>
  );
}
export function DepositWallets() {
  const { state, commit, fault } = useAdmin();
  const [id, setId] = useState(state!.addresses[0]?.id ?? "");
  const [address, setAddress] = useState("");
  const [memo, setMemo] = useState("");
  const [review, setReview] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const selected = state!.addresses.find((a) => a.id === id);
  return (
    <>
      <PageHeading
        title="Deposit wallets"
        subtitle="Configure the destination for each supported asset and network."
      />
      <div className="ca-sections">
        {message && <Notice tone="success">{message}</Notice>}
        <Panel
          title="Network configuration"
          description="Use test strings only. Production address verification and customer synchronization are not connected."
        >
          <form
            className="space-y-6"
            onSubmit={(e) => {
              e.preventDefault();
              setError("");
              if (!selected || !address.trim()) {
                setError("Choose a network and enter a test address.");
                return;
              }
              setReview(true);
            }}
          >
            <Choice
              label="Asset and network"
              value={id}
              onChange={(v) => {
                setId(v);
                setAddress("");
                setMemo("");
              }}
              options={state!.addresses.map((a) => ({
                value: a.id,
                label: `${a.currency} · ${a.network}`,
              }))}
            />
            <Field
              label="Preview address"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              required
              maxLength={200}
            />
            <Field
              label="Tag / memo, if required"
              value={memo}
              onChange={(e) => setMemo(e.target.value)}
              maxLength={100}
            />
            {error && <Notice error>{error}</Notice>}
            <Button type="submit" disabled={fault === "denied"}>
              Review configuration
            </Button>
          </form>
        </Panel>
        <Panel title="Configured networks">
          <Records
            title="Deposit networks"
            headers={["Asset", "Network", "State"]}
            rows={state!.addresses.map((a) => ({
              id: a.id,
              cells: [
                a.currency,
                a.network,
                a.address
                  ? "Preview draft saved · not enabled"
                  : "Not configured",
              ],
            }))}
          />
        </Panel>
      </div>
      <ConfirmDialog
        open={review}
        onOpenChange={setReview}
        title="Save preview address draft?"
        description="This draft will not be enabled for deposits. No chain validation or live address replacement occurs."
        details={[
          {
            label: "Asset / network",
            value: `${selected?.currency} / ${selected?.network}`,
          },
          {
            label: "Full address",
            value: <span className="break-all">{address}</span>,
          },
          { label: "Tag / memo", value: memo || "None" },
        ]}
        confirmLabel="Save preview draft"
        onConfirm={() => {
          try {
            commit((current) => {
              const a = current.addresses.find((a) => a.id === id)!;
              a.address = address;
              a.memo = memo;
              a.enabled = false;
              record(
                current,
                "Deposit address draft",
                id,
                "Preview draft only; not enabled",
                new Date().toISOString(),
              );
              return current;
            });
            setReview(false);
            setMessage(
              "Address draft saved in preview. Deposits remain disabled.",
            );
            setAddress("");
            setMemo("");
          } catch (e) {
            setError(
              e instanceof Error ? e.message : "Draft could not be saved.",
            );
          }
        }}
      >
        {error && <Notice error>{error}</Notice>}
      </ConfirmDialog>
    </>
  );
}
export function AuditHistory() {
  const { state } = useAdmin();
  const [search, setSearch] = useState("");
  const rows = state!.audit.filter((a) =>
    `${a.action} ${a.target} ${a.reason}`
      .toLowerCase()
      .includes(search.toLowerCase()),
  );
  return (
    <>
      <PageHeading
        title="Audit history"
        subtitle="Review who changed what. Financial corrections remain in the history."
      />
      <Panel
        title="Admin activity"
        description="This is an in-memory preview history, not a production audit ledger."
      >
        <div className="admin-filter">
          <Field
            label="Search activity"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Action, target or reason"
          />
        </div>
        <Records
          title="Admin audit history"
          headers={[
            "Time (UTC)",
            "Operator",
            "Action",
            "Target",
            "Reason",
            "Balance change",
          ]}
          rows={rows.map((a) => ({
            id: a.id,
            cells: [
              a.at.replace("T", " ").slice(0, 19),
              a.actor,
              a.action,
              a.target,
              a.reason,
              a.before
                ? `${a.before} → ${a.after} ${a.currency}`
                : "No balance change",
            ],
          }))}
        />
      </Panel>
    </>
  );
}
