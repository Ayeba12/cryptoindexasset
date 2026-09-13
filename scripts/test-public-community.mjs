import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import vm from "node:vm";
import ts from "typescript";

const source = await readFile(new URL("../components/public-site/card-marquee.tsx", import.meta.url), "utf8");
const approved = JSON.parse(await readFile(new URL("../content/approved-people.json", import.meta.url), "utf8"));
const { outputText } = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX } });

function setup({ reduced = false, observerAvailable = true } = {}) {
  const states = [];
  const callbacks = new Map();
  let cursor = 0;
  let effect;
  let cleanup;
  let enter;
  let observed = false;
  const eventTarget = (prefix) => ({
    addEventListener: (name, callback) => callbacks.set(`${prefix}:${name}`, callback),
    removeEventListener: (name) => callbacks.delete(`${prefix}:${name}`),
  });
  const preference = { matches: reduced, ...eventTarget("preference") };
  const doc = { hidden: false, ...eventTarget("document") };
  class Observer {
    constructor(callback) { enter = callback; }
    observe() { observed = true; }
    disconnect() { observed = false; }
  }
  const jsx = (type, props) => ({ type, props });
  const exports = {};
  vm.runInNewContext(outputText, {
    exports, document: doc, IntersectionObserver: Observer,
    window: { ...(observerAvailable ? { IntersectionObserver: Observer } : {}), matchMedia: () => preference },
    require(name) {
      if (name === "react") return {
        useRef: () => ({ current: {} }),
        useEffect: (callback) => { effect ??= callback; },
        useState(initial) {
          const index = cursor++;
          if (!(index in states)) states[index] = initial;
          return [states[index], (next) => { states[index] = typeof next === "function" ? next(states[index]) : next; }];
        },
      };
      if (name === "react/jsx-runtime") return { jsx, jsxs: jsx };
      if (name === "@/components/ui/button") return { Button: "button" };
      if (name === "@phosphor-icons/react") return { PauseIcon: "pause", PlayIcon: "play", SquaresFourIcon: "grid" };
      throw new Error(`Unexpected import: ${name}`);
    },
  });
  const render = () => { cursor = 0; return exports.CardMarquee({ id: "cards", label: "traders", children: "example", reverse: true }); };
  return { render, mount: () => { cleanup = effect(); }, enter: (visible) => enter([{ isIntersecting: visible }]),
    preference, doc, event: (name) => callbacks.get(name)?.(),
    cleanup: () => { cleanup?.(); assert.equal(callbacks.size, 0); assert.equal(observed, false); },
  };
}

function nodes(tree) {
  if (!tree || typeof tree !== "object") return [];
  return [tree, ...[tree.props?.children].flat(Infinity).flatMap(nodes)];
}
const app = setup();
let tree = app.render();
assert.equal(tree.props["data-loop"], false, "SSR and no-JS mode remain a readable grid");
app.mount(); app.enter(true); tree = app.render();
assert.equal(tree.props["data-running"], true);
assert.equal(tree.props["data-reverse"], true);
const copy = nodes(tree).find((node) => node.type === "ul" && node.props?.["aria-hidden"]);
assert.equal(copy.props.inert, true, "Loop copies cannot receive focus");
let buttons = nodes(tree).filter((node) => node.type === "button");
buttons[0].props.onClick(); tree = app.render();
assert.equal(tree.props["data-running"], false, "Explicit pause stops the loop");
assert.equal(nodes(tree).find((node) => node.type === "button").props["aria-label"], "Resume traders scrolling");
buttons = nodes(tree).filter((node) => node.type === "button");
buttons[0].props.onClick(); buttons[1].props.onClick(); tree = app.render();
assert.equal(tree.props["data-loop"], false, "View all exposes a static grid");
assert.equal(nodes(tree).find((node) => node.type === "button").props["aria-expanded"], true);
nodes(tree).find((node) => node.type === "button").props.onClick();
app.enter(false); assert.equal(app.render().props["data-running"], false, "Offscreen loops stop");
app.enter(true); app.doc.hidden = true; app.event("document:visibilitychange");
assert.equal(app.render().props["data-running"], false, "Hidden tabs stop");
app.doc.hidden = false; app.event("document:visibilitychange");
assert.equal(app.render().props["data-running"], true);
app.preference.matches = true; app.event("preference:change");
assert.equal(app.render().props["data-loop"], false, "Live reduced-motion changes use the static layout");
app.cleanup();
for (const options of [{ reduced: true }, { observerAvailable: false }]) {
  const fallback = setup(options); fallback.render(); fallback.mount();
  assert.equal(fallback.render().props["data-loop"], false); fallback.cleanup();
}
const css = await readFile(new URL("../components/public-site/public.css", import.meta.url), "utf8");
assert.match(css, /animation: pp-marquee 72s linear infinite/);
assert.match(css, /\.pp-people-marquee:focus-within \.pp-people-track \{ animation-play-state: paused/);
assert.match(css, /@media \(hover: hover\) and \(pointer: fine\) \{\s*\.pp-people-marquee:hover/);
assert.match(css, /@media \(prefers-reduced-motion: reduce\) \{\s*\.pp-people-controls/);
console.log("Passed: marquee pause, resume, static grid, reverse direction, offscreen/hidden state, reduced motion, inert copies and cleanup. Hooks/DOM are stubbed; this is not a frame-rate test.");

if (process.argv[2]) {
  const base = new URL(process.argv[2]);
  const response = await fetch(base);
  assert.equal(response.status, 200);
  const document = await response.text();
  const html = document.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, "");
  assert.equal((html.match(/<h1\b/g) ?? []).length, 1);
  assert.equal((html.match(/<main\b/g) ?? []).length, 1);
  const scripts = [...new Set([...document.matchAll(/<script\b[^>]*\bsrc="([^"]+)"/g)].map((match) => match[1]))];
  await Promise.all(scripts.map(async (src) => {
    const assetUrl = new URL(src, base);
    assert.equal(assetUrl.origin, base.origin);
    const asset = await fetch(assetUrl);
    assert.equal(asset.status, 200, src);
    assert.match(asset.headers.get("content-type"), /javascript/);
  }));
  const paths = new Set();
  for (const [, href] of html.matchAll(/<a\b[^>]*\bhref="([^"]+)"/g)) {
    const target = new URL(href, base);
    if (target.origin !== base.origin) continue;
    if (target.pathname === base.pathname && target.hash) assert.ok(html.includes(`id="${target.hash.slice(1)}"`), `Missing anchor: ${href}`);
    else paths.add(target.pathname);
  }
  await Promise.all([...paths].map(async (path) => {
    const linked = await fetch(new URL(path, base), { redirect: "manual" });
    assert.ok(linked.status >= 200 && linked.status < 400, `${path}: broken homepage link`);
  }));
  assert.match(html, /id="top-traders"/);
  assert.match(html, /id="testimonials"/);
  assert.match(html, /id="services"/);
  assert.match(html, /We ensure<br\/>best services\./);
  assert.match(html, /Network confirmations and processing times depend/);
  assert.match(html, /losses are possible and previous performance does not predict/);
  assert.match(html, /Trader profiles published by the platform operator/);
  assert.match(html, /Testimonials and portraits supplied and approved by the platform operator/);
  const traderCardCount = (html.match(/pp-person-card pp-trader-card/g) ?? []).length;
  assert.equal((html.match(/Copy trader/g) ?? []).length, traderCardCount, "Every visible and inert published trader card has an action");
  assert.equal((html.match(/Profile data supplied and approved by the platform operator/g) ?? []).length, traderCardCount);
  if (!traderCardCount) assert.match(html, /Trader profiles are temporarily unavailable|No traders are featured yet/);
  assert.doesNotMatch(html, /baseline-apex|baseline-quant|baseline-horizon/);
  assert.equal((html.match(/Approved testimonial · Supplied by the platform operator/g) ?? []).length, approved.testimonials.length * 2);
  for (const person of approved.testimonials) {
    assert.match(html, new RegExp(person.name));
    const portrait = await fetch(new URL(person.avatar, base));
    assert.equal(portrait.status, 200, `${person.slug}: portrait exists`);
    assert.match(portrait.headers.get("content-type"), /image\/(jpeg|png)/);
  }
  console.log(`Passed: ${traderCardCount} published trader card instances or explicit empty/unavailable state, ${approved.testimonials.length} testimonials, ${scripts.length} scripts and ${paths.size} linked routes.`);
}
