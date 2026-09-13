"use client";
import { CoinIdentity } from "@/components/dashboard/coin-identity";
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Panel, KeyValueList } from "@/components/dashboard/panel";
import { PageHeading } from "@/components/dashboard/page-heading";
import { ConfirmDialog } from "@/components/dashboard/confirm-dialog";
import { Choice } from "@/components/dashboard/views/shared";
import {
  adjustWallet,
  positiveAmount,
  record,
  type Adjustment,
  type Wallet,
} from "@/lib/admin/model";
import { add, subtract, compare } from "@/lib/dashboard/money";
import { useAdmin } from "./provider";
import { AdminLink, Field, Notice, Status, Records, Missing } from "./shared";

export function UserList() {
  const { state } = useAdmin();
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("all");
  const users = state!.users.filter(
    (u) =>
      `${u.name} ${u.email} ${u.id}`
        .toLowerCase()
        .includes(search.toLowerCase()) &&
      (status === "all" || u.status === status),
  );
  return (
    <>
      <PageHeading
        title="Users & wallets"
        subtitle="Review individual accounts, balances and recorded adjustments."
      />
      <Panel title="Customer accounts">
        <div className="admin-filter">
          <Field
            label="Search accounts"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Name, email or user ID"
          />
          <Choice
            label="Account status"
            value={status}
            onChange={setStatus}
            options={["all", "Active", "Suspended"].map((value) => ({
              value,
              label: value === "all" ? "All accounts" : value,
            }))}
          />
        </div>
        <Records
          title="Customer accounts"
          headers={["Customer", "Account", "Verification", "Joined", "Details"]}
          rows={users.map((u) => ({
            id: u.id,
            cells: [
              <div key="name">
                <p className="font-medium">{u.name}</p>
                <p className="ca-help">{u.email}</p>
              </div>,
              <Status key="status">{u.status}</Status>,
              u.verification,
              u.joined,
              <AdminLink key="link" to={`users/${u.id}`}>
                View wallets
              </AdminLink>,
            ],
          }))}
        />
      </Panel>
    </>
  );
}
export function UserDetail({ id }: { id: string }) {
  const { state, commit, fault } = useAdmin();
  const user = state!.users.find((u) => u.id === id);
  const [selected, setSelected] = useState<{
    wallet: Wallet;
    direction: "add" | "remove";
  } | null>(null);
  const [suspend, setSuspend] = useState(false);
  const [reason, setReason] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  if (!user) return <Missing entity="User" />;
  const wallets = state!.wallets.filter((w) => w.userId === id);
  function statusChange() {
    try {
      if (reason.trim().length < 8)
        throw new Error("Explain the change in at least 8 characters.");
      commit((current) => {
        const target = current.users.find((u) => u.id === id)!;
        target.status = target.status === "Active" ? "Suspended" : "Active";
        record(
          current,
          `Account ${target.status.toLowerCase()}`,
          id,
          reason,
          new Date().toISOString(),
        );
        return current;
      });
      setSuspend(false);
      setReason("");
      setMessage("Account status updated in this preview only.");
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "Could not update the account.",
      );
    }
  }
  const audit = state!.audit.filter((a) => a.target.startsWith(id));
  return (
    <>
      <PageHeading
        title={user.name}
        subtitle={`${user.id} · ${user.email}`}
        actions={<AdminLink to="users">Back to users</AdminLink>}
      />
      <div className="ca-sections">
        {message && <Notice tone="success">{message}</Notice>}
        <Panel
          title="Account summary"
          action={
            <Button
              variant={user.status === "Active" ? "destructive" : "outline"}
              disabled={fault === "denied"}
              onClick={() => {
                setError("");
                setSuspend(true);
              }}
            >
              {user.status === "Active" ? "Suspend account" : "Restore account"}
            </Button>
          }
        >
          <KeyValueList
            className="admin-form-grid"
            items={[
              {
                label: "Account status",
                value: <Status>{user.status}</Status>,
              },
              { label: "Identity verification", value: user.verification },
              { label: "Joined", value: user.joined },
              { label: "Financial access", value: "Preview simulation only" },
            ]}
          />
        </Panel>
        <Panel
          title="Currency wallets"
          description="Available and reserved funds are separate. Adjustments do not move funds on-chain."
        >
          {(fault === "denied" || user.status === "Suspended") && (
            <p className="ca-help mb-4">
              Adjustments are disabled for a read-only role or a suspended
              account.
            </p>
          )}
          <div className="admin-desktop-records">
            <Records
              title="User wallets"
              headers={[
                "Asset",
                "Available",
                "Reserved",
                "Recorded profit",
                "Adjustment",
              ]}
              rows={wallets.map((w) => ({
                id: w.id,
                cells: [
                  <CoinIdentity key="currency" currency={w.currency} />,
                  <span className="admin-number" key="balance">
                    {w.available}
                  </span>,
                  w.reserved,
                  w.profit,
                  <div className="admin-actions" key="actions">
                    <Button
                      variant="outline"
                      disabled={fault === "denied" || user.status !== "Active"}
                      onClick={() =>
                        setSelected({ wallet: w, direction: "add" })
                      }
                    >
                      Add profit
                    </Button>
                    <Button
                      variant="outline"
                      disabled={fault === "denied" || user.status !== "Active"}
                      onClick={() =>
                        setSelected({ wallet: w, direction: "remove" })
                      }
                    >
                      Remove profit
                    </Button>
                  </div>,
                ],
              }))}
            />
          </div>
          <div className="admin-mobile-records">
            {wallets.map((w) => (
              <section key={w.id} className="border-b pb-4 space-y-4">
                <h3 className="ca-h3">
                  <CoinIdentity currency={w.currency} />
                </h3>
                <KeyValueList
                  items={[
                    { label: "Available", value: w.available },
                    { label: "Reserved", value: w.reserved },
                    { label: "Recorded profit", value: w.profit },
                  ]}
                />
                <div className="admin-actions">
                  <Button
                    variant="outline"
                    disabled={fault === "denied" || user.status !== "Active"}
                    onClick={() => setSelected({ wallet: w, direction: "add" })}
                  >
                    Add profit
                  </Button>
                  <Button
                    variant="outline"
                    disabled={fault === "denied" || user.status !== "Active"}
                    onClick={() =>
                      setSelected({ wallet: w, direction: "remove" })
                    }
                  >
                    Remove profit
                  </Button>
                </div>
              </section>
            ))}
          </div>
        </Panel>
        {selected && (
          <AdjustmentForm
            key={`${selected.wallet.id}-${selected.direction}`}
            walletId={selected.wallet.id}
            userId={id}
            name={user.name}
            direction={selected.direction}
            onClose={() => {
              setSelected(null);
              document.getElementById("main-content")?.focus();
            }}
          />
        )}
        <Panel title="Account audit history">
          <Records
            title="Account audit history"
            headers={[
              "Time (UTC)",
              "Action",
              "Wallet",
              "Before → after",
              "Reason",
            ]}
            rows={audit.map((a) => ({
              id: a.id,
              cells: [
                a.at.replace("T", " ").slice(0, 19),
                a.action,
                a.currency || "Account",
                a.before ? `${a.before} → ${a.after}` : "Not a balance change",
                a.reason,
              ],
            }))}
            empty="No account changes recorded in this preview."
          />
        </Panel>
      </div>
      <ConfirmDialog
        open={suspend}
        onOpenChange={setSuspend}
        title={`${user.status === "Active" ? "Suspend" : "Restore"} this account?`}
        description="This is a preview-only status change. It does not revoke real sessions or change real account access."
        details={[{ label: "User", value: `${user.name} · ${id}` }]}
        destructive={user.status === "Active"}
        confirmLabel="Confirm in preview"
        onConfirm={statusChange}
      >
        <Field
          label="Reason"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          required
          error={error || undefined}
        />
        {error && <Notice error>{error}</Notice>}
      </ConfirmDialog>
    </>
  );
}
function AdjustmentForm({
  walletId,
  userId,
  name,
  direction,
  onClose,
}: {
  walletId: string;
  userId: string;
  name: string;
  direction: "add" | "remove";
  onClose: () => void;
}) {
  const { state, commit, fault } = useAdmin();
  const wallet = state!.wallets.find((w) => w.id === walletId)!;
  const credits = state!.credits.filter(
    (c) => c.walletId === walletId && compare(c.remaining, "0") > 0,
  );
  const [amount, setAmount] = useState("");
  const [reason, setReason] = useState("");
  const [creditId, setCreditId] = useState("");
  const [review, setReview] = useState<Adjustment | null>(null);
  const [error, setError] = useState("");
  const [done, setDone] = useState("");
  const adjustmentForm = useRef<HTMLFormElement>(null);
  useEffect(() => {
    adjustmentForm.current?.querySelector<HTMLInputElement>("input")?.focus();
  }, []);
  function prepare() {
    setError("");
    setDone("");
    try {
      positiveAmount(amount, wallet.currency);
      const request: Adjustment = {
        key: crypto.randomUUID(),
        walletId,
        userId,
        amount,
        reason,
        direction,
        creditId,
        version: wallet.version,
      };
      adjustWallet(state!, request, new Date().toISOString());
      setReview(request);
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "Check the adjustment details.",
      );
    }
  }
  function submit() {
    if (!review) return;
    try {
      commit((current) =>
        adjustWallet(current, review, new Date().toISOString()),
      );
      setReview(null);
      setDone(
        "Adjustment recorded in the preview wallet and audit history. No real account was changed.",
      );
      setAmount("");
      setReason("");
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "Adjustment could not be recorded.",
      );
    }
  }
  const after = review
    ? direction === "add"
      ? add(wallet.available, review.amount)
      : subtract(wallet.available, review.amount)
    : "";
  return (
    <Panel
      title={`${direction === "add" ? "Add" : "Remove"} profit · ${wallet.currency}`}
      description={`${name} · ${userId}`}
      action={
        <Button variant="ghost" onClick={onClose}>
          Close adjustment
        </Button>
      }
    >
      <form
        ref={adjustmentForm}
        className="space-y-6"
        onSubmit={(e) => {
          e.preventDefault();
          prepare();
        }}
      >
        <div className="admin-form-grid">
          <Field
            label={`Amount (${wallet.currency})`}
            inputMode="decimal"
            maxLength={24}
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            required
            hint="Enter a positive amount. The action determines its direction."
          />
          <Field
            label="Reason and reference"
            maxLength={1000}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            required
            hint="Explain the correction or the source of this profit."
          />
          {direction === "remove" && (
            <Choice
              label="Original profit credit"
              value={creditId}
              onChange={setCreditId}
              options={credits.map((c) => ({
                value: c.id,
                label: `${c.id} · ${c.remaining} ${wallet.currency} remaining`,
              }))}
            />
          )}
        </div>
        {direction === "remove" && !credits.length && (
          <Notice>
            No unreversed profit credits are available for this wallet.
          </Notice>
        )}
        <p className="ca-help">
          Available: {wallet.available} {wallet.currency}. Reserved:{" "}
          {wallet.reserved} {wallet.currency}. Reserved funds cannot be
          adjusted.
        </p>
        {error && <Notice error>{error}</Notice>}
        {done && <Notice tone="success">{done}</Notice>}
        <Button
          type="submit"
          disabled={
            fault === "denied" || (direction === "remove" && !credits.length)
          }
        >
          Review adjustment
        </Button>
      </form>
      <ConfirmDialog
        open={review !== null}
        onOpenChange={(open) => {
          if (!open) {
            setReview(null);
            setError("");
          }
        }}
        title="Confirm wallet adjustment"
        description="This records a manual adjustment in the isolated preview. It is not an executed trade or an on-chain transfer."
        details={[
          { label: "User", value: `${name} · ${userId}` },
          { label: "Wallet", value: wallet.currency },
          {
            label: "Change",
            value: `${direction === "add" ? "+" : "−"}${review?.amount ?? ""} ${wallet.currency}`,
          },
          {
            label: "Available before",
            value: `${wallet.available} ${wallet.currency}`,
          },
          { label: "Available after", value: `${after} ${wallet.currency}` },
          { label: "Reason", value: review?.reason },
          ...(direction === "remove"
            ? [{ label: "Original credit", value: review?.creditId }]
            : []),
        ]}
        confirmLabel="Record in preview"
        destructive={direction === "remove"}
        onConfirm={submit}
      >
        {error && <Notice error>{error}</Notice>}
      </ConfirmDialog>
    </Panel>
  );
}
