import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import vm from "node:vm";
import ts from "typescript";

// Exercise the actual frame's state/effect logic with deterministic browser and
// hook doubles. This does not claim to test hydration or browser rendering.
const source = await readFile(new URL("../components/public-site/frame.tsx", import.meta.url), "utf8");
const { outputText } = ts.transpileModule(source, {
  compilerOptions: {
    module: ts.ModuleKind.CommonJS,
    target: ts.ScriptTarget.ES2022,
    jsx: ts.JsxEmit.ReactJSX,
  },
});

function mount({ systemDark = false, saved = null, preview = false, storageBlocked = false } = {}) {
  const states = [];
  const effects = [];
  const cleanups = [];
  const listeners = new Set();
  const warnings = [];
  const writes = [];
  let cursor = 0;
  let mounted = false;
  let reads = 0;
  const media = {
    matches: systemDark,
    addEventListener: (event, listener) => { assert.equal(event, "change"); listeners.add(listener); },
    removeEventListener: (event, listener) => { assert.equal(event, "change"); listeners.delete(listener); },
  };
  const jsx = (type, props) => ({ type, props });
  const react = {
    createContext: () => ({ Provider: "provider" }),
    useState(initial) {
      const index = cursor++;
      if (!(index in states)) states[index] = initial;
      return [states[index], (next) => { states[index] = typeof next === "function" ? next(states[index]) : next; }];
    },
    useEffect(effect) { if (!mounted) effects.push(effect); },
    useRef: (current) => ({ current }),
  };
  const exports = {};
  vm.runInNewContext(outputText, {
    exports,
    window: { matchMedia: (query) => { assert.equal(query, "(prefers-color-scheme: dark)"); return media; } },
    localStorage: {
      getItem(key) {
        assert.equal(key, "ca-public-theme");
        reads++;
        if (storageBlocked) throw new Error("Storage unavailable");
        return saved;
      },
      setItem: (key, value) => { writes.push({ key, value }); },
    },
    console: { warn: (...args) => { warnings.push(args); } },
    require(name) {
      if (name === "react") return react;
      if (name === "react/jsx-runtime") return { jsx, jsxs: jsx };
      if (name === "next/navigation") return { usePathname: () => "/" };
      if (name === "next/link") return { default: "link" };
      if (name === "radix-ui") return { Dialog: {} };
      if (name === "@phosphor-icons/react") return {};
      if (name === "@/components/ui/button") return { Button: "button" };
      throw new Error(`Unexpected frame import: ${name}`);
    },
  });
  const render = () => {
    cursor = 0;
    return exports.PublicFrame({ children: null, preview }).props.value;
  };
  render();
  effects.forEach((effect) => { cleanups.push(effect()); });
  mounted = true;
  return {
    current: render,
    changeSystem(dark) { media.matches = dark; listeners.forEach((listener) => listener()); return render(); },
    get reads() { return reads; },
    warnings,
    writes,
    unmount() { cleanups.forEach((cleanup) => cleanup?.()); assert.equal(listeners.size, 0); },
  };
}

for (const systemDark of [false, true]) {
  const frame = mount({ systemDark });
  assert.equal(frame.current().theme, "system", "Fresh public visits use the device preference");
  assert.equal(frame.current().resolvedTheme, systemDark ? "dark" : "light");
  assert.equal(frame.changeSystem(!systemDark).resolvedTheme, systemDark ? "light" : "dark");
  frame.unmount();
}

for (const saved of ["light", "dark", "system"]) {
  const frame = mount({ saved, systemDark: false });
  assert.equal(frame.current().theme, saved);
  assert.equal(frame.current().resolvedTheme, saved === "system" ? "light" : saved);
  assert.equal(frame.changeSystem(true).resolvedTheme, saved === "system" ? "dark" : saved);
  frame.current().setTheme("light");
  assert.equal(frame.current().resolvedTheme, "light");
  assert.deepEqual(frame.writes, [{ key: "ca-public-theme", value: "light" }]);
  frame.unmount();
}

for (const options of [{ saved: "invalid" }, { storageBlocked: true }]) {
  const frame = mount(options);
  assert.equal(frame.current().theme, "system");
  assert.equal(frame.current().resolvedTheme, "light");
  assert.equal(frame.warnings.length, options.storageBlocked ? 1 : 0);
  frame.unmount();
}

const preview = mount({ preview: true, systemDark: false, saved: "light" });
assert.equal(preview.current().theme, "dark", "Preview remains independent of public preferences");
assert.equal(preview.current().resolvedTheme, "dark");
assert.equal(preview.reads, 0);
preview.current().setTheme("light");
assert.equal(preview.current().resolvedTheme, "light");
assert.equal(preview.writes.length, 0);
preview.unmount();

console.log("Passed: eight public/preview theme scenarios, including fresh light/dark OS preferences, saved overrides, system changes and unavailable storage. Rendering/hydration is outside this test.");
