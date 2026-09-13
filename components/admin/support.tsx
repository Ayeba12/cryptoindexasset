"use client";

import { useEffect, useState } from "react";
import { Panel, KeyValueList } from "@/components/dashboard/panel";
import { PageHeading } from "@/components/dashboard/page-heading";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  getSupportEnquiriesAction,
  updateSupportEnquiryStatusAction,
  type SupportEnquiry,
} from "@/lib/admin/support.server";
import { Notice, Records } from "./shared";

export function SupportQueue() {
  const [items, setItems] = useState<SupportEnquiry[]>([]);
  const [filter, setFilter] = useState<"all" | "Open" | "In progress" | "Resolved">("all");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [newStatus, setNewStatus] = useState<"Open" | "In progress" | "Resolved">("In progress");
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const fetchEnquiries = async () => {
    setLoading(true);
    try {
      const res = await getSupportEnquiriesAction();
      if (res.success) {
        setItems(res.enquiries);
      } else {
        setError(res.error || "Failed to load enquiries");
      }
    } catch {
      setError("Network error fetching support enquiries");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEnquiries();
  }, []);

  const selected = items.find((i) => i.id === selectedId || i.caseReference === selectedId);

  const filtered = items.filter((item) => {
    if (filter === "all") return true;
    return item.status === filter;
  });

  const counts = {
    all: items.length,
    open: items.filter((i) => i.status === "Open").length,
    inProgress: items.filter((i) => i.status === "In progress").length,
    resolved: items.filter((i) => i.status === "Resolved").length,
  };

  async function handleUpdateStatus() {
    if (!selected) return;
    setSubmitting(true);
    setError("");
    setMessage("");

    try {
      const res = await updateSupportEnquiryStatusAction(selected.caseReference, newStatus, notes);
      if (res.success) {
        setMessage(`Case ${selected.caseReference} updated to "${newStatus}".`);
        setItems((prev) =>
          prev.map((item) =>
            item.caseReference === selected.caseReference
              ? { ...item, status: newStatus, adminNotes: notes || item.adminNotes }
              : item
          )
        );
        setSelectedId(null);
        setNotes("");
      } else {
        setError(res.error || "Failed to update status");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error updating case");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <>
      <PageHeading
        title="Support Queue"
        subtitle="Manage public contact enquiries, compliance questions, and operational support tickets."
      />

      <div className="flex flex-wrap gap-2 mb-6" role="tablist" aria-label="Support status filter">
        <Button
          variant={filter === "all" ? "default" : "outline"}
          size="sm"
          onClick={() => setFilter("all")}
        >
          All enquiries ({counts.all})
        </Button>
        <Button
          variant={filter === "Open" ? "default" : "outline"}
          size="sm"
          onClick={() => setFilter("Open")}
        >
          Open ({counts.open})
        </Button>
        <Button
          variant={filter === "In progress" ? "default" : "outline"}
          size="sm"
          onClick={() => setFilter("In progress")}
        >
          In progress ({counts.inProgress})
        </Button>
        <Button
          variant={filter === "Resolved" ? "default" : "outline"}
          size="sm"
          onClick={() => setFilter("Resolved")}
        >
          Resolved ({counts.resolved})
        </Button>
      </div>

      {message && (
        <div className="mb-4">
          <Notice tone="success">{message}</Notice>
        </div>
      )}
      {error && (
        <div className="mb-4">
          <Notice error>{error}</Notice>
        </div>
      )}

      {selected ? (
        <Panel title={`Case Details: ${selected.caseReference}`}>
          <div className="space-y-6">
            <KeyValueList
              items={[
                { label: "Case Reference", value: selected.caseReference },
                { label: "Customer Name", value: selected.name },
                { label: "Email Address", value: selected.email },
                { label: "Topic", value: selected.topic },
                { label: "Client Reference", value: selected.reference || "None provided" },
                { label: "Status", value: selected.status },
                { label: "Received At", value: new Date(selected.createdAt).toLocaleString() },
                { label: "Admin Notes", value: selected.adminNotes || "None" },
              ]}
            />

            <div>
              <h4 className="text-sm font-semibold mb-2">Message Body</h4>
              <div className="p-4 rounded-md bg-muted/40 border text-sm whitespace-pre-wrap font-sans">
                {selected.message}
              </div>
            </div>

            <div className="border-t pt-4 space-y-4">
              <h4 className="text-sm font-semibold">Update Ticket Status</h4>
              <div className="flex gap-2">
                {(["Open", "In progress", "Resolved"] as const).map((s) => (
                  <Button
                    key={s}
                    variant={newStatus === s ? "default" : "outline"}
                    size="sm"
                    onClick={() => setNewStatus(s)}
                  >
                    {s}
                  </Button>
                ))}
              </div>

              <div className="space-y-2">
                <Label htmlFor="admin-support-notes">Internal Admin Notes</Label>
                <Textarea
                  id="admin-support-notes"
                  rows={3}
                  placeholder="Add resolution details or action items..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                />
              </div>

              <div className="flex gap-3">
                <Button
                  onClick={handleUpdateStatus}
                  disabled={submitting}
                  className="ca-button-primary"
                >
                  {submitting ? "Saving..." : "Update Status"}
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    setSelectedId(null);
                    setNotes("");
                  }}
                  disabled={submitting}
                >
                  Cancel
                </Button>
              </div>
            </div>
          </div>
        </Panel>
      ) : loading ? (
        <Panel title="Loading Support Queue">
          <p className="ca-body">Fetching recorded customer enquiries from database...</p>
        </Panel>
      ) : filtered.length === 0 ? (
        <Panel title="Support Queue Empty">
          <p className="ca-body">
            {filter === "all"
              ? "No contact enquiries have been recorded yet."
              : `No enquiries found with status "${filter}".`}
          </p>
        </Panel>
      ) : (
        <Panel title={`Enquiries (${filtered.length})`}>
          <Records
            title="Support inquiries"
            headers={["Case Ref", "Customer", "Topic", "Received", "Status", "Actions"]}
            rows={filtered.map((item) => ({
              id: item.id,
              cells: [
                <span key="ref" className="font-mono text-xs font-semibold">{item.caseReference}</span>,
                <div key="cust">
                  <div className="font-medium text-sm">{item.name}</div>
                  <div className="text-xs text-muted-foreground">{item.email}</div>
                </div>,
                <span key="top" className="text-xs">{item.topic}</span>,
                <span key="date" className="text-xs text-muted-foreground">
                  {new Date(item.createdAt).toLocaleDateString()}
                </span>,
                <Badge
                  key="stat"
                  variant={
                    item.status === "Resolved"
                      ? "default"
                      : item.status === "In progress"
                      ? "secondary"
                      : "outline"
                  }
                >
                  {item.status}
                </Badge>,
                <Button
                  key="act"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setSelectedId(item.caseReference);
                    setNewStatus(item.status);
                    setNotes(item.adminNotes || "");
                    setError("");
                    setMessage("");
                  }}
                >
                  Inspect
                </Button>,
              ],
            }))}
          />
        </Panel>
      )}
    </>
  );
}
