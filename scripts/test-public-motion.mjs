import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import vm from "node:vm";
import ts from "typescript";

const source = await readFile(new URL("../components/public-site/motion.tsx", import.meta.url), "utf8");
const { outputText } = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX } });

function setup({ reduced = false, hidden = false, focused = false } = {}) {
  const callbacks = new Map();
  const cleanups = [];
  const played = [];
  const observed = new Set();
  const eventTarget = (prefix) => ({
    addEventListener: (event, callback) => callbacks.set(`${prefix}:${event}`, callback),
    removeEventListener: (event) => callbacks.delete(`${prefix}:${event}`),
  });
  const preference = { matches: reduced, ...eventTarget("preference") };
  const doc = { hidden, activeElement: {}, ...eventTarget("document") };
  const parent = { hasAttribute: (name) => name === "data-stagger", children: [] };
  const targets = ["", "image", "", "", ""].map((variant) => ({
    dataset: { reveal: variant }, parentElement: parent,
    hasAttribute: (name) => name === "data-reveal",
    contains: () => focused,
    animate(frames, timing) {
      const animation = { frames, timing, finished: false, cancelled: false,
        finish() { this.finished = true; this.onfinish?.(); },
        cancel() { this.cancelled = true; },
      };
      played.push(animation); return animation;
    },
  }));
  parent.children = targets;
  const root = { querySelectorAll: () => targets, ...eventTarget("root") };
  let enter;
  class Observer {
    constructor(callback) { enter = callback; }
    observe(target) { observed.add(target); }
    unobserve(target) { observed.delete(target); }
    disconnect() { observed.clear(); }
  }
  const exports = {};
  vm.runInNewContext(outputText, {
    exports, window: { IntersectionObserver: Observer, matchMedia: () => preference },
    IntersectionObserver: Observer, Element: { prototype: { animate() {} } }, document: doc,
    require(name) {
      if (name === "react") return { useRef: () => ({ current: root }), useEffect: (effect) => cleanups.push(effect()) };
      if (name === "react/jsx-runtime") return { jsx: (type, props) => ({ type, props }) };
      throw new Error(`Unexpected import: ${name}`);
    },
  });
  exports.PublicMotion({ children: null });
  return { targets, played, observed, enter: () => enter(targets.map((target) => ({ target, isIntersecting: true }))),
    trigger: (event) => callbacks.get(event)?.(), preference, doc,
    cleanup() { cleanups.forEach((fn) => fn()); assert.equal(callbacks.size, 0); assert.equal(observed.size, 0); },
  };
}

const normal = setup();
assert.equal(normal.observed.size, 5);
normal.enter();
assert.equal(normal.observed.size, 0, "Every reveal is observed only until its first entrance");
assert.deepEqual(normal.played.map((entry) => entry.timing.delay), [0, 60, 120, 180, 180]);
assert.equal(normal.played[0].frames[0].transform, "translateY(24px)");
assert.equal(normal.played[1].frames[0].transform, "translateY(16px) scale(0.98)");
normal.trigger("root:focusin");
assert.ok(normal.played.every((entry) => entry.finished), "Keyboard focus ends motion immediately");
normal.cleanup();
for (const option of [{ reduced: true }, { hidden: true }, { focused: true }]) {
  const skipped = setup(option); skipped.enter(); assert.equal(skipped.played.length, 0); skipped.cleanup();
}
for (const reason of ["preference", "visibility", "unmount"]) {
  const active = setup(); active.enter();
  if (reason === "preference") { active.preference.matches = true; active.trigger("preference:change"); }
  if (reason === "visibility") { active.doc.hidden = true; active.trigger("document:visibilitychange"); }
  if (reason === "unmount") { active.cleanup(); assert.ok(active.played.every((entry) => entry.cancelled)); }
  else { assert.ok(active.played.every((entry) => entry.finished)); active.cleanup(); }
}
console.log("Passed: reveal staggering, image/text variants, first-entry observation, focus/reduced-motion/hidden-tab cancellation and cleanup. DOM/WAAPI are stubbed; browser smoothness is not measured.");
