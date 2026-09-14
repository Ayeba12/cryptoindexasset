import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";
import ts from "typescript";

const compile = path => ts.transpileModule(readFileSync(path, "utf8"), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX } }).outputText;
const jsx = (type, props) => ({ type, props });
const nodes = node => !node || typeof node !== "object" ? [] : [node, ...[node.props?.children].flat(Infinity).flatMap(nodes)];

function editor({ isNew = false, preview = false } = {}) {
  const base = { id: isNew ? "" : "trader-1", name: "Before", strategy: "Swing trading", summary: "Summary", status: isNew ? "Draft" : "Published", version: 1, avatar: "", featured: true };
  let state = { traders: isNew ? [] : [base] };
  const hooks = [];
  let cursor = 0;
  const calls = [];
  const exports = {};
  vm.runInNewContext(compile("components/admin/traders.tsx"), {
    exports, crypto: { randomUUID: () => "preview-id" },
    require(name) {
      if (name === "react/jsx-runtime") return { jsx, jsxs: jsx };
      if (name === "next/navigation") return { useRouter: () => ({ refresh() {}, push() {} }) };
      if (name === "react") return {
        useState(initial) { const i = cursor++; if (!(i in hooks)) hooks[i] = typeof initial === "function" ? initial() : initial; return [hooks[i], value => { hooks[i] = typeof value === "function" ? value(hooks[i]) : value; }]; },
        useRef(initial) { const i = cursor++; return hooks[i] ??= { current: initial }; },
      };
      if (name === "./provider") return { useAdmin: () => ({ state, preview, fault: "none", commit: fn => { state = fn(state); } }) };
      if (name === "@/lib/admin/model") return { blankTrader: () => ({ ...base }), validateTrader: () => ({}), record() {}, CURRENCIES: [] };
      if (name === "@/lib/content/approved-people") return { APPROVED_TRADERS: [] };
      if (name === "@/lib/admin/traders.server") return Object.fromEntries(["createTraderAction", "updateTraderAction", "publishTraderAction", "unpublishTraderAction", "archiveTraderAction", "deleteTraderAction"].map(key => [key, async (...args) => {
        calls.push({ key, args });
        const input = key === "createTraderAction" ? args[0] : args[1];
        return { success: true, trader: { ...input, id: "saved-id", version: (input?.version ?? 1) + 1 } };
      }]));
      return new Proxy({}, { get: (_, key) => key });
    },
  });
  const render = () => { cursor = 0; return exports.TraderEditor({ id: isNew ? "new" : "trader-1" }); };
  const change = (label, value) => {
    const field = nodes(render()).find(n => n.props?.label === label && n.props?.onChange);
    assert.ok(field, label);
    field.props.onChange(field.type === "Choice" ? value : { target: { value } });
  };
  const submit = async () => {
    nodes(render()).find(n => n.type === "form").props.onSubmit({ preventDefault() {} });
    const confirm = nodes(render()).find(n => n.type === "ConfirmDialog");
    if (confirm.props.open) await confirm.props.onConfirm();
    await new Promise(resolve => setTimeout(resolve, 0));
  };
  return { calls, change, submit, render };
}
const live = editor();
live.change("Display name", "Updated name");
live.change("Strategy", "Position trading");
await live.submit();
assert.equal(live.calls[0].key, "updateTraderAction", "Saving a published profile must update its fields, not just its status");
assert.equal(live.calls[0].args[1].name, "Updated name");
assert.equal(live.calls[0].args[1].strategy, "Position trading");
assert.equal(live.calls[0].args[1].status, "Published");
const fresh = editor({ isNew: true });
await fresh.submit();
await fresh.submit();
assert.deepEqual(fresh.calls.map(c => c.key), ["createTraderAction", "updateTraderAction"], "Saving twice on /new must not duplicate the trader");
const preview = editor({ preview: true });
await preview.submit();
assert.equal(preview.calls.length, 0, "Design previews must not call live mutations");

const portraitExports = {};
let failed = null;
vm.runInNewContext(compile("components/public-site/person-portrait.tsx"), { exports: portraitExports, require(name) {
  if (name === "react/jsx-runtime") return { jsx, jsxs: jsx };
  if (name === "react") return { useState: () => [failed, value => { failed = value; }] };
  if (name === "next/image") return { default: "image" };
  throw Error(name);
} });
const portrait = src => portraitExports.PersonPortrait({ name: "Alex Morgan", src });
assert.equal(portrait(null).props.children, "AM");
let image = portrait("/missing.webp");
image.props.onError();
assert.equal(portrait("/missing.webp").props.children, "AM", "Broken portraits render initials");
assert.equal(portrait("/replacement.webp").props.src, "/replacement.webp", "A replacement portrait retries after an earlier failure");
assert.equal(portrait("javascript:bad").props.children, "AM");
console.log("Passed: published edits, repeat saves, preview isolation, and missing/broken/replaced portrait handling.");
