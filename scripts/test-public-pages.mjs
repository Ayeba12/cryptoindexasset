import assert from "node:assert/strict";

const base = new URL(process.argv[2] ?? "http://127.0.0.1:3100");
assert.ok(["127.0.0.1", "localhost", "[::1]"].includes(base.hostname), "Run this smoke test against a local server.");

const pages = [
  "/",
  "/how-it-works",
  "/copy-trading",
  "/about",
  "/contact",
  "/fees",
  "/security",
  "/risk-disclosure",
  "/terms",
  "/policy",
  "/cookie-policy",
  "/login",
  "/register",
  "/confirm-email",
  "/forgot-password",
  "/reset-password",
  "/admin/login",
];

const expectedImages = [8, 1, 3, 1, 0, 0, 0, 0, 0, 0, 0, 1, 1, 0, 1, 1, 1];
const htmlByPath = new Map();
const scripts = new Set();

for (const [index, path] of pages.entries()) {
  const response = await fetch(new URL(path, base), { redirect: "manual" });
  assert.equal(response.status, 200, `${path} must be public without a session`);
  const source = await response.text();
  for (const [, src] of source.matchAll(/<script\b[^>]*\bsrc="([^"]+)"/g)) scripts.add(src);
  const html = source.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, "");
  assert.equal((html.match(/<h1\b/g) ?? []).length, 1, `${path}: one H1`);
  assert.equal((html.match(/<main\b/g) ?? []).length, 1, `${path}: one main landmark`);
  assert.match(html, /name="robots" content="noindex, nofollow"/, `${path}: staged, not indexable`);
  assert.match(html, /<title>[^<]*Crypto Index Asset<\/title>/, `${path}: branded title`);
  assert.equal((html.match(/data-product-scene=/g) ?? []).length, expectedImages[index], `${path}: image count`);
  assert.doesNotMatch(html, /Design review tools|Planned route:/, `${path}: no preview-only controls`);
  htmlByPath.set(path, html);
}

await Promise.all([...scripts].map(async (src) => {
  const url = new URL(src, base);
  assert.equal(url.origin, base.origin, "Page scripts must come from the local build");
  const response = await fetch(url);
  assert.equal(response.status, 200, `Missing page script: ${src}`);
  assert.match(response.headers.get("content-type") ?? "", /javascript/, `Not a JavaScript response: ${src}`);
  await response.arrayBuffer();
}));

const allowedPaths = new Set(pages);
let checkedLinks = 0;
for (const [source, html] of htmlByPath) {
  for (const [, href] of html.matchAll(/<a\b[^>]*\bhref="([^"]+)"/g)) {
    const target = new URL(href, new URL(source, base));
    assert.equal(target.origin, base.origin, `${source}: unexpected external link ${href}`);
    assert.ok(allowedPaths.has(target.pathname) || target.pathname.startsWith("/dashboard/traders/"), `${source}: unbuilt destination ${href}`);
    if (target.hash) {
      assert.ok(htmlByPath.get(target.pathname)?.includes(`id="${target.hash.slice(1)}"`), `${source}: missing anchor ${href}`);
    }
    checkedLinks++;
  }
}

// Verify approved document statuses
assert.match(htmlByPath.get("/terms"), /Terms and Conditions/, "/terms: approved terms");
assert.match(htmlByPath.get("/terms"), /25 Bank Street, Canary Wharf/, "/terms: operator details");
assert.match(htmlByPath.get("/policy"), /Privacy Policy/, "/policy: approved privacy");
assert.match(htmlByPath.get("/policy"), /Data Protection Officer/, "/policy: DPO details");
assert.match(htmlByPath.get("/fees"), /Fee Schedule/, "/fees: fee schedule");
assert.match(htmlByPath.get("/security"), /Security Architecture/, "/security: security controls");
assert.match(htmlByPath.get("/risk-disclosure"), /Risk Disclosure Notice/, "/risk-disclosure: risk notice");
assert.match(htmlByPath.get("/contact"), /class="pp-contact-form"/, "/contact: enquiry form");
assert.match(htmlByPath.get("/contact"), /Send message/, "/contact: submit action");
assert.doesNotMatch(htmlByPath.get("/contact"), /Message delivery is not connected yet/, "/contact: stale disabled state");
assert.match(htmlByPath.get("/register"), /name="terms"/, "/register: terms acceptance checkbox");
assert.match(htmlByPath.get("/confirm-email"), /Confirm your email address/, "/confirm-email: confirmation view");
assert.doesNotMatch(htmlByPath.get("/admin/login"), /System Status: Operational|Root Authority|Users &amp; Balances/, "Admin sign-in must not render the protected dashboard shell");

for (const path of ["/login", "/register", "/forgot-password", "/reset-password", "/admin/login", "/confirm-email"]) {
  const html = htmlByPath.get(path);
  assert.doesNotMatch(html, /<header\b|<footer\b|Main navigation|pp-cookie-notice/, `${path}: account pages have no marketing chrome`);
  assert.match(html, /aria-label="Breadcrumb"/, `${path}: breadcrumb navigation`);
  assert.match(html, /href="\/"[^>]*>Home<\/a>/, `${path}: Home breadcrumb is a real link`);
}

for (const path of ["/login", "/register", "/forgot-password", "/admin/login"]) {
  const html = htmlByPath.get(path);
  assert.match(html, /data-slot="field-group"/, `${path}: installed shadcn form structure`);
  assert.doesNotMatch(html, /with GitHub|href="#"|Acme Inc/, `${path}: no unsupported template actions`);
}

assert.match(htmlByPath.get("/reset-password"), /Recovery link expired|Password recovery unavailable/, "/reset-password: safe unauthenticated state");

console.log(`Passed: ${pages.length} public/account-entry pages, metadata, landmarks, 16 themed image slots and ${checkedLinks} internal links.`);
console.log(`Passed: ${scripts.size} page scripts load from the same build.`);
