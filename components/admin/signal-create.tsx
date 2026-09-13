"use client";

import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Panel } from "@/components/dashboard/panel";
import { Choice } from "@/components/dashboard/views/shared";
import { CURRENCIES } from "@/lib/admin/model";
import {
  blankSignal,
  signalErrors,
  SIGNAL_DIRECTIONS,
  SIGNAL_TIMEFRAMES,
  type SignalDraft,
} from "@/lib/admin/signals";
import { createSignalAction } from "@/lib/admin/signals.server";
import { useAdmin } from "./provider";
import { record } from "@/lib/admin/model";
import { Field, Notice } from "./shared";

export function SignalCreate({
  onCreated,
}: {
  onCreated: (message: string) => void;
}) {
  const { commit, fault } = useAdmin();
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState(blankSignal);
  const [errors, setErrors] = useState<ReturnType<typeof signalErrors>>({});
  const [failure, setFailure] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const trigger = useRef<HTMLButtonElement>(null);
  const form = useRef<HTMLFormElement>(null);
  const feedback = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (open) form.current?.querySelector<HTMLInputElement>("input")?.focus();
  }, [open]);
  useEffect(() => {
    if (failure) feedback.current?.focus();
  }, [failure, errors]);
  const options = (values: readonly string[]) =>
    values.map((value) => ({ value, label: value }));
  function close() {
    setOpen(false);
    setDraft(blankSignal());
    setErrors({});
    setFailure("");
    setIsSubmitting(false);
    trigger.current?.focus();
  }
  return (
    <>
      <div>
        <Button
          ref={trigger}
          disabled={fault === "denied"}
          aria-expanded={open}
          aria-controls="admin-create-signal"
          onClick={() => (open ? close() : setOpen(true))}
        >
          {open ? "Cancel new signal" : "Add signal"}
        </Button>
        {fault === "denied" && (
          <p className="ca-help mt-2">Your preview role cannot add signals.</p>
        )}
      </div>
      <div id="admin-create-signal" hidden={!open}>
        {open && (
          <Panel
            title="New signal"
            description="Saved as hidden draft in database. Show it separately after review. Nothing is sent to customers and no trade executes."
          >
            <form
              ref={form}
              className="space-y-6"
              noValidate
              onSubmit={async (event) => {
                event.preventDefault();
                const nextErrors = signalErrors(draft);
                setErrors(nextErrors);
                if (Object.keys(nextErrors).length) {
                  setFailure(
                    "Check the highlighted fields before adding this signal.",
                  );
                  return;
                }
                try {
                  setIsSubmitting(true);
                  const res = await createSignalAction(draft);
                  if (!res.success) {
                    if (res.errors) setErrors(res.errors as any);
                    setFailure(res.error || "Could not create signal.");
                    setIsSubmitting(false);
                    return;
                  }
                  const created = res.signal!;
                  commit((state) => {
                    const idx = state.signals.findIndex((s) => s.id === created.id);
                    if (idx < 0) {
                      state.signals.unshift(created);
                    } else {
                      state.signals[idx] = created;
                    }
                    record(
                      state,
                      "Signal created",
                      created.id,
                      `Created signal draft for ${created.asset} (${created.direction})`,
                      new Date().toISOString(),
                    );
                    return state;
                  });
                  onCreated(
                    "Signal added as hidden draft in database. Review it before choosing Show signal.",
                  );
                  close();
                } catch (error) {
                  setFailure(
                    error instanceof Error
                      ? error.message
                      : "Could not add the signal. Your draft is unchanged.",
                  );
                } finally {
                  setIsSubmitting(false);
                }
              }}
            >
              {failure && (
                <div ref={feedback} tabIndex={-1}>
                  <Notice error>{failure}</Notice>
                </div>
              )}
              <Field
                label="Signal title"
                required
                maxLength={100}
                value={draft.title}
                error={errors.title}
                onChange={(e) => setDraft({ ...draft, title: e.target.value })}
              />
              <div className="grid gap-4 sm:grid-cols-3">
                <Choice
                  label="Asset"
                  value={draft.asset}
                  options={options(CURRENCIES)}
                  onChange={(asset) =>
                    setDraft({ ...draft, asset: asset as SignalDraft["asset"] })
                  }
                />
                <Choice
                  label="Direction"
                  value={draft.direction}
                  options={options(SIGNAL_DIRECTIONS)}
                  onChange={(direction) =>
                    setDraft({
                      ...draft,
                      direction: direction as SignalDraft["direction"],
                    })
                  }
                />
                <Choice
                  label="Timeframe"
                  value={draft.timeframe}
                  options={options(SIGNAL_TIMEFRAMES)}
                  onChange={(timeframe) =>
                    setDraft({
                      ...draft,
                      timeframe: timeframe as SignalDraft["timeframe"],
                    })
                  }
                />
              </div>
              <Field
                label="Analysis and risks"
                required
                multiline
                maxLength={1500}
                value={draft.analysis}
                error={errors.analysis}
                hint="Explain the conditions behind the signal and what could invalidate it. A signal is not a guaranteed return."
                onChange={(e) =>
                  setDraft({ ...draft, analysis: e.target.value })
                }
              />
              <Button type="submit" disabled={fault === "denied"}>
                Add hidden signal
              </Button>
            </form>
          </Panel>
        )}
      </div>
    </>
  );
}
