"use client";
import { CoinIdentity } from "@/components/dashboard/coin-identity";
import { Panel, PanelRow, PanelRows } from "@/components/dashboard/panel";
import { PageHeading } from "@/components/dashboard/page-heading";
import { useAdmin } from "./provider";
import { AdminLink, Status, Records } from "./shared";

export function Overview() {
  const { state } = useAdmin();
  const s = state!;
  const deposits = s.requests.filter(
    (r) => r.kind === "Deposit" && r.status === "Pending review",
  );
  const withdrawals = s.requests.filter(
    (r) => r.kind === "Withdrawal" && r.status === "Pending review",
  );
  const stats = [
    {
      label: "Customer accounts",
      value: s.users.length,
      help: `${s.users.filter((u) => u.status === "Active").length} active`,
      path: "users",
    },
    {
      label: "Deposits to review",
      value: deposits.length,
      help: "Awaiting a review decision",
      path: "deposits",
    },
    {
      label: "Withdrawals to review",
      value: withdrawals.length,
      help: "Approval is not settlement",
      path: "withdrawals",
    },
    {
      label: "Published traders",
      value: s.traders.filter((t) => t.status === "Published").length,
      help: `${s.traders.filter((t) => t.status === "Draft").length} draft profiles`,
      path: "traders",
    },
  ];
  return (
    <>
      <PageHeading
        title="Overview"
        subtitle="Accounts, review queues and recent administrative activity."
        actions={
          <AdminLink to="withdrawals" primary>
            Review withdrawals
          </AdminLink>
        }
      />
      <div className="ca-sections">
        <div className="admin-stats">
          {stats.map((item) => (
            <Panel key={item.label} title={item.label} summary>
              <p className="ca-value-main mb-2">{item.value}</p>
              <p className="ca-help mb-4">{item.help}</p>
              <AdminLink to={item.path}>View details</AdminLink>
            </Panel>
          ))}
        </div>
        <div className="admin-split">
          <Panel
            title="Needs attention"
            description="Work through pending requests individually. Each decision leaves a record."
          >
            <Records
              title="Pending requests"
              headers={["Request", "Customer", "Amount", "Queue"]}
              rows={[...withdrawals, ...deposits].slice(0, 5).map((r) => ({
                id: r.id,
                cells: [
                  <div key="type">
                    <p>{r.kind}</p>
                    <p className="ca-help">{r.id}</p>
                  </div>,
                  s.users.find((u) => u.id === r.userId)?.name ?? r.userId,
                  <span key="amount" className="admin-number">
                    <CoinIdentity currency={r.currency}>
                      {r.amount} {r.currency}
                    </CoinIdentity>
                  </span>,
                  <AdminLink
                    key="link"
                    to={r.kind === "Deposit" ? "deposits" : "withdrawals"}
                  >
                    Open queue
                  </AdminLink>,
                ],
              }))}
            />
          </Panel>
          <Panel title="Workspace checks">
            <PanelRows>
              <PanelRow trailing={<Status>Review</Status>}>
                <h3 className="ca-h3">Identity submissions</h3>
                <p className="ca-help">
                  {
                    s.users.filter((u) => u.verification === "Pending review")
                      .length
                  }{" "}
                  waiting for a decision
                </p>
              </PanelRow>
              <PanelRow>
                <h3 className="ca-h3">Deposit networks</h3>
                <p className="ca-help">
                  {s.addresses.filter((a) => !a.enabled).length} networks not
                  enabled
                </p>
              </PanelRow>
              <PanelRow>
                <h3 className="ca-h3">Financial services</h3>
                <p className="ca-help">
                  Live adjustments and settlement are not connected.
                </p>
              </PanelRow>
            </PanelRows>
            <div className="mt-4">
              <AdminLink to="verification">Review verification</AdminLink>
            </div>
          </Panel>
        </div>
        <Panel
          title="Recent admin activity"
          action={<AdminLink to="audit">Full history</AdminLink>}
        >
          <PanelRows>
            {s.audit.slice(0, 5).map((a) => (
              <PanelRow
                key={a.id}
                trailing={
                  <span className="ca-help">{a.at.slice(11, 16)} UTC</span>
                }
              >
                <h3 className="ca-h3">{a.action}</h3>
                <p className="ca-help">
                  {a.target} · {a.reason}
                </p>
              </PanelRow>
            ))}
          </PanelRows>
        </Panel>
      </div>
    </>
  );
}
