"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowDownLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  isSupportedCrypto,
  type DepositInstruction,
  type WithdrawalOptions,
  type WithdrawalQuote,
  type WithdrawalReceipt,
  type WithdrawalRequestInput,
} from "@/lib/dashboard/contracts";
import { formatDateTime } from "@/lib/dashboard/format";
import type { ScreenData } from "@/lib/dashboard/screen-data";
import { useDashboardActions } from "../actions-context";
import { Amount } from "../amount";
import { CoinIdentity } from "../coin-identity";
import { CopyButton } from "../copy-button";
import { PageHeading } from "../page-heading";
import { Panel, KeyValueList } from "../panel";
import { QrCode } from "../qr";
import { ConfirmDialog } from "../confirm-dialog";
import { ActivityTable } from "./portfolio";
import { ActionLink, Choice, Region, useFilters, useOperation } from "./shared";

function useNow(referenceTime?: string) {
  const [now, setNow] = useState(() =>
    referenceTime ? Date.parse(referenceTime) : Date.now(),
  );
  useEffect(() => {
    if (referenceTime) {
      setNow(Date.parse(referenceTime));
      return;
    }
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, [referenceTime]);
  return now;
}

function DepositDetails({
  instruction,
  referenceTime,
  retry,
}: {
  instruction: DepositInstruction;
  referenceTime?: string;
  retry?: () => void;
}) {
  const now = useNow(referenceTime);
  const router = useRouter();
  if (instruction.expiresAt && Date.parse(instruction.expiresAt) <= now)
    return (
      <div role="status" className="flex flex-col items-start gap-4">
        <p>
          This deposit instruction has expired. Refresh before sending funds.
        </p>
        <Button onClick={retry ?? (() => router.refresh())} variant="outline">
          Refresh instructions
        </Button>
      </div>
    );
  return (
    <>
      <p className="ca-body">
        Send only {instruction.currency} on {instruction.network.name}. Using
        another asset or network can cause permanent loss.
      </p>
      <div className="flex flex-col items-start gap-4">
        <QrCode value={instruction.address} />
        <p className="ca-label">Deposit address</p>
        <code className="ca-id select-all">{instruction.address}</code>
        <CopyButton value={instruction.address} describe="deposit address" />
        {instruction.tag !== null && (
          <>
            <p className="ca-label">Required destination tag / memo</p>
            <code className="ca-id select-all">{instruction.tag}</code>
            <CopyButton value={instruction.tag} describe="destination tag" />
          </>
        )}
      </div>
      <KeyValueList
        items={[
          {
            label: "Asset",
            value: <CoinIdentity currency={instruction.currency} />,
          },
          {
            label: "Minimum deposit",
            value: (
              <Amount
                value={instruction.minimumDeposit}
                unit={instruction.currency}
                exact
              />
            ),
          },
          {
            label: "Required confirmations",
            value: instruction.confirmations ?? "Not supplied",
          },
          {
            label: "Expires",
            value: instruction.expiresAt
              ? formatDateTime(instruction.expiresAt)
              : "No expiry supplied",
          },
        ]}
      />
      {instruction.notice && <p className="ca-help">{instruction.notice}</p>}
    </>
  );
}

export function Deposit({
  data,
  retry,
  referenceTime,
}: {
  data: ScreenData;
  retry?: () => void;
  referenceTime?: string;
}) {
  const { q, change } = useFilters();
  const { actions } = useDashboardActions();
  const operation = useOperation();
  const [hash, setHash] = useState("");
  const [note, setNote] = useState("");
  const [proofReference, setProofReference] = useState("");
  const currency = q?.get("currency") ?? "";
  const network = q?.get("network") ?? "";
  const options =
    data.depositOptions?.status === "ready" ? data.depositOptions.data : [];
  const selected = options.find((option) => option.currency === currency);
  const selectedInstruction =
    data.depositInstruction?.status !== "ready" ||
    (data.depositInstruction.data.currency === currency &&
      data.depositInstruction.data.network.id === network)
      ? data.depositInstruction
      : undefined;
  return (
    <>
      <PageHeading
        title="Deposit"
        subtitle="Choose an asset and network, then use the deposit details provided."
      />
      <div className="ca-sections">
        <div className="ca-form-split ca-touch">
          <Panel title="1. Choose asset and network">
            <Region
              name="Deposit options"
              value={data.depositOptions}
              variant="form"
              retry={retry}
            >
              {() => (
                <>
                  <Choice
                    label="Asset"
                    value={currency}
                    options={options.map((option) => ({
                      value: option.currency,
                      label: option.currency,
                    }))}
                    onChange={(value) =>
                      change({ currency: value, network: null })
                    }
                  />
                  <Choice
                    label="Network"
                    value={network}
                    disabled={!selected}
                    options={
                      selected?.networks.map((n) => ({
                        value: n.id,
                        label: n.name,
                      })) ?? []
                    }
                    onChange={(value) => change({ network: value })}
                  />
                  {selected && !selected.networks.length && (
                    <p className="ca-help">
                      No deposit network is configured for this asset.
                    </p>
                  )}
                </>
              )}
            </Region>
            <p className="ca-help">
              Deposits require confirmation and account review where applicable.
              A copied address does not confirm a transfer.
            </p>
          </Panel>
          <Panel title="2. Deposit details">
            {currency && network ? (
              <Region
                name="Deposit instructions"
                value={selectedInstruction}
                retry={retry}
              >
                {(instruction) => (
                  <DepositDetails
                    instruction={instruction}
                    referenceTime={referenceTime}
                    retry={retry}
                  />
                )}
              </Region>
            ) : (
              <p className="ca-body text-muted-foreground">
                Choose both an asset and a network to see the address and QR
                code.
              </p>
            )}
          </Panel>
        </div>
        <Panel title="Deposit proof" className="max-w-[60rem] ca-touch">
          {data.capabilities.depositProof.available ? (
            <form
              className="flex max-w-[32rem] flex-col gap-4"
              onSubmit={(e) => {
                e.preventDefault();
                if (!isSupportedCrypto(currency) || !network) return;
                void operation.run(
                  () =>
                    actions.submitDepositProof({
                      currency,
                      networkId: network,
                      txHash: hash,
                      note,
                    }),
                  "Proof submitted for review.",
                  (receipt) => {
                    setProofReference(receipt.reference);
                    setHash("");
                    setNote("");
                  },
                );
              }}
            >
              <p className="ca-help">
                Submit the transaction hash for review. This does not credit
                your balance.
              </p>
              {proofReference && (
                <p role="status" className="ca-body">
                  Proof submitted for review · {proofReference}
                </p>
              )}
              <Label htmlFor="deposit-hash">Transaction hash</Label>
              <Input
                id="deposit-hash"
                required
                value={hash}
                onChange={(e) => setHash(e.target.value)}
                aria-invalid={Boolean(operation.fieldErrors.txHash)}
                aria-describedby={
                  operation.fieldErrors.txHash ? operation.errorId : undefined
                }
              />
              <Label htmlFor="deposit-note">Note (optional)</Label>
              <Textarea
                id="deposit-note"
                value={note}
                onChange={(e) => setNote(e.target.value)}
              />
              <Button
                type="submit"
                disabled={
                  !network || !isSupportedCrypto(currency) || operation.busy
                }
              >
                {operation.busy ? "Submitting proof…" : "Submit deposit proof"}
              </Button>
              {!network && (
                <p className="ca-help">
                  Choose an asset and network before submitting proof.
                </p>
              )}
              {operation.feedback}
              <p className="ca-help">
                File attachments are not supported by the current proof service.
              </p>
            </form>
          ) : (
            <p className="ca-body">
              {data.capabilities.depositProof.reason ??
                "Deposit proof submission is not connected."}
            </p>
          )}
        </Panel>
        <Panel title="Recent deposits" bleed={data.activity?.status === "ready"}>
          {data.activity?.status === "empty" ? (
            <section aria-label="No recent deposits" className="flex items-start gap-4 py-5 sm:py-7">
              <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground">
                <ArrowDownLeft size={20} aria-hidden="true" />
              </span>
              <div className="min-w-0 space-y-2">
                <h3 className="ca-h3">No deposits yet</h3>
                <p className="ca-body max-w-md text-muted-foreground">
                  Your deposit requests and their review status will appear here.
                </p>
              </div>
            </section>
          ) : <Region name="Deposits" value={data.activity} retry={retry}>
            {(rows) => <ActivityTable rows={rows} />}
          </Region>}
        </Panel>
      </div>
    </>
  );
}

export function Withdraw({
  data,
  retry,
  referenceTime,
}: {
  data: ScreenData;
  retry?: () => void;
  referenceTime?: string;
}) {
  return (
    <>
      <PageHeading
        title="Withdraw"
        subtitle="Method and details → Review request → Pending review"
      />
      <Region
        name="Withdrawal options"
        value={data.withdrawalOptions}
        variant="form"
        retry={retry}
      >
        {(options) => (
          <WithdrawalForm
            options={options}
            data={data}
            referenceTime={referenceTime}
          />
        )}
      </Region>
    </>
  );
}

function WithdrawalForm({
  options,
  data,
  referenceTime,
}: {
  options: WithdrawalOptions;
  data: ScreenData;
  referenceTime?: string;
}) {
  const { actions } = useDashboardActions();
  const op = useOperation();
  const now = useNow(referenceTime);
  const [method, setMethod] = useState("crypto");
  const [currency, setCurrency] = useState("");
  const [network, setNetwork] = useState("");
  const [address, setAddress] = useState("");
  const [tag, setTag] = useState("");
  const [amount, setAmount] = useState("");
  const [bank, setBank] = useState<Record<string, string>>({});
  const [denomination, setDenomination] = useState(
    options.bankScheme?.denominations[0] ?? "",
  );
  const [review, setReview] = useState<{
    input: WithdrawalRequestInput;
    quote: WithdrawalQuote;
    key: string;
  } | null>(null);
  const [receipt, setReceipt] = useState<WithdrawalReceipt | null>(null);
  const [uncertain, setUncertain] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const submittedKey = useRef<string | null>(null);
  const asset = options.assets.find((item) => item.currency === currency);
  const net = asset?.networks.find((item) => item.id === network);
  const capability =
    method === "crypto"
      ? data.capabilities.withdrawCrypto
      : data.capabilities.withdrawBank;
  const methodAvailable =
    options.methods.find((item) => item.id === method)?.available &&
    capability.available &&
    data.capabilities.withdrawalQuotes.available;
  const expired = review ? Date.parse(review.quote.expiresAt) <= now : false;
  const resetQuote = () => {
    setDialogOpen(false);
    if (!uncertain) {
      setReview(null);
      submittedKey.current = null;
    }
  };
  const field = (name: string) => ({
    "aria-invalid": Boolean(op.fieldErrors[name]),
    "aria-describedby": op.fieldErrors[name] ? op.errorId : undefined,
  });
  async function reconcile() {
    if (!review) return;
    await op.run(
      () => actions.reconcileWithdrawal(review.key),
      "Request confirmed.",
      (value) => {
        setReceipt(value);
        setReview(null);
        setUncertain(false);
      },
    );
  }
  async function submit() {
    if (!review || expired) return;
    if (uncertain || submittedKey.current === review.key) {
      await reconcile();
      return;
    }
    submittedKey.current = review.key;
    const result = await op.run(
      () =>
        actions.submitWithdrawal(
          review.input,
          review.quote.quoteId,
          review.key,
        ),
      "Request submitted for review.",
      (value) => {
        setReceipt(value);
        setReview(null);
      },
    );
    if (!result || (!result.ok && result.code === "unknown-outcome")) {
      setUncertain(true);
    } else if (!result.ok) submittedKey.current = null;
  }
  if (receipt)
    return (
      <Panel title="Withdrawal request submitted">
        <p role="status" className="ca-body">
          Pending review. This is not confirmation of payment or network
          settlement.
        </p>
        <KeyValueList
          items={[
            { label: "Reference", value: receipt.reference },
            { label: "Submitted", value: formatDateTime(receipt.submittedAt) },
          ]}
        />
        <ActionLink href={`/dashboard/activity/${receipt.requestId}`}>
          View request
        </ActionLink>
      </Panel>
    );
  return (
    <>
      <div className="ca-form-split ca-touch">
        <Panel title="Withdrawal details">
          <form
            className="flex flex-col gap-4"
            onSubmit={(e) => {
              e.preventDefault();
              if (!isSupportedCrypto(currency)) return;
              const input: WithdrawalRequestInput =
                method === "crypto"
                  ? {
                      method: "crypto",
                      currency,
                      networkId: network,
                      address,
                      tag,
                      amount,
                    }
                  : {
                      method: "bank",
                      currency,
                      fields: bank,
                      amount,
                      denomination,
                    };
              void op.run(
                () => actions.quoteWithdrawal(input),
                "Review the quoted fee and recipient before submitting.",
                (quote) => {
                  setReview({ input, quote, key: crypto.randomUUID() });
                  setDialogOpen(true);
                  setUncertain(false);
                },
              );
            }}
          >
            <fieldset
              disabled={op.busy || uncertain}
              className="flex min-w-0 flex-col gap-4"
            >
              <legend className="sr-only">Method and recipient details</legend>
              <RadioGroup
                aria-label="Withdrawal method"
                value={method}
                onValueChange={(value) => {
                  resetQuote();
                  setMethod(value);
                }}
                className="gap-4"
              >
                {options.methods.map((item) => (
                  <div key={item.id}>
                    <div className="flex items-center gap-3">
                      <RadioGroupItem
                        id={`method-${item.id}`}
                        value={item.id}
                        disabled={!item.available}
                      />
                      <Label htmlFor={`method-${item.id}`}>{item.label}</Label>
                    </div>
                    {!item.available && (
                      <p className="ca-help mt-2">
                        {item.reason ?? "This method is not available."}
                      </p>
                    )}
                  </div>
                ))}
              </RadioGroup>
              <Choice
                label="Source asset"
                value={currency}
                onChange={(value) => {
                  resetQuote();
                  setCurrency(value);
                  setNetwork("");
                }}
                options={options.assets.map((item) => ({
                  value: item.currency,
                  label: item.currency,
                }))}
              />
              {asset && (
                <p className="ca-help">
                  Available:{" "}
                  <Amount value={asset.available} unit={asset.currency} exact />
                </p>
              )}
              {method === "crypto" ? (
                <>
                  <Choice
                    label="Network"
                    value={network}
                    onChange={(value) => {
                      resetQuote();
                      setNetwork(value);
                    }}
                    options={
                      asset?.networks.map((item) => ({
                        value: item.id,
                        label: item.name,
                      })) ?? []
                    }
                    disabled={!asset}
                  />
                  <Label htmlFor="withdraw-address">Recipient address</Label>
                  <Input
                    id="withdraw-address"
                    required
                    autoComplete="off"
                    value={address}
                    onChange={(e) => {
                      resetQuote();
                      setAddress(e.target.value);
                    }}
                    {...field("address")}
                  />
                  {net?.requiresTag && (
                    <>
                      <Label htmlFor="withdraw-tag">
                        Destination tag / memo (required)
                      </Label>
                      <Input
                        id="withdraw-tag"
                        required
                        value={tag}
                        onChange={(e) => {
                          resetQuote();
                          setTag(e.target.value);
                        }}
                        {...field("tag")}
                      />
                    </>
                  )}
                </>
              ) : options.bankScheme ? (
                <>
                  {options.bankScheme.fields.map((item) => (
                    <div className="flex flex-col gap-2" key={item.id}>
                      <Label htmlFor={`bank-${item.id}`}>
                        {item.label}
                        {!item.required && " (optional)"}
                      </Label>
                      <Input
                        id={`bank-${item.id}`}
                        required={item.required}
                        autoComplete="off"
                        value={bank[item.id] ?? ""}
                        onChange={(e) => {
                          resetQuote();
                          setBank({ ...bank, [item.id]: e.target.value });
                        }}
                        {...field(`fields.${item.id}`)}
                      />
                    </div>
                  ))}
                  <Choice
                    label="Payout denomination"
                    value={denomination}
                    onChange={(value) => {
                      resetQuote();
                      setDenomination(value);
                    }}
                    options={options.bankScheme.denominations.map((value) => ({
                      value,
                      label: value,
                    }))}
                  />
                </>
              ) : (
                <p className="ca-help">No bank payout scheme is configured.</p>
              )}
              <Label htmlFor="withdraw-amount">
                Amount in {currency || "source asset"}
              </Label>
              <Input
                id="withdraw-amount"
                required
                inputMode="decimal"
                value={amount}
                onChange={(e) => {
                  resetQuote();
                  setAmount(e.target.value);
                }}
                {...field("amount")}
              />
              <p className="ca-help">
                Fees are quoted by the service. The total debit must not exceed
                your available balance.
              </p>
              <Button
                type="submit"
                disabled={
                  !methodAvailable ||
                  !currency ||
                  (method === "crypto" && !network)
                }
              >
                {op.busy ? "Requesting quote…" : "Review withdrawal"}
              </Button>
              {!methodAvailable && (
                <p className="ca-help">
                  {capability.reason ??
                    data.capabilities.withdrawalQuotes.reason ??
                    "Withdrawal quotes are not connected."}
                </p>
              )}
            </fieldset>
            {!dialogOpen && op.feedback}
            {uncertain && !dialogOpen && (
              <div className="flex flex-col items-start gap-4">
                <p role="status" className="ca-body">
                  The previous request has an unconfirmed outcome. Check its
                  status before making another request.
                </p>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setDialogOpen(true)}
                >
                  Review pending request
                </Button>
              </div>
            )}
          </form>
        </Panel>
        <Panel title="Before you withdraw">
          <p className="ca-body">
            Check the recipient and network carefully. Blockchain transfers
            cannot normally be reversed.
          </p>
          <p className="ca-body">
            Submitting a request starts the review process. Approval and
            settlement are separate stages.
          </p>
          <p className="ca-help">
            Your recipient information is not stored in the URL or browser
            storage.
          </p>
        </Panel>
      </div>
      <ConfirmDialog
        open={Boolean(review) && dialogOpen}
        onOpenChange={(open) => {
          setDialogOpen(open);
          if (!open && !uncertain) resetQuote();
        }}
        title="Review withdrawal request"
        description="Confirm the full destination, network and total debit. Submission requests a withdrawal; it does not confirm settlement."
        confirmLabel={
          uncertain ? "Check request status" : "Submit withdrawal request"
        }
        busy={op.busy}
        confirmDisabled={expired && !uncertain}
        onConfirm={uncertain ? reconcile : submit}
        details={
          review
            ? [
                {
                  label: "Recipient",
                  value:
                    review.input.method === "crypto"
                      ? review.input.address
                      : Object.entries(review.input.fields)
                          .map(([key, value]) => `${key}: ${value}`)
                          .join(" · "),
                },
                {
                  label: "Network / payout",
                  value:
                    review.input.method === "crypto"
                      ? `${net?.name ?? review.input.networkId}${review.input.tag ? ` · Tag: ${review.input.tag}` : ""}`
                      : review.input.denomination,
                },
                {
                  label: "Recipient amount",
                  value: (
                    <Amount
                      value={review.quote.recipientAmount}
                      unit={review.quote.currency}
                      exact
                    />
                  ),
                },
                {
                  label: "Fee",
                  value: (
                    <Amount
                      value={review.quote.fee}
                      unit={review.quote.currency}
                      exact
                    />
                  ),
                },
                {
                  label: "Total debit",
                  value: (
                    <Amount
                      value={review.quote.totalDebit}
                      unit={review.quote.currency}
                      exact
                    />
                  ),
                },
                {
                  label: "Quote expiry",
                  value: formatDateTime(review.quote.expiresAt),
                },
              ]
            : []
        }
      >
        {op.feedback}
        {expired && (
          <p role="alert" className="ca-body text-destructive">
            Quote expired. Cancel and request a new quote before submitting.
          </p>
        )}
        {uncertain && (
          <p role="alert" className="ca-body">
            The outcome is not confirmed. Check request status before starting
            another withdrawal. Your original request reference is retained.
          </p>
        )}
      </ConfirmDialog>
    </>
  );
}
