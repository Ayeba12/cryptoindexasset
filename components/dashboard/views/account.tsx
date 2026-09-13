"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import type {
  MfaEnrollment,
  ProfileInput,
  ProfileView,
  SecurityView,
  VerificationFileInput,
  VerificationView,
} from "@/lib/dashboard/contracts";
import { formatDateTime } from "@/lib/dashboard/format";
import { SETTINGS_TABS } from "@/lib/dashboard/navigation";
import type { ScreenData } from "@/lib/dashboard/screen-data";
import { useDashboardActions, useDashboardPathname } from "../actions-context";
import { DashboardLink } from "../dashboard-link";
import { PageHeading } from "../page-heading";
import { KeyValueList, Panel, PanelRow, PanelRows } from "../panel";
import { QrCode } from "../qr";
import { StatusBadge } from "../status-badge";
import {
  ActionLink,
  Choice,
  Pager,
  Region,
  useFilters,
  useOperation,
} from "./shared";

export function Notifications({
  data,
  retry,
}: {
  data: ScreenData;
  retry?: () => void;
}) {
  const { actions } = useDashboardActions();
  const op = useOperation();
  const { q, change } = useFilters();
  return (
    <>
      <PageHeading
        title="Notifications"
        subtitle="Account updates and requests that need your attention."
        actions={
          <Button
            variant="outline"
            size="lg"
            disabled={
              op.busy || !data.capabilities.notificationsMarkRead.available
            }
            onClick={() =>
              void op.run(
                () => actions.markAllNotificationsRead(),
                "All notifications marked as read.",
              )
            }
          >
            Mark all as read
          </Button>
        }
      />
      <div className="ca-sections">
        <div className="max-w-[12rem]">
          <Choice
            label="Show"
            value={q?.get("filter") ?? "all"}
            options={[
              { value: "all", label: "All notifications" },
              { value: "unread", label: "Unread" },
            ]}
            onChange={(filter) => change({ filter })}
          />
        </div>
        {op.feedback}
        {!data.capabilities.notificationsMarkRead.available && (
          <p className="ca-help">
            {data.capabilities.notificationsMarkRead.reason}
          </p>
        )}
        <Panel title="Inbox">
          <Region name="Notifications" value={data.notifications} retry={retry}>
            {(page) => (
              <>
                <PanelRows>
                  {page.items.map((item) => (
                    <PanelRow key={item.id}>
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="ca-h3">{item.title}</h3>
                        {!item.read && (
                          <span className="ca-label rounded bg-secondary px-2 py-1">
                            Unread
                          </span>
                        )}
                      </div>
                      <p className="ca-body">{item.message}</p>
                      <p className="ca-help">
                        {formatDateTime(item.createdAt)}
                      </p>
                      <div className="flex flex-wrap gap-2 mt-2">
                        {item.href && (
                          <ActionLink href={item.href}>
                            View{" "}
                            {item.kind === "system" ? "details" : item.kind}
                          </ActionLink>
                        )}
                        {!item.read && (
                          <Button
                            size="lg"
                            variant="ghost"
                            disabled={
                              op.busy ||
                              !data.capabilities.notificationsMarkRead.available
                            }
                            onClick={() =>
                              void op.run(
                                () => actions.markNotificationRead(item.id),
                                "Notification marked as read.",
                              )
                            }
                          >
                            Mark as read
                          </Button>
                        )}
                      </div>
                    </PanelRow>
                  ))}
                </PanelRows>
                {!page.items.length && (
                  <p className="ca-body">No notifications match this filter.</p>
                )}
                <Pager
                  page={page.page}
                  hasMore={page.hasMore}
                  total={page.total}
                />
              </>
            )}
          </Region>
        </Panel>
      </div>
    </>
  );
}

function ProfileForm({
  profile,
  data,
}: {
  profile: ProfileView;
  data: ScreenData;
}) {
  const { actions } = useDashboardActions();
  const op = useOperation();
  const [form, setForm] = useState({
    fullName: profile.fullName ?? "",
    phone: profile.phone ?? "",
    country: profile.country ?? "",
  });
  return (
    <Panel
      title="Personal details"
      description="Your email is managed through authentication and cannot be changed here."
    >
      <form
        className="ca-touch flex max-w-[32rem] flex-col gap-4"
        onSubmit={(e) => {
          e.preventDefault();
          const input: ProfileInput = {};
          for (const key of profile.editable) input[key] = form[key];
          void op.run(() => actions.saveProfile(input), "Profile saved.");
        }}
      >
        <div className="flex flex-col gap-2">
          <Label htmlFor="profile-email">Email</Label>
          <Input
            id="profile-email"
            value={profile.email}
            readOnly
            type="email"
          />
        </div>
        {(
          [
            { key: "fullName", label: "Full name", autoComplete: "name" },
            { key: "phone", label: "Phone", autoComplete: "tel" },
            { key: "country", label: "Country", autoComplete: "country-name" },
          ] as const
        ).map((item) => (
          <div key={item.key} className="flex flex-col gap-2">
            <Label htmlFor={`profile-${item.key}`}>{item.label}</Label>
            <Input
              id={`profile-${item.key}`}
              type={item.key === "phone" ? "tel" : "text"}
              autoComplete={item.autoComplete}
              value={form[item.key]}
              readOnly={!profile.editable.includes(item.key)}
              onChange={(e) => setForm({ ...form, [item.key]: e.target.value })}
              aria-invalid={Boolean(op.fieldErrors[item.key])}
              aria-describedby={
                op.fieldErrors[item.key] ? op.errorId : undefined
              }
            />
          </div>
        ))}
        <p className="ca-help">
          Member since {formatDateTime(profile.memberSince)}
        </p>
        <Button
          disabled={op.busy || !data.capabilities.profileSave.available}
          type="submit"
        >
          {op.busy ? "Saving…" : "Save changes"}
        </Button>
        {!data.capabilities.profileSave.available && (
          <p className="ca-help">{data.capabilities.profileSave.reason}</p>
        )}
        {op.feedback}
      </form>
    </Panel>
  );
}

function Security({
  security,
  data,
}: {
  security: SecurityView;
  data: ScreenData;
}) {
  const { actions } = useDashboardActions();
  const op = useOperation();
  const passwordOp = useOperation();
  const [enrollment, setEnrollment] = useState<MfaEnrollment | null>(null);
  const [code, setCode] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  return (
    <div className="ca-sections">
      <Panel
        title="Two-factor authentication"
        action={<StatusBadge status={security.mfa.state} domain="mfa" />}
      >
        <p className="ca-body">
          Use an authenticator app to add a second sign-in check. Scanning a QR
          code alone does not enable protection.
        </p>
        {security.mfa.state !== "enabled" && !enrollment && (
          <Button
            size="lg"
            className="self-start"
            disabled={op.busy || !data.capabilities.mfaEnrollment.available}
            onClick={() =>
              void op.run(
                () => actions.startMfaEnrollment(),
                "Setup started. Verify a code to enable two-factor authentication.",
                setEnrollment,
              )
            }
          >
            Set up authenticator
          </Button>
        )}
        {security.mfa.state === "enabled" && (
          <p className="ca-help">
            Confirmed {formatDateTime(security.mfa.verifiedAt ?? null)}. Contact
            support if you need to recover access; do not share authenticator
            codes.
          </p>
        )}
        {!data.capabilities.mfaEnrollment.available && (
          <p className="ca-help">{data.capabilities.mfaEnrollment.reason}</p>
        )}
        {enrollment && (
          <form
            className="ca-touch flex max-w-[32rem] flex-col items-start gap-4"
            onSubmit={(e) => {
              e.preventDefault();
              void op.run(
                () => actions.verifyMfaEnrollment(enrollment.factorId, code),
                "Two-factor authentication confirmed.",
                (status) => {
                  if (status.state === "enabled") {
                    setEnrollment(null);
                    setCode("");
                  }
                },
              );
            }}
          >
            <QrCode
              value={`otpauth://totp/${encodeURIComponent(enrollment.issuer)}?secret=${encodeURIComponent(enrollment.secret)}&issuer=${encodeURIComponent(enrollment.issuer)}`}
              label="Authenticator enrollment QR code. Keep this secret private."
            />
            <p className="ca-help">Manual setup key. Keep it private.</p>
            <code className="ca-id select-all">{enrollment.secret}</code>
            <Label htmlFor="mfa-code">Six-digit authenticator code</Label>
            <Input
              id="mfa-code"
              required
              inputMode="numeric"
              autoComplete="one-time-code"
              pattern="[0-9]{6}"
              maxLength={6}
              value={code}
              onChange={(e) => setCode(e.target.value)}
              aria-invalid={Boolean(op.fieldErrors.code)}
              aria-describedby={op.fieldErrors.code ? op.errorId : undefined}
            />
            <Button type="submit" disabled={op.busy}>
              Verify and enable
            </Button>
          </form>
        )}
        {op.feedback}
      </Panel>
      <Panel title="Change password">
        <form
          className="ca-touch flex max-w-[32rem] flex-col gap-4"
          onSubmit={(e) => {
            e.preventDefault();
            if (newPassword !== confirm) return;
            void passwordOp.run(
              () => actions.changePassword({ currentPassword, newPassword }),
              "Password changed.",
              () => {
                setCurrentPassword("");
                setNewPassword("");
                setConfirm("");
              },
            );
          }}
        >
          <Label htmlFor="password-current">Current password</Label>
          <Input
            id="password-current"
            type="password"
            required
            autoComplete="current-password"
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
          />
          <Label htmlFor="password-new">New password</Label>
          <Input
            id="password-new"
            type="password"
            required
            minLength={8}
            autoComplete="new-password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            aria-invalid={Boolean(passwordOp.fieldErrors.newPassword)}
            aria-describedby={
              passwordOp.fieldErrors.newPassword
                ? passwordOp.errorId
                : undefined
            }
          />
          <Label htmlFor="password-confirm">Confirm new password</Label>
          <Input
            id="password-confirm"
            type="password"
            required
            autoComplete="new-password"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            aria-invalid={Boolean(confirm && confirm !== newPassword)}
            aria-describedby={
              confirm && confirm !== newPassword
                ? "password-mismatch"
                : undefined
            }
          />
          {confirm && confirm !== newPassword && (
            <p
              id="password-mismatch"
              role="alert"
              className="ca-help text-destructive"
            >
              Passwords do not match.
            </p>
          )}
          <Button
            type="submit"
            disabled={
              passwordOp.busy ||
              !security.password.changeAvailable ||
              newPassword !== confirm ||
              !data.capabilities.passwordChange.available
            }
          >
            Change password
          </Button>
          {!security.password.changeAvailable && (
            <p className="ca-help">{security.password.reason}</p>
          )}
          {passwordOp.feedback}
        </form>
      </Panel>
      <Panel title="Sessions">
        {security.sessions ? (
          <PanelRows>
            {security.sessions.map((session) => (
              <PanelRow key={session.id}>
                <p className="ca-body">
                  {session.device}
                  {session.current && " · Current session"}
                </p>
                <p className="ca-help">
                  Last active {formatDateTime(session.lastActive)}
                </p>
              </PanelRow>
            ))}
          </PanelRows>
        ) : (
          <p className="ca-body">
            {security.sessionsReason ?? "Session history is not connected."}
          </p>
        )}
      </Panel>
    </div>
  );
}

function Verification({
  verification,
  data,
}: {
  verification: VerificationView;
  data: ScreenData;
}) {
  const { actions, mode } = useDashboardActions();
  const op = useOperation();
  const [documentType, setDocumentType] = useState(
    verification.documentTypes[0] ?? "",
  );
  const [files, setFiles] = useState<VerificationFileInput[]>([]);
  const [validation, setValidation] = useState("");
  // The current action contract carries file metadata, not document bytes. Never pretend that is a live upload.
  const canSimulate =
    mode === "preview" &&
    data.capabilities.kycUpload.available &&
    Boolean(verification.uploadRules) &&
    verification.state !== "verified" &&
    verification.state !== "in-review";
  return (
    <Panel
      title="Identity verification"
      action={<StatusBadge status={verification.state} domain="verification" />}
    >
      <p className="ca-body">
        {verification.message ??
          "Submit identity documents only through a supported, secure upload service."}
      </p>
      <p className="ca-help">{verification.retentionNotice}</p>
      <KeyValueList
        items={[
          {
            label: "Submitted",
            value: formatDateTime(verification.submittedAt),
          },
          { label: "Reviewed", value: formatDateTime(verification.reviewedAt) },
        ]}
      />
      {canSimulate ? (
        <form
          className="ca-touch flex max-w-[32rem] flex-col gap-4"
          onSubmit={(e) => {
            e.preventDefault();
            if (!files.length || validation) return;
            void op.run(
              () => actions.submitVerification({ documentType, files }),
              "Document metadata submitted for simulated review.",
            );
          }}
        >
          <Choice
            label="Document type"
            value={documentType}
            onChange={setDocumentType}
            options={verification.documentTypes.map((value) => ({
              value,
              label: value,
            }))}
          />
          <p className="ca-help">
            Preview only: no document contents are uploaded. Use test files, not
            real identity documents. Allowed types:{" "}
            {verification.uploadRules?.acceptedTypes.join(", ")}. Limit:{" "}
            {(verification.uploadRules?.maxBytes ?? 0) / 1024 / 1024} MB per
            file.
          </p>
          {(["front", "back"] as const).map((side) => (
            <div key={side} className="flex flex-col gap-2">
              <Label htmlFor={`verification-${side}`}>
                Document {side}
                {side === "back" && " (if applicable)"}
              </Label>
              <Input
                id={`verification-${side}`}
                type="file"
                required={side === "front"}
                accept={verification.uploadRules?.acceptedTypes.join(",")}
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  const next = files.filter((item) => item.side !== side);
                  if (file)
                    next.push({
                      side,
                      fileName: file.name,
                      contentType: file.type,
                      sizeBytes: file.size,
                    });
                  setFiles(next);
                  setValidation(
                    next.some(
                      (item) =>
                        item.sizeBytes >
                          (verification.uploadRules?.maxBytes ?? 0) ||
                        !verification.uploadRules?.acceptedTypes.includes(
                          item.contentType,
                        ),
                    )
                      ? "Choose files within the stated type and size limits."
                      : "",
                  );
                }}
                aria-invalid={Boolean(validation)}
                aria-describedby={validation ? "verification-error" : undefined}
              />
            </div>
          ))}
          {validation && (
            <p
              id="verification-error"
              role="alert"
              className="ca-help text-destructive"
            >
              {validation}
            </p>
          )}
          <Button
            type="submit"
            disabled={op.busy || !files.length || Boolean(validation)}
          >
            Simulate document submission
          </Button>
        </form>
      ) : (
        verification.state !== "verified" &&
        verification.state !== "in-review" && (
          <p className="ca-body">
            {data.capabilities.kycUpload.reason ??
              "Secure document uploads are not connected. Contact support for the approved verification process."}
          </p>
        )
      )}
      <PanelRows>
        {verification.documents.map((document) => (
          <PanelRow key={document.id}>
            <p className="ca-body">
              {document.type} · {document.side}
            </p>
            <p className="ca-help">
              {document.fileName} · {formatDateTime(document.uploadedAt)}
            </p>
          </PanelRow>
        ))}
      </PanelRows>
      {op.feedback}
    </Panel>
  );
}

export function Settings({
  data,
  section,
  retry,
}: {
  data: ScreenData;
  section: "profile" | "security" | "verification";
  retry?: () => void;
}) {
  const path = useDashboardPathname();
  return (
    <>
      <PageHeading
        title="Settings"
        subtitle="Personal details, sign-in security, and identity verification."
      />
      <div className="ca-sections">
        <nav aria-label="Settings" className="flex flex-wrap gap-2">
          {SETTINGS_TABS.map((tab) => (
            <Button
              asChild
              variant={path === tab.href ? "secondary" : "ghost"}
              size="lg"
              key={tab.id}
            >
              <DashboardLink
                href={tab.href}
                aria-current={path === tab.href ? "page" : undefined}
              >
                {tab.label}
              </DashboardLink>
            </Button>
          ))}
        </nav>
        {section === "profile" && (
          <Region name="Profile" value={data.profile} retry={retry}>
            {(profile) => <ProfileForm profile={profile} data={data} />}
          </Region>
        )}
        {section === "security" && (
          <Region name="Security" value={data.security} retry={retry}>
            {(security) => <Security security={security} data={data} />}
          </Region>
        )}
        {section === "verification" && (
          <Region name="Verification" value={data.verification} retry={retry}>
            {(verification) => (
              <Verification verification={verification} data={data} />
            )}
          </Region>
        )}
      </div>
    </>
  );
}

export function Help() {
  return (
    <>
      <PageHeading
        title="Help"
        subtitle="Understand account activity and find the right next step."
      />
      <div className="ca-form-split">
        <Panel title="Common questions">
          <Accordion type="single" collapsible>
            {[
              {
                title: "Where is my deposit?",
                text: "Check the chosen network and transaction hash in Activity. Network confirmations and account approval are separate. Contact support with the reference if you need help; never send a private key or recovery phrase.",
              },
              {
                title: "What does pending review mean?",
                text: "Your request has been received but has not completed review. Approval is not confirmation of blockchain settlement or receipt by your bank.",
              },
              {
                title: "Why is part of my balance reserved?",
                text: "Reserved funds are committed to pending requests or allocations where the ledger supports holds. Available and reserved values are shown only when the service can report them.",
              },
              {
                title: "Does copy trading guarantee returns?",
                text: "No. Markets can move against a strategy and you can lose capital. Reported accuracy is not an expected return. Read the strategy, fee basis, and execution mode before allocating.",
              },
              {
                title: "How do I secure my account?",
                text: "Use a unique password and complete authenticator verification in Security. Support will never need your password, authenticator code, private key, or recovery phrase.",
              },
            ].map((item) => (
              <AccordionItem key={item.title} value={item.title}>
                <AccordionTrigger>{item.title}</AccordionTrigger>
                <AccordionContent>{item.text}</AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </Panel>
        <Panel title="Contact support">
          <p className="ca-body">
            Include the relevant transaction or allocation reference. Keep
            passwords, codes, and wallet recovery phrases private.
          </p>
          <ActionLink href="/contact">Open contact page</ActionLink>
          <ActionLink href="/dashboard/activity">
            Find a transaction reference
          </ActionLink>
          <ActionLink href="/dashboard/settings/security">
            Security settings
          </ActionLink>
        </Panel>
      </div>
    </>
  );
}
