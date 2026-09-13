import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";
import ts from "typescript";

const source = readFileSync("lib/traders/public.ts", "utf8");
const { outputText } = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS } });
let rows = [];
let fail = false;
const queries = [];
const exports = {};
vm.runInNewContext(outputText, {
  exports,
  console: { warn() {} },
  require(name) {
    if (name === "server-only") return {};
    if (name === "@/lib/db/prisma") return { prisma: { copyTrader: { async findMany(query) {
      queries.push(query);
      if (fail) throw new Error("Database unavailable");
      return rows.filter(row => Object.entries(query.where).every(([key, value]) => row[key] === value));
    } } } };
    throw new Error(`Unexpected import: ${name}`);
  },
});
const query = exports.getPublicFeaturedTraders;
assert.equal((await query()).length, 0, "An empty admin directory must not invent public traders");
const row = { id: "real-trader", name: "Admin name", strategy: "Swing trading", summary: "Different biography summary", avatar: "/images/traders/approved.webp", avatarAlt: "Approved portrait", assets: "BTC", status: "Published", isActive: true, featured: true, totalFollowers: 0, accuracy: null, winRate: null, rating: null, ratingCount: 0 };
rows = [row, { ...row, id: "draft", status: "Draft" }, { ...row, id: "archived", isActive: false }, { ...row, id: "not-featured", featured: false }];
let cards = await query();
assert.equal(cards.length, 1, "Only active, published, featured profiles belong on the homepage");
assert.equal(cards[0].name, row.name);
assert.equal(cards[0].style, row.strategy, "Card description comes from Strategy, not Short summary");
assert.equal(cards[0].avatar, row.avatar);
assert.equal(cards[0].avatarAlt, row.avatarAlt);
row.name = "Updated admin name";
row.strategy = "Position trading";
row.avatar = "/images/traders/replacement.webp";
cards = await query();
assert.equal(cards[0].name, row.name);
assert.equal(cards[0].style, row.strategy);
assert.equal(cards[0].avatar, row.avatar);
row.status = "Archived";
assert.equal((await query()).length, 0, "Removal must not resurrect fallback profiles");
fail = true;
assert.equal(await query(), null, "Unavailable data must be distinguishable from an empty directory");
assert.ok(queries.every(q => q.select && !q.select.notes && !q.select.biography && !q.select.metricSource), "Select public fields only");
console.log("Passed: public trader names, strategy, portraits, publication/feature filtering, updates, removal, empty and unavailable states.");
