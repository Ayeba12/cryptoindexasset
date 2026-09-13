"use client";
import { Button } from "@/components/ui/button";
import { Panel } from "@/components/dashboard/panel";
import { PageHeading } from "@/components/dashboard/page-heading";
import { ADMIN_SECTIONS } from "@/lib/admin/model";
import { useAdmin } from "./provider";
import { useAdminRoute } from "./shell";
import { Overview } from "./overview";
import { UserList, UserDetail } from "./users";
import { TraderList, TraderEditor, PublicationPreview } from "./traders";
import {
  RequestQueue,
  VerificationQueue,
  Notifications,
  Signals,
  DepositWallets,
  AuditHistory,
} from "./operations";
import { Notice, Missing } from "./shared";
import { AccountSettings } from "./account-settings";
import { SupportQueue } from "./support";

export function AdminScreen() {
  const { state, fault, setFault, revision } = useAdmin();
  const { path } = useAdminRoute();
  const [section, id] = path.split("/");
  const title =
    ADMIN_SECTIONS.find(([slug]) => slug === section)?.[1] ?? "Administration";
  if (!state)
    return (
      <>
        <PageHeading title={title} subtitle="Administrator workspace" />
        <Panel title="Live service not connected">
          <p className="ca-body">
            This screen is ready for backend integration. No customer records
            have been loaded and no financial actions are enabled.
          </p>
          <p className="ca-help mt-4">
            Trader publication, financial adjustments, approvals and private
            uploads require authorized services and staging verification before
            use.
          </p>
        </Panel>
      </>
    );
  if (fault === "read-error")
    return (
      <>
        <PageHeading title={title} />
        <Notice error>
          This simulated read failed. No records are shown as zero and no data
          was changed.
        </Notice>
        <Button
          className="mt-4"
          variant="outline"
          onClick={() => setFault("none")}
        >
          Retry preview read
        </Button>
      </>
    );
  if (fault === "empty")
    return (
      <>
        <PageHeading title={title} />
        <Panel title="No records to display">
          <p className="ca-body">
            This is the empty-state preview for this section.
          </p>
          <Button
            className="mt-4"
            variant="outline"
            onClick={() => setFault("none")}
          >
            Restore preview records
          </Button>
        </Panel>
      </>
    );
  let content;
  switch (section) {
    case "":
      content = <Overview />;
      break;
    case "users":
      content = id ? <UserDetail key={id} id={id} /> : <UserList />;
      break;
    case "traders":
      content =
        id === "publication" ? (
          <PublicationPreview />
        ) : id ? (
          <TraderEditor key={id} id={id} />
        ) : (
          <TraderList />
        );
      break;
    case "deposits":
      content = <RequestQueue key="deposit" kind="Deposit" />;
      break;
    case "withdrawals":
      content = <RequestQueue key="withdrawal" kind="Withdrawal" />;
      break;
    case "verification":
      content = <VerificationQueue />;
      break;
    case "notifications":
      content = <Notifications />;
      break;
    case "support":
      content = <SupportQueue />;
      break;
    case "signals":
      content = <Signals />;
      break;
    case "settings":
      content = <DepositWallets />;
      break;
    case "audit":
      content = <AuditHistory />;
      break;
    case "account":
      content = <AccountSettings page={id || "profile"} />;
      break;
    default:
      content = <Missing entity="Page" />;
  }
  return (
    <>
      {fault === "denied" && (
        <div className="mb-6">
          <Notice tone="warning">
            Read-only preview role. You can inspect records but cannot save
            changes.
          </Notice>
        </div>
      )}
      <div key={revision}>{content}</div>
    </>
  );
}
