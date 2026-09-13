"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useTheme } from "next-themes";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
  Panel,
  KeyValueList,
  PanelRow,
  PanelRows,
} from "@/components/dashboard/panel";
import { PageHeading } from "@/components/dashboard/page-heading";
import { ConfirmDialog } from "@/components/dashboard/confirm-dialog";
import { Choice } from "@/components/dashboard/views/shared";
import { ACCOUNT_PAGES, profileErrors } from "@/lib/admin/account";
import { record } from "@/lib/admin/model";
import { useAdmin } from "./provider";
import { useAdminRoute } from "./shell";
import { AdminLink, Field, Notice, Status, Missing } from "./shared";

export function AccountSettings({ page = "profile" }: { page?: string }) {
  const { href } = useAdminRoute();
  const { state, revision } = useAdmin();
  const current = ACCOUNT_PAGES.find(([slug]) => slug === page);
  if (!current) return <Missing entity="Settings page" />;
  return (
    <>
      <PageHeading
        title="Account settings"
        subtitle="Your administrator profile, security and workspace preferences."
      />
      <nav aria-label="Account settings pages" className="admin-actions mb-6">
        {ACCOUNT_PAGES.map(([slug, label]) => (
          <Button
            key={slug}
            asChild
            variant={page === slug ? "secondary" : "ghost"}
          >
            <Link
              href={href(`account/${slug}`)}
              aria-current={page === slug ? "page" : undefined}
            >
              {label}
            </Link>
          </Button>
        ))}
      </nav>
      {!state ? (
        <Panel title={current[1]}>
          <p className="ca-body">
            Live administrator account settings are not connected. No profile or
            security information has been loaded.
          </p>
        </Panel>
      ) : (
        <div key={`${page}-${revision}`}>
          {page === "profile" ? (
            <Profile />
          ) : page === "security" ? (
            <Security />
          ) : page === "preferences" ? (
            <Preferences />
          ) : (
            <Help />
          )}
        </div>
      )}
    </>
  );
}
function Profile() {
  const { state, commit, fault } = useAdmin();
  const account = state!.account;
  const [draft, setDraft] = useState({
    name: account.name,
    phone: account.phone,
    jobTitle: account.jobTitle,
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [message, setMessage] = useState("");
  const [failure, setFailure] = useState("");
  return (
    <div className="admin-split">
      <Panel
        title="Personal details"
        description="Use fictional details while reviewing. Saved changes last until the preview is reset or reloaded."
      >
        <form
          className="space-y-6"
          noValidate
          onSubmit={(e) => {
            e.preventDefault();
            setMessage("");
            setFailure("");
            const issues = profileErrors(draft);
            setErrors(issues);
            if (Object.keys(issues).length) {
              setFailure("Check the highlighted fields.");
              return;
            }
            try {
              commit((current) => {
                Object.assign(current.account, {
                  name: draft.name.trim(),
                  phone: draft.phone.trim(),
                  jobTitle: draft.jobTitle.trim(),
                });
                record(
                  current,
                  "Admin profile updated",
                  "Preview administrator",
                  "Personal details changed in preview",
                  new Date().toISOString(),
                );
                return current;
              });
              setMessage(
                "Profile saved in this preview. Your account menu now shows the updated name.",
              );
            } catch (error) {
              setFailure(
                error instanceof Error
                  ? error.message
                  : "Could not save the profile.",
              );
            }
          }}
        >
          <Field
            label="Display name"
            required
            maxLength={100}
            value={draft.name}
            error={errors.name}
            onChange={(e) => setDraft({ ...draft, name: e.target.value })}
          />
          <Field
            label="Email address"
            type="email"
            value={account.email}
            readOnly
            hint="Changing a sign-in email requires a verified account flow. It cannot be changed here."
          />
          <div className="admin-form-grid">
            <Field
              label="Phone number"
              type="tel"
              maxLength={30}
              value={draft.phone}
              error={errors.phone}
              onChange={(e) => setDraft({ ...draft, phone: e.target.value })}
            />
            <Field
              label="Job title"
              maxLength={100}
              value={draft.jobTitle}
              error={errors.jobTitle}
              onChange={(e) => setDraft({ ...draft, jobTitle: e.target.value })}
            />
          </div>
          {failure && <Notice error>{failure}</Notice>}
          {message && <Notice tone="success">{message}</Notice>}
          <div className="admin-actions">
            <Button type="submit" disabled={fault === "denied"}>
              Save profile
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setDraft({
                  name: account.name,
                  phone: account.phone,
                  jobTitle: account.jobTitle,
                });
                setErrors({});
                setFailure("");
                setMessage("");
              }}
            >
              Discard edits
            </Button>
          </div>
          {fault === "denied" && (
            <p className="ca-help">
              The read-only preview role cannot save profile changes.
            </p>
          )}
        </form>
      </Panel>
      <Panel title="Administrator account">
        <KeyValueList
          items={[
            { label: "Account type", value: "Preview administrator" },
            { label: "Role", value: <Status>Administrator · demo</Status> },
            {
              label: "Access changes",
              value:
                "Roles and permissions cannot be edited from your profile.",
            },
          ]}
        />
        <div className="mt-6">
          <AdminLink to="account/security">Review security</AdminLink>
        </div>
      </Panel>
    </div>
  );
}
function Security() {
  const { state, commit, fault } = useAdmin();
  const enabled = state!.account.twoFactorDemo;
  const [review, setReview] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  return (
    <div className="ca-sections">
      <Notice>
        Security design preview. Do not enter real passwords or authentication
        codes. No account security settings are changed.
      </Notice>
      <Panel
        title="Two-factor authentication"
        description="Review how enrolled and not-enrolled states will appear."
      >
        <PanelRows>
          <PanelRow
            trailing={
              <Status>
                {enabled ? "Enrolled · demo" : "Not enrolled · demo"}
              </Status>
            }
          >
            <h3 className="ca-h3">Authenticator app</h3>
            <p className="ca-help">
              Live setup must verify a code before marking a factor enrolled.
            </p>
          </PanelRow>
        </PanelRows>
        <div className="admin-save">
          <Button
            variant="outline"
            disabled={fault === "denied"}
            onClick={() => {
              setError("");
              setReview(true);
            }}
          >
            Preview {enabled ? "removal" : "enrollment"}
          </Button>
        </div>
        {message && <Notice tone="success">{message}</Notice>}
      </Panel>
      <Panel
        title="Password"
        description="Password changes require the authenticated security service. These inputs are disabled in the design preview."
      >
        <div className="admin-form-grid">
          <Field
            label="Current password"
            type="password"
            autoComplete="off"
            disabled
          />
          <Field
            label="New password"
            type="password"
            autoComplete="off"
            disabled
          />
          <Field
            label="Confirm new password"
            type="password"
            autoComplete="off"
            disabled
          />
        </div>
        <div className="admin-save">
          <Button disabled>Update password</Button>
        </div>
      </Panel>
      <Panel
        title="Sessions"
        description="No session history has been fetched. Do not infer devices or locations from this preview."
      >
        <KeyValueList
          items={[
            { label: "Current session", value: "Not connected" },
            {
              label: "Other devices",
              value: "Unavailable until session management is connected",
            },
          ]}
        />
        <div className="admin-save">
          <Button variant="outline" disabled>
            Log out other devices
          </Button>
        </div>
      </Panel>
      <Panel title="Recovery and permissions">
        <p className="ca-body">
          Recovery codes, sensitive-action reauthentication and staff permission
          management need a verified server policy before they can be enabled.
        </p>
        <p className="ca-help mt-3">
          A profile edit or a preview security toggle never grants administrator
          privileges.
        </p>
      </Panel>
      <ConfirmDialog
        open={review}
        onOpenChange={setReview}
        title={`Preview authenticator ${enabled ? "removal" : "enrollment"}?`}
        description="This changes only the labelled demonstration state. It does not add or remove any real authentication factor."
        confirmLabel="Change demo state"
        onConfirm={() => {
          try {
            commit((current) => {
              current.account.twoFactorDemo = !current.account.twoFactorDemo;
              return current;
            });
            setReview(false);
            setMessage(
              "Demo state updated. Real two-factor authentication is unchanged.",
            );
          } catch (e) {
            setError(
              e instanceof Error ? e.message : "Could not update the demo.",
            );
          }
        }}
      >
        {error && <Notice error>{error}</Notice>}
      </ConfirmDialog>
    </div>
  );
}
function Preferences() {
  const { state, commit, fault } = useAdmin();
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const [error, setError] = useState("");
  useEffect(() => setMounted(true), []);
  function update(change: {
    density?: "compact" | "comfortable";
    reviewAlerts?: boolean;
  }) {
    try {
      commit((current) => {
        Object.assign(current.account, change);
        return current;
      });
      setError("");
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "Preference could not be changed.",
      );
    }
  }
  return (
    <div className="ca-sections">
      <Panel
        title="Appearance"
        description="The theme is saved in this browser and shared with the customer dashboard. Public-page styling is unchanged."
      >
        <div className="admin-form-grid">
          <Choice
            label="Colour theme"
            value={mounted ? (theme ?? "system") : "system"}
            onChange={setTheme}
            options={["system", "light", "dark"].map((value) => ({
              value,
              label: value[0].toUpperCase() + value.slice(1),
            }))}
          />
          <Choice
            label="Table spacing"
            value={state!.account.density}
            disabled={fault === "denied"}
            onChange={(value) =>
              update({ density: value as "compact" | "comfortable" })
            }
            options={[
              { value: "compact", label: "Compact" },
              { value: "comfortable", label: "Comfortable" },
            ]}
          />
        </div>
        <p className="ca-help mt-4">
          Table spacing applies to admin tables for this preview session. Mobile
          touch targets remain large in either setting.
        </p>
      </Panel>
      <Panel
        title="Notification preferences"
        description="This stores a demo preference only. It does not subscribe you to real emails or change mandatory security notices."
      >
        <div className="flex justify-between items-center gap-6 py-3">
          <div>
            <Label htmlFor="admin-review-alerts">
              Review queue email alerts
            </Label>
            <p id="admin-review-alerts-help" className="ca-help mt-2">
              Deposits, withdrawals and verification awaiting review.
            </p>
          </div>
          <Switch
            id="admin-review-alerts"
            aria-describedby="admin-review-alerts-help"
            disabled={fault === "denied"}
            checked={state!.account.reviewAlerts}
            onCheckedChange={(value) => update({ reviewAlerts: value })}
          />
        </div>
      </Panel>
      {error && <Notice error>{error}</Notice>}
    </div>
  );
}
function Help() {
  return (
    <div className="ca-sections">
      <Panel
        title="Review both dashboards"
        description="Use these isolated previews to compare navigation, layout and account flows."
      >
        <div className="admin-actions">
          <AdminLink>Admin overview</AdminLink>
          <Button asChild variant="outline">
            <Link href="/design-preview/dashboard">
              Customer dashboard preview
            </Link>
          </Button>
        </div>
      </Panel>
      <Panel title="What works in this preview">
        <PanelRows>
          <PanelRow>
            <h3 className="ca-h3">Trader management</h3>
            <p className="ca-help">
              Create, edit, publish and archive fictional profiles. The
              publication preview shows both card views.
            </p>
          </PanelRow>
          <PanelRow>
            <h3 className="ca-h3">Wallet and request reviews</h3>
            <p className="ca-help">
              Test manual profit adjustments and decisions using fictional data.
              No real funds move.
            </p>
          </PanelRow>
          <PanelRow>
            <h3 className="ca-h3">Account settings</h3>
            <p className="ca-help">
              Edit your demo profile, compare security states, adjust theme and
              table spacing, and preview logout.
            </p>
          </PanelRow>
        </PanelRows>
      </Panel>
      <Panel title="Before live use">
        <p className="ca-body">
          Real trader publishing, uploads, wallet adjustments, approvals,
          administrator profile updates and security management still need
          backend integration and staging tests.
        </p>
      </Panel>
    </div>
  );
}
