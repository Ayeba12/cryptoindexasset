"use server";

import crypto from "node:crypto";
import { prisma } from "../db/prisma";
import { checkRateLimit } from "@/lib/security/rate-limit";

export type ContactSubmissionResult = {
  success: boolean;
  caseReference?: string;
  error?: string;
};

const ALLOWED_TOPICS = [
  "Before I register",
  "Fees and investment options",
  "Deposit or withdrawal",
  "Account access",
  "Account security",
  "Complaint",
  "Something else",
] as const;

export async function submitContactEnquiryAction(formData: FormData): Promise<ContactSubmissionResult> {
  try {
    // 1. Bot prevention: honeypot field
    const honeypot = String(formData.get("website") || "").trim();
    if (honeypot) {
      // Silently reject bots
      return { success: true, caseReference: `CIA-${new Date().getUTCFullYear()}-000000` };
    }

    // 2. Extract and validate fields
    const name = String(formData.get("name") || "").trim();
    const email = String(formData.get("email") || "").trim().toLowerCase();
    const topic = String(formData.get("topic") || "").trim();
    const reference = String(formData.get("reference") || "").trim();
    const message = String(formData.get("message") || "").trim();

    if (!name || name.length < 2 || name.length > 100) {
      return { success: false, error: "Please enter your full name (2 to 100 characters)." };
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email || !emailRegex.test(email) || email.length > 120) {
      return { success: false, error: "Please provide a valid email address so we can reply." };
    }

    // Rate limiting: max 5 enquiries per 10 minutes per email
    const rl = checkRateLimit(`contact:${email}`, 5, 600);
    if (!rl.allowed) {
      return {
        success: false,
        error: `Too many enquiries submitted. Please wait ${rl.resetSeconds} seconds before trying again.`,
      };
    }

    if (!ALLOWED_TOPICS.includes(topic as typeof ALLOWED_TOPICS[number])) {
      return { success: false, error: "Please select an enquiry topic from the list." };
    }

    if (reference.length > 64) {
      return { success: false, error: "Reference must not exceed 64 characters." };
    }

    if (!message || message.length < 10) {
      return { success: false, error: "Please enter a message of at least 10 characters describing your enquiry." };
    }

    if (message.length > 500) {
      return { success: false, error: "Message must not exceed 500 characters." };
    }

    // 3. Secrets / Private Key protection check
    const sensitiveTerms = [
      "private key",
      "seed phrase",
      "recovery phrase",
      "mnemonic",
      "wallet password",
      "secret recovery phrase",
    ];
    const lowerMessage = message.toLowerCase();
    for (const term of sensitiveTerms) {
      if (lowerMessage.includes(term)) {
        return {
          success: false,
          error: "For your security, never submit private keys, recovery phrases, or account passwords. Please remove sensitive credentials and try again.",
        };
      }
    }

    // 4. Generate unique Case Reference
    const randomSuffix = crypto.randomBytes(3).toString("hex").toUpperCase();
    const caseReference = `CIA-${new Date().getUTCFullYear()}-${randomSuffix}`;

    // 5. Persist enquiry into AuditLog for support tracking
    await prisma.auditLog.create({
      data: {
        actor: email,
        action: "PUBLIC_CONTACT_ENQUIRY",
        target: topic,
        reason: reference || null,
        after: {
          caseReference,
          name,
          email,
          topic,
          reference: reference || null,
          message,
          receivedAt: new Date().toISOString(),
        },
      },
    });

    return {
      success: true,
      caseReference,
    };
  } catch (error) {
    console.error("[contact-enquiry] Failed to record enquiry:", error);
    return {
      success: false,
      error: "We could not submit your enquiry due to a temporary service disruption. Please try again later.",
    };
  }
}
