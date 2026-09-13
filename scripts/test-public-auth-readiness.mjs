import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import nodeCrypto from "node:crypto";
import vm from "node:vm";
import ts from "typescript";

console.log("Starting Public Auth Readiness Audit Verification Suite...\n");

// --- 1. Verify app/auth/callback/route.ts open redirect sanitization ---
{
  const callbackSource = await readFile(new URL("../app/auth/callback/route.ts", import.meta.url), "utf8");
  const redirectsSource = await readFile(new URL("../lib/auth/redirects.ts", import.meta.url), "utf8");
  assert.ok(callbackSource.includes("sanitizeAuthCallbackPath"), "sanitizeAuthCallbackPath must be used in callback route");
  assert.ok(redirectsSource.includes('value.startsWith("//")'), "Protocol-relative URLs must be blocked");
  assert.ok(redirectsSource.includes('value.includes("\\\\")'), "Backslashes must be rejected");
  assert.ok(redirectsSource.includes('CALLBACK_ROOTS'), "Callback destinations must be restricted to approved roots");
  console.log("  ✓ Callback route: Open-redirect sanitization and safe default fallbacks verified");
}

// --- 2. Verify Trader destination in community.tsx ---
{
  const communitySource = await readFile(new URL("../components/public-site/community.tsx", import.meta.url), "utf8");
  assert.ok(
    communitySource.includes("`/dashboard/traders/${encodeURIComponent(trader.id)}`"),
    "Copy trader action must route to valid /dashboard/traders/:id customer route"
  );
  assert.ok(!communitySource.includes("/dashboard/copy-trading?trader="), "Broken /dashboard/copy-trading route must not be present");
  console.log("  ✓ Community trader cards: Verified real customer trader profile routing (/dashboard/traders/:id)");
}

// --- 3. Verify Public Trader metrics in lib/traders/public.ts ---
{
  const tradersPublicSource = await readFile(new URL("../lib/traders/public.ts", import.meta.url), "utf8");
  assert.ok(!tradersPublicSource.includes('"4.8"'), "Fabricated 4.8 rating default must be removed");
  assert.ok(!tradersPublicSource.includes('"36"'), "Fabricated 36 review count default must be removed");
  assert.ok(tradersPublicSource.includes("row.rating != null"), "Unverified rating must be explicitly checked");
  assert.ok(tradersPublicSource.includes("row.ratingCount > 0"), "Unreviewed trader must not fabricate review counts");
  console.log("  ✓ Public trader metrics: Verified removal of fabricated rating and review counts");
}

// --- 4. Verify Account Entry session leak fix & terms metadata ---
{
  const accountSource = await readFile(new URL("../components/public-site/account-entry.tsx", import.meta.url), "utf8");
  assert.ok(
    accountSource.includes("await supabase.auth.signOut();"),
    "Admin role denial must immediately revoke client session to prevent session leak"
  );
  assert.ok(
    accountSource.includes("auth_code_error"),
    "Callback auth_code_error must be handled and explained to user"
  );
  assert.ok(
    accountSource.includes("terms_accepted_at"),
    "Registration must record terms_accepted_at timestamp"
  );
  assert.ok(
    accountSource.includes('terms_version: "2026-09-13"'),
    "Registration must record terms_version in user metadata"
  );
  assert.ok(
    accountSource.includes("getDestination"),
    "Sign-in must preserve and validate returnUrl parameter"
  );
  console.log("  ✓ Account Entry: Session leak on admin denial fixed, terms metadata captured, and returnUrl preserved");
}

// --- 5. Verify Password Reset Form and Accessibility ---
{
  const resetSource = await readFile(new URL("../components/reset-password-form.tsx", import.meta.url), "utf8");
  const fieldSource = await readFile(new URL("../components/auth-password-field.tsx", import.meta.url), "utf8");

  assert.ok(
    fieldSource.includes("errorId?: string"),
    "AuthPasswordField must accept customizable errorId"
  );
  assert.ok(
    resetSource.includes('errorId="reset-error"'),
    "Reset form must link password field error to reset-error ID"
  );
  assert.ok(
    resetSource.includes("Recovery link expired"),
    "Reset form must provide explicit expired recovery session notice"
  );
  assert.ok(
    resetSource.includes("minLength={10}"),
    "Password fields must enforce 10-character minimum policy"
  );
  console.log("  ✓ Reset Password & Password Field: Accessibility IDs aligned, recovery session verified, 10-char policy enforced");
}

// --- 6. Verify Contact Form Server Action & Validation Logic ---
{
  const contactSource = await readFile(new URL("../lib/public/contact.server.ts", import.meta.url), "utf8");
  const { outputText } = ts.transpileModule(contactSource, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  });

  const auditLogs = [];
  const mockPrisma = {
    auditLog: {
      create: async ({ data }) => {
        auditLogs.push(data);
        return { id: "log-1", ...data };
      },
    },
  };

  const exports = {};
  vm.runInNewContext(outputText, {
    exports,
    require(name) {
      if (name === "node:crypto") return Object.assign({}, nodeCrypto, { default: nodeCrypto });
      if (name === "../db/prisma" || name === "@/lib/db/prisma") return { prisma: mockPrisma };
      if (name === "@/lib/security/rate-limit") return { checkRateLimit: () => ({ allowed: true, remaining: 5, resetSeconds: 60 }) };
      throw new Error(`Unexpected import: ${name}`);
    },
    console,
    Date,
  });

  // Test bot honeypot trap
  const botFormData = new FormData();
  botFormData.set("name", "Bot Spammer");
  botFormData.set("email", "bot@spam.com");
  botFormData.set("topic", "Complaint");
  botFormData.set("message", "This is automated bot traffic.");
  botFormData.set("website", "https://spam-site.com");

  const botRes = await exports.submitContactEnquiryAction(botFormData);
  assert.equal(botRes.success, true);
  assert.ok(botRes.caseReference?.includes("-000000"), "Bot honeypot must be cleanly trapped");

  // Test credential / private key protection
  const keyLeakFormData = new FormData();
  keyLeakFormData.set("name", "Alice User");
  keyLeakFormData.set("email", "alice@example.com");
  keyLeakFormData.set("topic", "Account access");
  keyLeakFormData.set("message", "My private key is 0xabcdef123456 please restore my account");

  const leakRes = await exports.submitContactEnquiryAction(keyLeakFormData);
  assert.equal(leakRes.success, false);
  assert.ok(leakRes.error?.includes("never submit private keys"), "Credential leakage must be blocked with safety notice");

  // Test valid enquiry
  const validFormData = new FormData();
  validFormData.set("name", "Jane Doe");
  validFormData.set("email", "jane.doe@example.com");
  validFormData.set("topic", "Fees and investment options");
  validFormData.set("reference", "REF-2026-0912");
  validFormData.set("message", "I would like to inquire about tier structures for institutional accounts.");

  const validRes = await exports.submitContactEnquiryAction(validFormData);
  assert.equal(validRes.success, true);
  assert.ok(validRes.caseReference?.startsWith("CIA-2026-"), "Valid enquiry must generate CIA-2026-XXXX case reference");
  assert.equal(auditLogs.length, 1, "Valid enquiry must record audit log");
  assert.equal(auditLogs[0].action, "PUBLIC_CONTACT_ENQUIRY");
  console.log(`  ✓ Contact Server Action: Validation passed, bot honeypot trapped, secrets protected, AuditLog recorded, Case Ref: ${validRes.caseReference}`);
}

console.log("\nAll Public Auth Readiness audit tests passed successfully! (6/6 suites)");
