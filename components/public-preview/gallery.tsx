"use client";

import { useEffect, useRef, useState, type FormEvent, type ReactNode } from "react";
import Link from "next/link";
import { Accordion, AlertDialog, Switch, Tabs, Tooltip } from "radix-ui";
import { ArrowRightIcon, CaretDownIcon, CheckIcon, InfoIcon, WarningCircleIcon } from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Brand } from "@/components/public-site/brand";
import { PreviewDestination, usePreview } from "./frame";

function SampleSection({ id, title, description, children }: { id: string; title: string; description: string; children: ReactNode }) {
  return <section className="pp-sample-section" id={id} aria-labelledby={`${id}-title`}><div className="pp-sample-heading"><h2 className="pp-h3" id={`${id}-title`}>{title}</h2><p className="pp-small">{description}</p></div><div className="pp-sample-content">{children}</div></section>;
}

function FormSample() {
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [status, setStatus] = useState("");
  const summary = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (Object.keys(errors).length) summary.current?.focus();
  }, [errors]);
  function validate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const next: Record<string, string> = {};
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(data.get("email") ?? "").trim())) next["demo-email"] = "Enter an email address in the format name@example.com.";
    if (!data.get("topic")) next["demo-topic"] = "Choose a topic.";
    if (String(data.get("message") ?? "").trim().length < 10) next["demo-message"] = "Enter a message with at least 10 characters.";
    setErrors(next);
    setStatus(Object.keys(next).length ? "" : "Example validated. Nothing was sent or saved.");
  }
  return <form className="pp-form" onSubmit={validate} noValidate>
    <p className="pp-notice"><InfoIcon aria-hidden="true" size={20} /><span>Form demonstration. Use sample details; nothing is sent or saved.</span></p>
    {Object.keys(errors).length > 0 && <div className="pp-error-summary" ref={summary} tabIndex={-1} role="alert"><h3 className="pp-form-label">Check these fields</h3><ul>{Object.entries(errors).map(([id, message]) => <li key={id}><a href={`#${id}`} onClick={(event) => { event.preventDefault(); document.getElementById(id)?.focus(); }}>{message}</a></li>)}</ul></div>}
    <div className="pp-field"><label htmlFor="demo-email">Email address <span>(required)</span></label><Input className="pp-input" id="demo-email" name="email" type="email" autoComplete="off" placeholder="name@example.com" required aria-invalid={Boolean(errors["demo-email"])} aria-describedby={`demo-email-hint${errors["demo-email"] ? " demo-email-error" : ""}`} /><p id="demo-email-hint" className="pp-field-help">This is a local validation example, not a contact request.</p>{errors["demo-email"] && <p id="demo-email-error" className="pp-field-error">{errors["demo-email"]}</p>}</div>
    <div className="pp-field"><label htmlFor="demo-topic">Topic <span>(required)</span></label><select className="pp-input pp-select" id="demo-topic" name="topic" required defaultValue="" aria-invalid={Boolean(errors["demo-topic"])} aria-describedby={errors["demo-topic"] ? "demo-topic-error" : undefined}><option value="" disabled>Choose a topic</option><option value="account">Account information</option><option value="risk">Understanding risk</option><option value="fees">Fees and processes</option></select>{errors["demo-topic"] && <p id="demo-topic-error" className="pp-field-error">{errors["demo-topic"]}</p>}</div>
    <div className="pp-field"><label htmlFor="demo-message">Message <span>(required)</span></label><textarea className="pp-input pp-textarea" id="demo-message" name="message" required rows={4} maxLength={1000} placeholder="Write a sample question…" aria-invalid={Boolean(errors["demo-message"])} aria-describedby={`demo-message-hint${errors["demo-message"] ? " demo-message-error" : ""}`} /><p className="pp-field-help" id="demo-message-hint">10–1,000 characters. Do not enter passwords, wallet keys or account details.</p>{errors["demo-message"] && <p id="demo-message-error" className="pp-field-error">{errors["demo-message"]}</p>}</div>
    <Button type="submit" className="pp-button">Validate example<ArrowRightIcon aria-hidden="true" size={20} /></Button>
    <p className="pp-form-status pp-small" role="status">{status}</p>
  </form>;
}

function SelectionSamples() {
  const [motion, setMotion] = useState(false);
  const [resetNote, setResetNote] = useState("");
  const { portal } = usePreview();
  return <div className="pp-stack">
    <div className="pp-field"><label htmlFor="demo-disabled">Unavailable field</label><Input id="demo-disabled" className="pp-input" value="Not editable in this example" disabled aria-describedby="disabled-hint" /><p className="pp-field-help" id="disabled-hint">Disabled example; no information is required here.</p></div>
    <div className="pp-field"><label htmlFor="demo-readonly">Read-only field</label><Input id="demo-readonly" className="pp-input" value="Preview reference: CA-DEMO" readOnly /><p className="pp-field-help">Read-only text remains selectable.</p></div>
    <label className="pp-choice-row" htmlFor="demo-checkbox"><Checkbox className="pp-checkbox" id="demo-checkbox" /><span>Example optional preference <span className="pp-field-help">Unchecked by default; no consent is collected.</span></span></label>
    <fieldset className="pp-radio-group"><legend className="pp-form-label">Example reading format</legend><label className="pp-choice-row"><input type="radio" name="reading-format" value="summary" defaultChecked /><span>Summary</span></label><label className="pp-choice-row"><input type="radio" name="reading-format" value="full" /><span>Full explanation</span></label></fieldset>
    <div className="pp-choice-row"><Switch.Root className="pp-switch" id="demo-switch" checked={motion} onCheckedChange={setMotion} aria-describedby="switch-hint"><Switch.Thumb className="pp-switch-thumb" /></Switch.Root><label htmlFor="demo-switch">Example preference</label></div><p id="switch-hint" className="pp-field-help">{motion ? "On" : "Off"}. Demonstrates a switch; it does not change account settings.</p>
    <AlertDialog.Root><AlertDialog.Trigger asChild><Button variant="outline" className="pp-button">Reset example preference</Button></AlertDialog.Trigger>{portal && <AlertDialog.Portal container={portal}><AlertDialog.Overlay className="pp-overlay" /><AlertDialog.Content className="pp-dialog"><AlertDialog.Title className="pp-h3">Reset the example preference?</AlertDialog.Title><AlertDialog.Description className="pp-dialog-description">This turns off the demonstration switch. It does not affect a real account.</AlertDialog.Description><div className="pp-actions"><AlertDialog.Cancel asChild><Button className="pp-button" variant="outline">Keep preference</Button></AlertDialog.Cancel><AlertDialog.Action asChild><Button className="pp-button" onClick={() => { setMotion(false); setResetNote("Example preference reset. No account settings changed."); }}>Reset example</Button></AlertDialog.Action></div></AlertDialog.Content></AlertDialog.Portal>}</AlertDialog.Root>
    <p role="status" className="pp-small">{resetNote}</p>
  </div>;
}

function DisclosureSamples() {
  const { portal } = usePreview();
  return <div className="pp-stack">
    <Accordion.Root className="pp-accordion" type="multiple" defaultValue={["risk"]}>
      {[{ id: "risk", question: "Are returns guaranteed?", answer: "No. Crypto assets can lose value, and a trader’s previous results do not guarantee your outcome." }, { id: "withdrawal", question: "Is a request an immediate transfer?", answer: "No. Requests are reviewed. Check the withdrawal conditions and any applicable costs before you submit one." }].map(({ id, question, answer }) => <Accordion.Item value={id} className="pp-accordion-item" key={id}><Accordion.Header><Accordion.Trigger className="pp-accordion-trigger">{question}<CaretDownIcon size={20} aria-hidden="true" /></Accordion.Trigger></Accordion.Header><Accordion.Content className="pp-accordion-content"><p>{answer}</p></Accordion.Content></Accordion.Item>)}
    </Accordion.Root>
    <p className="pp-small">For the homepage, these two answers remain visible. Accordion is available for a longer FAQ page.</p>
    <Tabs.Root defaultValue="overview" className="pp-tabs"><Tabs.List className="pp-tab-list" aria-label="Example information panels"><Tabs.Trigger value="overview" className="pp-tab">Overview</Tabs.Trigger><Tabs.Trigger value="details" className="pp-tab">Details</Tabs.Trigger></Tabs.List><Tabs.Content value="overview" className="pp-tab-panel"><h3 className="pp-form-label">Overview example</h3><p>One selected panel, with keyboard arrow navigation between tabs.</p></Tabs.Content><Tabs.Content value="details" className="pp-tab-panel"><h3 className="pp-form-label">Details example</h3><p>The panel changes without moving focus or navigating away.</p></Tabs.Content></Tabs.Root>
    <div className="pp-actions"><PreviewDestination label="Example dialog" route="/example" className="pp-button" variant="outline">Open example dialog</PreviewDestination>
      <Tooltip.Provider delayDuration={300}><Tooltip.Root><Tooltip.Trigger asChild><Button variant="ghost" className="pp-icon-button" aria-label="About tooltips"><InfoIcon size={24} aria-hidden="true" /></Button></Tooltip.Trigger>{portal && <Tooltip.Portal container={portal}><Tooltip.Content className="pp-tooltip" sideOffset={8}>Helpful context, never essential instructions.<Tooltip.Arrow className="pp-tooltip-arrow" /></Tooltip.Content></Tooltip.Portal>}</Tooltip.Root></Tooltip.Provider>
    </div>
  </div>;
}

export function ComponentGallery() {
  const [busy, setBusy] = useState(false);
  const [buttonNote, setButtonNote] = useState("");
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => () => { if (timer.current) clearTimeout(timer.current); }, []);
  function runExample() {
    if (busy) return;
    setBusy(true);
    setButtonNote("Showing the loading state. No request is being sent.");
    timer.current = setTimeout(() => { setBusy(false); setButtonNote("Loading example finished. No request was sent."); }, 900);
  }
  return <main className="pp-shell pp-gallery" id="preview-main" tabIndex={-1}>
    <div className="pp-gallery-intro"><Brand /><p className="pp-eyebrow">Public portal / component review</p><h1 className="pp-inner-h1">One system.<br />Room to breathe.</h1><p className="pp-lead">The public-facing layer: generous type, a 4pt spacing grid, comfortable controls and clear states. Existing dashboard density stays unchanged.</p><Button asChild className="pp-button"><Link href="/design-preview/home">View the homepage<ArrowRightIcon aria-hidden="true" size={20} /></Link></Button></div>
    <nav className="pp-gallery-nav" aria-label="Component sections">{[["foundations", "Foundations"], ["actions", "Actions"], ["forms", "Forms"], ["disclosure", "Disclosure"], ["feedback", "Feedback"], ["data", "Tables"]].map(([id, label]) => <a href={`#${id}`} key={id}>{label}</a>)}</nav>

    <SampleSection id="foundations" title="Foundations" description="Existing brand fonts and semantic colours. Public type sizes change with the viewport.">
      <div className="pp-type-sample"><span className="pp-small">Display · Space Grotesk · 112 / 72 / 56</span><p className="pp-display">A clearer view.</p></div>
      <div className="pp-type-sample"><span className="pp-small">Section · Space Grotesk · 64 / 48 / 32</span><p className="pp-h2">Keep the details clear.</p></div>
      <div className="pp-type-sample"><span className="pp-small">Subheading · Space Grotesk · 28 / 24</span><p className="pp-h3">See balances by asset</p></div>
      <div className="pp-type-sample"><span className="pp-small">Body · Geist Mono · 16 / 24</span><p>Read how the account works, what it costs and which risks apply.</p></div>
      <ul className="pp-swatches">{[["Background", "background"], ["Foreground", "foreground"], ["Muted surface", "muted"], ["Primary action", "primary"], ["Boundary", "border"], ["Error", "destructive"]].map(([label, token]) => <li key={token}><span className="pp-swatch" style={{ background: `var(--${token})` }} /><span>{label}</span><code>{token}</code></li>)}</ul>
      <div className="pp-spacing" aria-label="Spacing tokens in pixels">{[4, 8, 12, 16, 24, 32, 48, 64].map((size) => <div key={size}><span style={{ width: size, height: 16 }} /><code>{size}px</code></div>)}</div>
    </SampleSection>

    <SampleSection id="actions" title="Actions and links" description="48px minimum buttons, 44px icon targets, 12px action gaps. Text can wrap without clipping.">
      <div className="pp-actions"><PreviewDestination className="pp-button" variant="default" route="/register" label="Create account">Create account</PreviewDestination><PreviewDestination className="pp-button" variant="outline" route="/how-it-works" label="How it works">See how it works</PreviewDestination><PreviewDestination route="/fees" label="Fees" arrow>Read about fees</PreviewDestination><Button className="pp-button" disabled aria-describedby="disabled-action-note">Unavailable</Button></div>
      <p id="disabled-action-note" className="pp-field-help">Disabled state example: this action is intentionally unavailable.</p>
      <div className="pp-actions"><Button className="pp-button" variant="outline" onClick={runExample} aria-disabled={busy} aria-busy={busy}>{busy ? <><span className="pp-spinner" aria-hidden="true" />Loading example…</> : "Preview loading state"}</Button><Button className="pp-icon-button" variant="outline" aria-label="Confirm example" onClick={() => setButtonNote("Example selected. No account action occurred.")}><CheckIcon size={20} aria-hidden="true" /></Button></div><p className="pp-small pp-form-status" role="status">{buttonNote}</p>
    </SampleSection>

    <SampleSection id="forms" title="Forms and selection" description="16px input text, associated labels and errors, 24px field spacing. Try submitting the empty form."><div className="pp-gallery-columns"><FormSample /><SelectionSamples /></div></SampleSection>
    <SampleSection id="disclosure" title="Disclosure and overlays" description="Radix behaviour, public spacing. Try Tab, arrow keys, Enter and Escape; dialogs return focus."><DisclosureSamples /></SampleSection>
    <SampleSection id="feedback" title="Feedback and content states" description="Meaning is written in text. Yellow does not mean a transfer succeeded.">
      <div className="pp-gallery-columns"><div className="pp-stack"><p className="pp-notice"><InfoIcon size={20} aria-hidden="true" /><span>Example information notice. Requests need review before a transfer can be completed.</span></p><p className="pp-notice pp-notice-error"><WarningCircleIcon size={20} aria-hidden="true" /><span>Example error: we couldn&apos;t load this information. Try again.</span></p><div className="pp-actions"><span className="pp-badge">Awaiting review</span><span className="pp-badge"><CheckIcon size={16} aria-hidden="true" />Example complete</span></div><p className="pp-small">Badges demonstrate states only; they are not account activity.</p></div><div className="pp-empty"><InfoIcon size={28} aria-hidden="true" /><h3 className="pp-h3">No example items</h3><p>Empty states explain what is missing and what can happen next.</p><a className="pp-text-link" href="#forms">Try the form example<ArrowRightIcon aria-hidden="true" size={20} /></a></div></div>
      <div className="pp-skeleton-sample"><p className="pp-small">Skeleton appearance example — no data is loading.</p><div aria-hidden="true" className="pp-skeleton-lines"><span /><span /><span /></div></div>
    </SampleSection>
    <SampleSection id="data" title="Tables and reading layouts" description="Semantic headers, wrapped cells and local scrolling only if real content needs it. No fabricated prices.">
      <div className="pp-table-wrap" role="region" aria-label="Example review checklist table" tabIndex={0}><table className="pp-table"><caption>Illustrative review checklist</caption><thead><tr><th scope="col">Topic</th><th scope="col">What to check</th><th scope="col">State</th></tr></thead><tbody>{[["Service", "How the account and request process work"], ["Costs", "Fees before funding or withdrawing"], ["Risk", "Market losses and access to funds"]].map(([topic, description]) => <tr key={topic}><th scope="row">{topic}</th><td>{description}</td><td><span className="pp-badge">Example</span></td></tr>)}</tbody></table></div>
    </SampleSection>
    <div className="pp-gallery-outro"><h2 className="pp-h3">Review the system in context</h2><p>The homepage brings the spacing, typography, cards and supplied imagery together.</p><Button asChild className="pp-button"><Link href="/design-preview/home">Open homepage preview<ArrowRightIcon aria-hidden="true" size={20} /></Link></Button></div>
  </main>;
}
