"use client";

import { useRef, useState, type FormEvent } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { submitContactEnquiryAction } from "@/lib/public/contact.server";

export function ContactForm() {
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [caseReference, setCaseReference] = useState<string | null>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const errorRef = useRef<HTMLParagraphElement>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitting) return;

    setError(null);
    setSubmitting(true);

    try {
      const formData = new FormData(event.currentTarget);
      const result = await submitContactEnquiryAction(formData);

      if (!result.success) {
        setError(result.error || "We could not submit your enquiry. Please check your information and try again.");
        requestAnimationFrame(() => errorRef.current?.focus());
      } else {
        setCaseReference(result.caseReference || "CIA-RECEIVED");
        formRef.current?.reset();
      }
    } catch {
      setError("A connection failure occurred while sending your enquiry. Please try again later.");
      requestAnimationFrame(() => errorRef.current?.focus());
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form ref={formRef} className="pp-contact-form" onSubmit={handleSubmit} aria-labelledby="contact-heading">
      <h2 id="contact-heading" className="pp-h3">Your enquiry</h2>

      {caseReference ? (
        <div className="pp-document-notice" role="status" aria-live="polite">
          <h3 className="pp-h3" style={{ marginBottom: "0.5rem" }}>Enquiry received</h3>
          <p>Your request has been recorded for review. Your case tracking reference is:</p>
          <p style={{ marginBlock: "0.75rem" }}>
            <strong style={{ fontFamily: "var(--font-mono, monospace)", fontSize: "1.125rem", letterSpacing: "0.05em" }}>
              {caseReference}
            </strong>
          </p>
          <p className="pp-small">Please retain this reference for any follow-up communication or escalation.</p>
          <div style={{ marginTop: "1rem" }}>
            <Button
              type="button"
              variant="outline"
              className="pp-button"
              onClick={() => {
                setCaseReference(null);
                setError(null);
              }}
            >
              Send another message
            </Button>
          </div>
        </div>
      ) : (
        <>
          {error && (
            <p className="pp-form-error" role="alert" tabIndex={-1} ref={errorRef} id="contact-error">
              {error}
            </p>
          )}

          {/* Honeypot field for bot spam prevention */}
          <div style={{ display: "none" }} aria-hidden="true">
            <label htmlFor="contact-website">Website</label>
            <input id="contact-website" name="website" type="text" tabIndex={-1} autoComplete="off" />
          </div>

          <fieldset disabled={submitting}>
            <legend className="pp-sr-only">Contact details and enquiry</legend>
            <div className="pp-field">
              <label htmlFor="contact-name">Your name</label>
              <Input
                className="pp-input"
                id="contact-name"
                name="name"
                autoComplete="name"
                required
                maxLength={100}
                aria-describedby={error ? "contact-error" : undefined}
              />
            </div>
            <div className="pp-field">
              <label htmlFor="contact-email">Email address</label>
              <Input
                className="pp-input"
                id="contact-email"
                name="email"
                type="email"
                autoComplete="email"
                required
                maxLength={120}
                aria-describedby={`contact-email-hint ${error ? "contact-error" : ""}`.trim()}
              />
              <p id="contact-email-hint" className="pp-small">Use an address where you can receive our reply.</p>
            </div>
            <div className="pp-field">
              <label htmlFor="contact-topic">What do you need help with?</label>
              <select
                className="pp-input"
                id="contact-topic"
                name="topic"
                defaultValue=""
                required
                aria-describedby={error ? "contact-error" : undefined}
              >
                <option value="" disabled>Choose a topic</option>
                {[
                  "Before I register",
                  "Fees and investment options",
                  "Deposit or withdrawal",
                  "Account access",
                  "Account security",
                  "Complaint",
                  "Something else",
                ].map((topic) => (
                  <option key={topic} value={topic}>{topic}</option>
                ))}
              </select>
            </div>
            <div className="pp-field">
              <label htmlFor="contact-reference">
                Transaction or request reference <span className="pp-small">optional</span>
              </label>
              <Input
                className="pp-input"
                id="contact-reference"
                name="reference"
                maxLength={64}
              />
            </div>
            <div className="pp-field">
              <label htmlFor="contact-message">Your message</label>
              <textarea
                className="pp-input pp-textarea"
                id="contact-message"
                name="message"
                required
                rows={5}
                minLength={10}
                maxLength={500}
                aria-describedby="contact-safety"
              />
            </div>
          </fieldset>

          <p className="pp-small" id="contact-safety">
            Never send passwords, private keys, recovery phrases or one-time security codes.
          </p>

          <Button
            className="pp-button"
            type="submit"
            disabled={submitting}
            aria-busy={submitting}
          >
            {submitting ? "Sending message..." : "Send message"}
          </Button>

          <p className="pp-small">
            Read the <Link href="/policy" prefetch={false}>privacy policy</Link> to understand how we handle support communications.
          </p>
        </>
      )}
    </form>
  );
}
