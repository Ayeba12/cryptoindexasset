"use client";

import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Panel, KeyValueList } from "@/components/dashboard/panel";
import { PageHeading } from "@/components/dashboard/page-heading";
import { ConfirmDialog } from "@/components/dashboard/confirm-dialog";
import { Choice } from "@/components/dashboard/views/shared";
import {
  blankTrader,
  validateTrader,
  publishedTraders,
  record,
  CURRENCIES,
  type Trader,
} from "@/lib/admin/model";
import {
  createTraderAction,
  updateTraderAction,
  archiveTraderAction,
} from "@/lib/admin/traders.server";
import { APPROVED_TRADERS } from "@/lib/content/approved-people";
import { useAdmin } from "./provider";
import {
  AdminLink,
  Field,
  Notice,
  Status,
  Portrait,
  Records,
  Missing,
} from "./shared";

export function TraderList() {
  const { state } = useAdmin();
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");
  const traders = state!.traders.filter(
    (t) =>
      t.name.toLowerCase().includes(search.toLowerCase()) &&
      (filter === "all" || t.status === filter),
  );
  return (
    <>
      <PageHeading
        title="Trader profiles"
        subtitle="Manage profiles, review their information and control where they appear."
        actions={
          <>
            <AdminLink to="traders/publication">Publication preview</AdminLink>
            <AdminLink to="traders/new" primary>
              Add trader
            </AdminLink>
          </>
        }
      />
      <Panel
        title="Trader directory"
        description="Manual performance data stays labelled with its source. Publishing does not verify a trader."
      >
        <div className="admin-filter">
          <Field
            label="Search traders"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name"
          />
          <Choice
            label="Status"
            value={filter}
            onChange={setFilter}
            options={["all", "Draft", "Published", "Archived"].map((value) => ({
              value,
              label: value === "all" ? "All statuses" : value,
            }))}
          />
        </div>
        <Records
          title="Trader directory"
          headers={[
            "Trader",
            "Strategy",
            "Accuracy",
            "Copiers",
            "Publication",
            "Profile",
          ]}
          rows={traders.map((t) => ({
            id: t.id,
            cells: [
              <div className="admin-identity" key="identity">
                <Portrait name={t.name} src={t.avatar} alt={t.avatarAlt} />
                <div>
                  <p className="ca-body font-medium">{t.name}</p>
                  <p className="ca-help">{t.id}</p>
                </div>
              </div>,
              t.strategy,
              <div key="accuracy">
                {t.accuracy ? `${t.accuracy}%` : "Not supplied"}
                <p className="ca-help">{t.period || "No period supplied"}</p>
              </div>,
              t.copiers || "Not supplied",
              <Status key="status">{t.status}</Status>,
              <AdminLink key="link" to={`traders/${t.id}`}>
                Edit profile
              </AdminLink>,
            ],
          }))}
        />
      </Panel>
    </>
  );
}
export function TraderEditor({ id }: { id: string }) {
  const { state, commit, fault, preview } = useAdmin();
  const existing = state!.traders.find((t) => t.id === id);
  const [draft, setDraft] = useState<Trader>(() =>
    existing ? { ...existing } : blankTrader(),
  );
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [message, setMessage] = useState("");
  const [failure, setFailure] = useState("");
  const [confirmation, setConfirmation] = useState<
    "publish" | "archive" | "draft" | null
  >(null);
  const [isPending, setIsPending] = useState(false);
  const fileSequence = useRef(0);
  const savedId = useRef(existing?.id ?? "");
  if (id !== "new" && !existing) return <Missing entity="Trader" />;
  function change(key: keyof Trader, value: string | boolean) {
    setDraft((t) => ({ ...t, [key]: value }));
    setMessage("");
  }
  function field(
    key: keyof Trader,
    label: string,
    options: {
      required?: boolean;
      multiline?: boolean;
      hint?: string;
      type?: string;
    } = {},
  ) {
    return (
      <Field
        key={key}
        label={label}
        value={String(draft[key])}
        onChange={(e) => change(key, e.target.value)}
        error={errors[key]}
        {...options}
      />
    );
  }
  async function save(status: Trader["status"]) {
    const candidate = { ...draft, status };
    const issues = validateTrader(candidate);
    setErrors(issues);
    setFailure("");
    if (Object.keys(issues).length) {
      setConfirmation(null);
      setFailure("Check the highlighted profile fields before saving.");
      return;
    }
    setIsPending(true);
    try {
      const isNew = !savedId.current;
      let res: {
        success: boolean;
        trader?: Trader;
        errors?: Record<string, string>;
        error?: string;
        liquidatedCount?: number;
        totalRefunded?: string;
      };

      if (preview) {
        res = { success: true, trader: { ...candidate, id: savedId.current || crypto.randomUUID(), version: (candidate.version ?? 0) + 1 } };
      } else if (status === "Archived" && !isNew) {
        res = await archiveTraderAction(candidate.id, candidate.version ?? 1);
      } else if (isNew) {
        res = await createTraderAction(candidate);
      } else {
        res = await updateTraderAction(candidate.id, candidate, candidate.version ?? 1);
      }

      if (!res.success) {
        if (res.errors) setErrors(res.errors);
        setFailure(res.error || "Operation failed. Please verify the profile inputs.");
        setConfirmation(null);
        setIsPending(false);
        return;
      }

      const saved = res.trader!;
      commit((current) => {
        const i = current.traders.findIndex((t) => t.id === saved.id);
        if (i < 0) current.traders.push(saved);
        else current.traders[i] = saved;
        record(
          current,
          `Trader ${status.toLowerCase()}`,
          saved.id,
          status === "Archived"
            ? `Archived with ${res.liquidatedCount ?? 0} active allocations auto-liquidated ($${res.totalRefunded ?? "0.00"} refunded).`
            : `Profile saved with status ${status}.`,
          new Date().toISOString(),
        );
        return current;
      });

      savedId.current = saved.id;
      setDraft(saved);
      setConfirmation(null);
      if (preview) {
        setMessage("Preview updated in this browser. No live trader was changed.");
      } else if (status === "Archived") {
        setMessage(
          `Trader archived. ${res.liquidatedCount ?? 0} active allocations were auto-liquidated and $${res.totalRefunded ?? "0.00"} USDT was credited to client accounts.`,
        );
      } else {
        setMessage(
          `Trader profile ${status === "Published" ? "published live across public and customer discovery" : "saved as draft"}.`,
        );
      }
    } catch (error) {
      setFailure(
        error instanceof Error ? error.message : "Could not save this profile.",
      );
    } finally {
      setIsPending(false);
    }
  }
  async function selectImage(file?: File) {
    const sequence = ++fileSequence.current;
    if (!file) return;
    if (
      !["image/png", "image/jpeg", "image/webp"].includes(file.type) ||
      file.size > 2 * 1024 * 1024
    ) {
      setErrors((e) => ({
        ...e,
        avatar: "Choose a PNG, JPEG or WebP image under 2 MB.",
      }));
      return;
    }
    try {
      const bitmap = await createImageBitmap(file);
      if (bitmap.width > 4096 || bitmap.height > 4096) {
        bitmap.close();
        throw new Error("Use an image no larger than 4096 pixels per side.");
      }
      bitmap.close();
      const result = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result));
        reader.onerror = () =>
          reject(new Error("The image could not be read."));
        reader.readAsDataURL(file);
      });
      if (sequence === fileSequence.current) {
        change("avatar", result);
        setErrors((e) => ({ ...e, avatar: "" }));
      }
    } catch (error) {
      if (sequence === fileSequence.current)
        setErrors((e) => ({
          ...e,
          avatar:
            error instanceof Error
              ? error.message
              : "The image could not be decoded.",
        }));
    }
  }
  return (
    <>
      <PageHeading
        title={
          id === "new" && !savedId.current
            ? "Add trader"
            : `Edit ${draft.name || "trader"}`
        }
        subtitle="Build a complete profile before making it available for discovery."
        actions={<AdminLink to="traders">Back to traders</AdminLink>}
      />
      <form
        className="ca-sections"
        onSubmit={(e) => {
          e.preventDefault();
          if (draft.status === "Published") setConfirmation("publish");
          else save("Draft");
        }}
        noValidate
      >
        {message && <Notice tone="success">{message}</Notice>}
        {failure && <Notice error>{failure}</Notice>}
        <div className="admin-split">
          <div className="ca-sections">
            <Panel
              title="Identity"
              description="Only upload a picture you have permission to use."
            >
              <div className="admin-form-grid">
                {field("name", "Display name", { required: true })}
                {field("summary", "Short summary", { required: true })}
                <div className="space-y-3">
                  <Portrait
                    key={draft.avatar}
                    name={draft.name}
                    src={draft.avatar}
                    alt={draft.avatarAlt}
                  />
                  <Field
                    label="Profile picture"
                    type="file"
                    accept="image/png,image/jpeg,image/webp"
                    error={errors.avatar}
                    hint={preview ? "Preview only. The file stays in this browser session." : "Choose a portrait, then save the profile to publish the picture."}
                    onChange={(e) => void selectImage(e.target.files?.[0])}
                  />
                  {draft.avatar && (
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => {
                        fileSequence.current++;
                        change("avatar", "");
                      }}
                    >
                      Remove picture
                    </Button>
                  )}
                </div>
                {field("avatarAlt", "Picture description")}
                {field("biography", "Biography", {
                  required: true,
                  multiline: true,
                })}
              </div>
            </Panel>
            <Panel title="Trading approach">
              <div className="admin-form-grid">
                <Choice
                  label="Strategy"
                  value={draft.strategy}
                  onChange={(v) => change("strategy", v)}
                  options={[
                    draft.strategy,
                    ...APPROVED_TRADERS.map((trader) => trader.strategy),
                    "Day Trading",
                    "Other",
                  ]
                    .filter((value, index, values) => values.indexOf(value) === index)
                    .map((value) => ({ value, label: value }))}
                />
                {field("assets", "Markets and assets", { required: true })}
                {field("experience", "Years of experience")}
                {field("holdingPeriod", "Typical holding period")}
                {field("strategyDetails", "Strategy description", {
                  required: true,
                  multiline: true,
                })}
                {field("eligibility", "Eligibility and restrictions", {
                  required: true,
                  multiline: true,
                })}
              </div>
            </Panel>
            <Panel
              title="Performance and evidence"
              description="Accuracy means winning completed trades divided by all completed trades in the stated period. It is not a return forecast."
            >
              <div className="admin-form-grid">
                {field("accuracy", "Accuracy / win rate (%)")}
                {field("sampleSize", "Completed trades in sample")}
                {field("period", "Measurement period")}
                {field("updatedAt", "Measurement date", { type: "date" })}
                {field("metricSource", "Metric source and evidence reference")}
                {field("returns", "Recorded return (%)")}
                {field("drawdown", "Maximum drawdown (%)")}
                <Choice
                  label="Risk assessment"
                  value={draft.risk}
                  onChange={(v) => change("risk", v)}
                  options={["Not assessed", "Low", "Medium", "High"].map(
                    (value) => ({ value, label: value }),
                  )}
                />
                {field("riskMethod", "Risk methodology", { multiline: true })}
              </div>
            </Panel>
            <Panel title="Community and copy settings">
              <div className="admin-form-grid">
                {field("copiers", "Copier count")}
                {field("rating", "Rating out of 5")}
                {field("ratingCount", "Number of ratings")}
                {field("communitySource", "Source of counts and ratings")}
                {field("minimum", "Minimum allocation")}
                <Choice
                  label="Allocation currency"
                  value={draft.currency}
                  onChange={(v) => change("currency", v)}
                  options={CURRENCIES.map((value) => ({ value, label: value }))}
                />
                {field("fee", "Profit-share fee (%)")}
                <Choice
                  label="Copy mode"
                  value={draft.mode}
                  onChange={(v) => change("mode", v)}
                  options={["Manual requests", "Unavailable"].map((value) => ({
                    value,
                    label: value,
                  }))}
                />
              </div>
            </Panel>
            <Panel
              title="Internal notes"
              description="Never included in the public or customer profile."
            >
              {field("notes", "Operator notes", { multiline: true })}
            </Panel>
          </div>
          <div className="ca-sections">
            <Panel title="Publication">
              <KeyValueList
                items={[
                  { label: "Status", value: <Status>{draft.status}</Status> },
                  {
                    label: "Verification",
                    value: "Not independently verified",
                  },
                  {
                    label: "Destinations",
                    value: "Public website and customer discovery",
                  },
                ]}
              />
              <div className="flex items-center gap-2 mt-6">
                <Checkbox
                  id="featured-trader"
                  checked={draft.featured}
                  onCheckedChange={(v) => change("featured", v === true)}
                />
                <Label htmlFor="featured-trader">
                  Feature on the public homepage
                </Label>
              </div>
              <p className="ca-help mt-4">
                {preview ? "Preview changes stay in this browser session." : "Publish and enable homepage featuring to show this trader on the public website. Saved changes appear when visitors next load the page; unpublishing or removing the trader removes the card."}
              </p>
            </Panel>
            <Panel title="Card preview">
              <div className="admin-identity mb-4">
                <Portrait
                  key={draft.avatar}
                  name={draft.name}
                  src={draft.avatar}
                  alt={draft.avatarAlt}
                />
                <h3 className="ca-h3">{draft.name || "Trader name"}</h3>
              </div>
              <p className="ca-body">
                {draft.strategy || "The trader's strategy will appear here."}
              </p>
              <p className="ca-help mt-4">
                {draft.strategy} · {draft.assets}
              </p>
              <p className="ca-help mt-2">
                {draft.accuracy
                  ? `${draft.accuracy}% accuracy · ${draft.period || "Period required"}`
                  : "Accuracy not supplied"}
              </p>
            </Panel>
          </div>
        </div>
        <div>
          <div className="admin-save">
            <Button type="submit" disabled={fault === "denied" || isPending}>
              {isPending ? "Saving..." : `Save ${draft.status === "Published" ? "published changes" : "draft"}`}
            </Button>
            {draft.status !== "Published" && (
              <Button
                type="button"
                variant="outline"
                disabled={fault === "denied" || isPending}
                onClick={() => setConfirmation("publish")}
              >
                {isPending ? "Publishing..." : "Publish trader"}
              </Button>
            )}
            {draft.status === "Published" && (
              <Button
                type="button"
                variant="outline"
                disabled={fault === "denied" || isPending}
                onClick={() => setConfirmation("draft")}
              >
                {isPending ? "Unpublishing..." : "Unpublish"}
              </Button>
            )}
            {savedId.current && draft.status !== "Archived" && (
              <Button
                type="button"
                variant="destructive"
                disabled={fault === "denied" || isPending}
                onClick={() => setConfirmation("archive")}
              >
                {isPending ? "Archiving..." : "Remove trader"}
              </Button>
            )}
          </div>
          {fault === "denied" && (
            <p className="ca-help">
              Your role cannot change trader profiles.
            </p>
          )}
        </div>
      </form>
      <ConfirmDialog
        open={confirmation !== null}
        onOpenChange={(open) => {
          if (!open) setConfirmation(null);
        }}
        title={
          confirmation === "archive"
            ? "Archive trader & auto-liquidate allocations?"
            : confirmation === "draft"
              ? "Unpublish trader?"
              : "Publish trader profile?"
        }
        description={
          confirmation === "archive"
            ? "The profile will be archived and hidden from public discovery. All active follower allocations will be immediately liquidated and returned to customer USDT wallets."
            : confirmation === "draft"
              ? "The trader will be unpublished and hidden from public and customer directories."
              : "The profile will become live on the homepage and customer copy-trading directories."
        }
        details={[
          { label: "Trader", value: draft.name || "Unnamed trader" },
          {
            label: "Copier count",
            value: `${draft.copiers || "Not supplied"} · manually entered display metric`,
          },
        ]}
        confirmLabel={
          isPending
            ? "Processing..."
            : confirmation === "archive"
              ? "Archive & auto-liquidate"
              : "Confirm publication"
        }
        destructive={confirmation === "archive"}
        onConfirm={() =>
          save(
            confirmation === "archive"
              ? "Archived"
              : confirmation === "draft"
                ? "Draft"
                : "Published",
          )
        }
      >
        <p className="ca-help">
          {confirmation === "archive"
            ? "Archiving is recorded in audit logs and immediately ceases copying."
            : "Publication updates the database and invalidates the cached directories."}
        </p>
        {failure && <Notice error>{failure}</Notice>}
      </ConfirmDialog>
    </>
  );
}
export function PublicationPreview() {
  const { state } = useAdmin();
  const traders = publishedTraders(state!);
  return (
    <>
      <PageHeading
        title="Publication preview"
        subtitle="Both views below read the same published records in this preview. The live website is unchanged."
        actions={<AdminLink to="traders">Back to traders</AdminLink>}
      />
      <div className="ca-sections">
        {["Public website cards", "Customer discovery cards"].map((title) => (
          <Panel key={title} title={title}>
            <div className="ca-trader-grid">
              {traders.length ? (
                traders.map((t) => (
                  <article key={t.id} className="space-y-3 py-4">
                    <div className="admin-identity">
                      <Portrait
                        name={t.name}
                        src={t.avatar}
                        alt={t.avatarAlt}
                      />
                      <h3 className="ca-h3">{t.name}</h3>
                    </div>
                    <p className="ca-body">{t.summary}</p>
                    <p className="ca-help">
                      {t.strategy} · {t.assets}
                    </p>
                    <p className="ca-body">
                      {t.accuracy
                        ? `${t.accuracy}% accuracy`
                        : "Accuracy unavailable"}
                    </p>
                    <p className="ca-help">
                      {t.period} · {t.metricSource}
                    </p>
                    <p className="ca-help">
                      {t.copiers || "Unknown"} copiers ·{" "}
                      {t.rating
                        ? `${t.rating}/5 (${t.ratingCount} ratings)`
                        : "No rating supplied"}
                    </p>
                    <p className="ca-help">{t.communitySource}</p>
                    <AdminLink to={`traders/${t.id}`}>
                      Edit this profile
                    </AdminLink>
                  </article>
                ))
              ) : (
                <p>No published traders.</p>
              )}
            </div>
          </Panel>
        ))}
      </div>
    </>
  );
}
