"use client";

import { WarningIcon } from "@phosphor-icons/react";
import { useState } from "react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Pagination } from "@/components/ui/pagination";
import { Progress } from "@/components/ui/progress";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Spinner } from "@/components/ui/spinner";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";

import { Amount } from "../amount";
import { ConfirmDialog } from "../confirm-dialog";
import { CopyButton } from "../copy-button";
import { DetailSheet } from "../detail-sheet";
import { EmptyState, ErrorState, NotFoundState, RegionSkeleton, UnavailableState } from "../data-state";
import { PageHeading } from "../page-heading";
import { KeyValueList, Panel, PanelRow, PanelRows } from "../panel";
import { QrCode } from "../qr";
import { StatusBadge } from "../status-badge";
import { useStatusAnnouncer } from "../status-announcer";

const FIXTURE_QR_PAYLOAD = "FIXTURE-DEPOSIT-ADDRESS-NOT-A-REAL-DESTINATION-0000";

/**
 * Component reference for the design review: every type role, control
 * density, amount state, status badge, data state and overlay the dashboard
 * uses, in the current theme. Switch theme and scenario from the toolbar.
 */
export function ComponentReference() {
  return (
    <>
      <PageHeading
        title="Component reference"
        subtitle="Shell primitives and type roles as page builders use them. Fixture values only."
      />
      <div className="ca-sections">
        <TypeRoles />
        <Controls />
        <Amounts />
        <Statuses />
        <DataStates />
        <Alerts />
        <Overlays />
        <PaginationSample />
        <Progressive />
        <QrAndCopy />
        <PanelSamples />
      </div>
    </>
  );
}

function TypeRoles() {
  return (
    <Panel title="Type roles" description="Classes from dashboard.css. Headings use Space Grotesk; everything else inherits Geist Mono.">
      <PanelRows>
        <PanelRow trailing={<code className="ca-id">.ca-h1</code>}>
          <span className="ca-h1">Withdraw</span>
        </PanelRow>
        <PanelRow trailing={<code className="ca-id">.ca-value-main</code>}>
          <span className="ca-value-main">12,250.00 USD</span>
        </PanelRow>
        <PanelRow trailing={<code className="ca-id">.ca-metric</code>}>
          <span className="ca-metric">0.10000000 BTC</span>
        </PanelRow>
        <PanelRow trailing={<code className="ca-id">.ca-h2</code>}>
          <span className="ca-h2">Recent activity</span>
        </PanelRow>
        <PanelRow trailing={<code className="ca-id">.ca-h3</code>}>
          <span className="ca-h3">Confirm withdrawal</span>
        </PanelRow>
        <PanelRow trailing={<code className="ca-id">.ca-body</code>}>
          <span className="ca-body">Deposits and withdrawals are cash flows, not income.</span>
        </PanelRow>
        <PanelRow trailing={<code className="ca-id">.ca-label</code>}>
          <span className="ca-label">Destination address</span>
        </PanelRow>
        <PanelRow trailing={<code className="ca-id">.ca-help</code>}>
          <span className="ca-help">Quotes as of 6 Sep 2026, 12:00 UTC</span>
        </PanelRow>
        <PanelRow trailing={<code className="ca-id">.ca-id</code>}>
          <span className="ca-id">WDR-2026-0001 · 2026-09-06T12:00:00Z</span>
        </PanelRow>
      </PanelRows>
    </Panel>
  );
}

function Controls() {
  const [method, setMethod] = useState("crypto");
  const [notify, setNotify] = useState(true);
  return (
    <Panel title="Controls" description="Compact desk density (32px lg / 28px default) and the .ca-touch wrapper (44px) for consequential forms.">
      <div className="ca-form-split">
        <ControlSet title="Compact" method={method} setMethod={setMethod} notify={notify} setNotify={setNotify} />
        <div className="ca-touch">
          <ControlSet title="Touch (.ca-touch)" method={method} setMethod={setMethod} notify={notify} setNotify={setNotify} />
        </div>
      </div>
    </Panel>
  );
}

function ControlSet({
  title,
  method,
  setMethod,
  notify,
  setNotify,
}: {
  title: string;
  method: string;
  setMethod: (value: string) => void;
  notify: boolean;
  setNotify: (value: boolean) => void;
}) {
  const prefix = title.replace(/[^a-z]/gi, "").toLowerCase();
  return (
    <div className="flex flex-col gap-6">
      <h3 className="ca-h3">{title}</h3>
      <div className="flex flex-wrap gap-2">
        <Button size="lg">Submit request</Button>
        <Button size="lg" variant="outline">
          Cancel
        </Button>
        <Button size="lg" variant="secondary">
          Secondary
        </Button>
        <Button size="lg" variant="ghost">
          Ghost
        </Button>
        <Button size="lg" variant="destructive">
          Stop allocation
        </Button>
        <Button size="lg" disabled>
          Disabled
        </Button>
      </div>
      <div className="flex flex-col gap-2">
        <Label htmlFor={`${prefix}-amount`}>Amount</Label>
        <Input id={`${prefix}-amount`} inputMode="decimal" placeholder="0.00000000" aria-describedby={`${prefix}-amount-help`} />
        <p id={`${prefix}-amount-help`} className="ca-help m-0">
          Available 0.08000000 BTC
        </p>
      </div>
      <div className="flex flex-col gap-2">
        <Label htmlFor={`${prefix}-note`}>Note</Label>
        <Textarea id={`${prefix}-note`} placeholder="Optional note for the reviewer" />
      </div>
      <fieldset className="flex flex-col gap-2 border-0 p-0">
        <legend className="ca-label mb-2">Method</legend>
        <RadioGroup value={method} onValueChange={setMethod} aria-label="Withdrawal method">
          <div className="flex items-center gap-3">
            <RadioGroupItem value="crypto" id={`${prefix}-crypto`} />
            <Label htmlFor={`${prefix}-crypto`}>Crypto address</Label>
          </div>
          <div className="flex items-center gap-3">
            <RadioGroupItem value="bank" id={`${prefix}-bank`} />
            <Label htmlFor={`${prefix}-bank`}>Bank transfer</Label>
          </div>
        </RadioGroup>
      </fieldset>
      <div className="flex items-center gap-3">
        <Switch id={`${prefix}-notify`} checked={notify} onCheckedChange={setNotify} />
        <Label htmlFor={`${prefix}-notify`}>Email me when this request changes</Label>
      </div>
    </div>
  );
}

function Amounts() {
  return (
    <Panel title="Amount states" description="Zero is a real zero; unknown is an em dash with a reason. Units follow the number.">
      <KeyValueList
        layout="inline"
        items={[
          { label: "Zero", value: <Amount value="0" unit="BTC" /> },
          { label: "Unknown (null)", value: <Amount value={null} unit="USD" unavailableReason="No price quote is available" /> },
          { label: "Main value role", value: <Amount value="12250.00" unit="USD" role="main" /> },
          { label: "Signed credit", value: <Amount value="120.00" unit="USD" direction="credit" /> },
          { label: "Signed debit", value: <Amount value="0.50000000" unit="ETH" direction="debit" /> },
          { label: "Recorded loss", value: <Amount value="-45.00" unit="USD" sign /> },
          { label: "USDT display precision (exact in title)", value: <Amount value="1250.123456" unit="USDT" /> },
          { label: "USDT exact", value: <Amount value="1250.123456" unit="USDT" exact /> },
          { label: "Long value wraps at the unit", value: <Amount value="123456789.12345678" unit="BTC" role="metric" /> },
        ]}
      />
    </Panel>
  );
}

function Statuses() {
  const groups: Array<{ domain: "request" | "settlement" | "allocation" | "verification" | "mfa"; values: string[] }> = [
    { domain: "request", values: ["PENDING", "APPROVED", "REJECTED", "CANCELLED", "UNKNOWN"] },
    { domain: "settlement", values: ["not-applicable", "unconfirmed", "confirmed", "failed"] },
    { domain: "allocation", values: ["ACTIVE", "PAUSED", "STOPPED", "PENDING", "STOPPING", "ERROR"] },
    { domain: "verification", values: ["not-submitted", "in-review", "verified", "changes-required"] },
    { domain: "mfa", values: ["not-enabled", "enrollment-pending", "enabled"] },
  ];
  return (
    <Panel title="Status badges" description="Text is always visible; the variant never carries the state alone.">
      <KeyValueList
        items={groups.map((group) => ({
          label: group.domain,
          value: (
            <div className="flex flex-wrap gap-2">
              {group.values.map((value) => (
                <StatusBadge key={value} status={value} domain={group.domain} />
              ))}
            </div>
          ),
        }))}
      />
    </Panel>
  );
}

function DataStates() {
  const [retries, setRetries] = useState(0);
  return (
    <Panel title="Data states" description="Loading, empty, error, unavailable and not found are distinct. Skeletons hold the region's geometry.">
      <div className="flex flex-col gap-6">
        <div>
          <h3 className="ca-h3 mb-2">RegionSkeleton variant=&quot;summary&quot;</h3>
          <RegionSkeleton variant="summary" region="Account summary" />
        </div>
        <div>
          <h3 className="ca-h3 mb-2">RegionSkeleton variant=&quot;table&quot;</h3>
          <RegionSkeleton variant="table" region="Activity" rows={3} />
        </div>
        <div>
          <h3 className="ca-h3 mb-2">RegionSkeleton variant=&quot;list&quot;</h3>
          <RegionSkeleton variant="list" region="Allocations" rows={2} />
        </div>
        <EmptyState
          region="Activity"
          title="No activity matches these filters"
          description="Try a wider date range or reset the filters."
          action={
            <Button variant="outline" size="lg">
              Reset filters
            </Button>
          }
        />
        <ErrorState
          region="Assets"
          message={`The account service did not respond.${retries ? ` Retried ${retries} time${retries === 1 ? "" : "s"}.` : ""}`}
          onRetry={() => setRetries((count) => count + 1)}
        />
        <UnavailableState
          region="Signals"
          reason="No signal feed is connected to this account."
          alternative={{ label: "Discover traders", href: "/dashboard/traders" }}
        />
        <NotFoundState region="Transaction" />
      </div>
    </Panel>
  );
}

function Alerts() {
  return (
    <Panel title="Alerts" description="Persistent in-place notices. Only the destructive variant carries role=alert.">
      <Alert>
        <WarningIcon size={16} aria-hidden="true" />
        <AlertTitle>Quote expires in 10 minutes</AlertTitle>
        <AlertDescription>Editing any field invalidates the quote and requires a new one.</AlertDescription>
      </Alert>
      <Alert variant="destructive">
        <WarningIcon size={16} aria-hidden="true" />
        <AlertTitle>Request declined</AlertTitle>
        <AlertDescription>Destination address failed compliance review. Reference WDR-2026-0003.</AlertDescription>
      </Alert>
    </Panel>
  );
}

function Overlays() {
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [sheetOpen, setSheetOpen] = useState(false);
  const { announce } = useStatusAnnouncer();

  const confirm = async () => {
    setBusy(true);
    await new Promise((resolve) => setTimeout(resolve, 900));
    setBusy(false);
    setConfirmOpen(false);
    announce("Withdrawal request submitted (simulated)");
  };

  return (
    <Panel title="Overlays" description="Dialog for focused tasks, AlertDialog for consequential confirmations, Sheet for record details. Escape closes and returns focus.">
      <div className="flex flex-wrap gap-2">
        <Dialog>
          <DialogTrigger asChild>
            <Button size="lg" variant="outline">
              Open dialog
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle className="ca-h3">Rename this allocation</DialogTitle>
              <DialogDescription className="ca-body">The name is only shown to you.</DialogDescription>
            </DialogHeader>
            <div className="ca-touch flex flex-col gap-2">
              <Label htmlFor="dialog-name">Name</Label>
              <Input id="dialog-name" defaultValue="Alex Morgan allocation" />
            </div>
            <DialogFooter>
              <Button size="lg" variant="outline">
                Cancel
              </Button>
              <Button size="lg">Save</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
        <Button size="lg" onClick={() => setConfirmOpen(true)}>
          Open confirm dialog
        </Button>
        <Button size="lg" variant="outline" onClick={() => setSheetOpen(true)}>
          Open detail sheet
        </Button>
      </div>
      <ConfirmDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title="Confirm withdrawal"
        description="This request is reviewed manually. The amount is reserved until the review concludes."
        details={[
          { label: "Asset", value: "ETH" },
          { label: "Amount", value: <Amount value="0.50000000" unit="ETH" /> },
          { label: "Fee", value: <Amount value="0.00020000" unit="ETH" /> },
          { label: "Destination", value: <span className="ca-id">0x12ab…9f3e</span> },
        ]}
        confirmLabel="Submit request"
        busy={busy}
        busyLabel="Submitting"
        onConfirm={confirm}
      />
      <DetailSheet open={sheetOpen} onOpenChange={setSheetOpen} title="Transaction WDR-2026-0001" description="Withdrawal · Pending review">
        <KeyValueList
          items={[
            { label: "Amount", value: <Amount value="0.50000000" unit="ETH" direction="debit" /> },
            { label: "Status", value: <StatusBadge status="PENDING" domain="request" /> },
            { label: "Settlement", value: <StatusBadge status="unconfirmed" domain="settlement" /> },
            { label: "Created", value: "6 Sep 2026, 12:00 UTC" },
          ]}
        />
      </DetailSheet>
    </Panel>
  );
}

function PaginationSample() {
  const [page, setPage] = useState(2);
  const [pageSize, setPageSize] = useState(10);
  return (
    <Panel title="Pagination" description="Semantic nav with the current page announced politely. Page size select is optional.">
      <Pagination page={page} pageSize={pageSize} total={43} onPageChange={setPage} onPageSizeChange={setPageSize} itemLabel="transactions" />
    </Panel>
  );
}

function Progressive() {
  return (
    <Panel title="Progress and spinner" description="Progress for uploads and multi-step tasks; the 16px spinner for short waits inside controls.">
      <div className="flex flex-col gap-2">
        <span id="upload-progress-label" className="ca-label">
          Uploading front of document, 60%
        </span>
        <Progress value={60} aria-labelledby="upload-progress-label" />
      </div>
      <div className="flex flex-wrap items-center gap-4">
        <Spinner label="Loading balances" />
        <Button size="lg" disabled aria-busy="true">
          <Spinner label="" />
          Submitting
        </Button>
      </div>
    </Panel>
  );
}

function QrAndCopy() {
  return (
    <Panel title="QR code and copy" description="White quiet zone with black modules in both themes. Copy announces through the status region.">
      <div className="flex flex-wrap items-start gap-6">
        <QrCode value={FIXTURE_QR_PAYLOAD} />
        <div className="flex max-w-[28rem] flex-col gap-2">
          <span className="ca-label">Deposit address (fixture)</span>
          <code className="ca-id select-all rounded-md border border-border bg-muted px-2 py-1">{FIXTURE_QR_PAYLOAD}</code>
          <CopyButton value={FIXTURE_QR_PAYLOAD} describe="deposit address" />
        </div>
      </div>
    </Panel>
  );
}

function PanelSamples() {
  return (
    <Panel
      title="Panel rows and key-value list"
      description="Open rows inside one panel; no nested cards."
      action={
        <Button variant="outline" size="default">
          Secondary action
        </Button>
      }
    >
      <PanelRows>
        <PanelRow trailing={<Amount value="0.10000000" unit="BTC" />}>
          <span className="ca-body font-medium">BTC</span>
          <span className="ca-help">Bitcoin</span>
        </PanelRow>
        <PanelRow trailing={<Amount value="2.00000000" unit="ETH" />}>
          <span className="ca-body font-medium">ETH</span>
          <span className="ca-help">Ethereum</span>
        </PanelRow>
        <PanelRow trailing={<Amount value={null} unit="LTC" unavailableReason="Wallet not initialised for this account" />}>
          <span className="ca-body font-medium">LTC</span>
          <span className="ca-help">Litecoin · Not initialised</span>
        </PanelRow>
      </PanelRows>
      <KeyValueList
        layout="inline"
        items={[
          { label: "Reference", value: <span className="ca-id">DEP-2026-0001</span> },
          { label: "Network", value: "Bitcoin" },
          { label: "Confirmations", value: "3 of 3", help: "As reported by the operator" },
        ]}
      />
    </Panel>
  );
}
