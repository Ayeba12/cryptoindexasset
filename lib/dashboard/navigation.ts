/**
 * Customer dashboard navigation model.
 *
 * Pure data and pure functions shared by the sidebar, header breadcrumb,
 * settings subnavigation and page metadata. Icons are Phosphor icon names
 * resolved by the sidebar component, so this module has no React or icon
 * imports and is safe on the server and in tests.
 *
 * Exported names and shapes are frozen after Stage A.
 */

/** Root of every customer route. */
export const DASHBOARD_ROOT = "/dashboard";

/** Phosphor icon names the sidebar resolves to components (regular weight; fill only for the active item). */
export type NavIconName =
  | "SquaresFour"
  | "Wallet"
  | "ArrowDownLeft"
  | "ArrowUpRight"
  | "ClockCounterClockwise"
  | "Users"
  | "ChartLineUp"
  | "Broadcast"
  | "Bell"
  | "GearSix"
  | "Question";

/** Item ids, stable for tests and `aria-current` handling. */
export type NavItemId =
  | "overview"
  | "assets"
  | "deposit"
  | "withdraw"
  | "activity"
  | "traders"
  | "copy-trades"
  | "signals"
  | "notifications"
  | "settings"
  | "help";

/** Group ids. */
export type NavGroupId = "overview" | "account" | "copy-trading" | "account-tools";

/** One sidebar link. */
export interface NavItem {
  id: NavItemId;
  label: string;
  href: string;
  icon: NavIconName;
  /** Match only the exact path (the overview must not claim every descendant). */
  exact?: boolean;
  /**
   * Path prefix that marks this item active when it differs from `href`
   * (Settings links to the profile tab but owns every `/dashboard/settings/*`
   * route).
   */
  activePrefix?: string;
}

/** One sidebar group. */
export interface NavGroup {
  id: NavGroupId;
  label: string;
  items: NavItem[];
  /** Rendered collapsed by default (the account-tools group). */
  collapsed?: boolean;
}

/** Sidebar groups in render order. No team switcher, plan upsell or admin link. */
export const NAV_GROUPS: readonly NavGroup[] = [
  {
    id: "overview",
    label: "Overview",
    items: [{ id: "overview", label: "Overview", href: "/dashboard", icon: "SquaresFour", exact: true }],
  },
  {
    id: "account",
    label: "Account",
    items: [
      { id: "assets", label: "Assets", href: "/dashboard/assets", icon: "Wallet" },
      { id: "deposit", label: "Deposit", href: "/dashboard/deposit", icon: "ArrowDownLeft" },
      { id: "withdraw", label: "Withdraw", href: "/dashboard/withdraw", icon: "ArrowUpRight" },
      { id: "activity", label: "Activity", href: "/dashboard/activity", icon: "ClockCounterClockwise" },
    ],
  },
  {
    id: "copy-trading",
    label: "Copy trading",
    items: [
      { id: "traders", label: "Discover traders", href: "/dashboard/traders", icon: "Users" },
      { id: "copy-trades", label: "My copy trades", href: "/dashboard/copy-trades", icon: "ChartLineUp" },
      { id: "signals", label: "Signals", href: "/dashboard/signals", icon: "Broadcast" },
    ],
  },
  {
    id: "account-tools",
    label: "Account tools",
    collapsed: true,
    items: [
      { id: "notifications", label: "Notifications", href: "/dashboard/notifications", icon: "Bell" },
      {
        id: "settings",
        label: "Settings",
        href: "/dashboard/settings/profile",
        icon: "GearSix",
        activePrefix: "/dashboard/settings",
      },
      { id: "help", label: "Help", href: "/dashboard/help", icon: "Question" },
    ],
  },
];

/** Settings tab ids. */
export type SettingsTabId = "profile" | "security" | "verification";

/** One settings subnavigation tab. */
export interface SettingsTab {
  id: SettingsTabId;
  label: string;
  href: string;
}

/** Settings subnavigation in render order. */
export const SETTINGS_TABS: readonly SettingsTab[] = [
  { id: "profile", label: "Profile", href: "/dashboard/settings/profile" },
  { id: "security", label: "Security", href: "/dashboard/settings/security" },
  { id: "verification", label: "Verification", href: "/dashboard/settings/verification" },
];

/** Route patterns for every customer page, including detail routes. `[param]` segments are dynamic. */
export type RoutePattern =
  | "/dashboard"
  | "/dashboard/assets"
  | "/dashboard/assets/[currency]"
  | "/dashboard/deposit"
  | "/dashboard/withdraw"
  | "/dashboard/activity"
  | "/dashboard/activity/[transactionId]"
  | "/dashboard/traders"
  | "/dashboard/traders/[traderId]"
  | "/dashboard/copy-trades"
  | "/dashboard/copy-trades/[allocationId]"
  | "/dashboard/signals"
  | "/dashboard/notifications"
  | "/dashboard/settings/profile"
  | "/dashboard/settings/security"
  | "/dashboard/settings/verification"
  | "/dashboard/help";

/** Page titles per route pattern (used for `<h1>`, metadata and breadcrumbs). */
export const ROUTE_TITLES: Record<RoutePattern, string> = {
  "/dashboard": "Overview",
  "/dashboard/assets": "Assets",
  "/dashboard/assets/[currency]": "Asset details",
  "/dashboard/deposit": "Deposit",
  "/dashboard/withdraw": "Withdraw",
  "/dashboard/activity": "Activity",
  "/dashboard/activity/[transactionId]": "Transaction details",
  "/dashboard/traders": "Discover traders",
  "/dashboard/traders/[traderId]": "Trader profile",
  "/dashboard/copy-trades": "My copy trades",
  "/dashboard/copy-trades/[allocationId]": "Allocation details",
  "/dashboard/signals": "Signals",
  "/dashboard/notifications": "Notifications",
  "/dashboard/settings/profile": "Profile",
  "/dashboard/settings/security": "Security",
  "/dashboard/settings/verification": "Verification",
  "/dashboard/help": "Help",
};

/** Every route pattern, most specific first so detail routes win over their list routes. */
export const ROUTE_PATTERNS: readonly RoutePattern[] = (Object.keys(ROUTE_TITLES) as RoutePattern[]).sort(
  (a, b) => b.split("/").length - a.split("/").length,
);

/** Result of {@link matchActiveRoute}. */
export interface NavMatch {
  group: NavGroup;
  item: NavItem;
}

/** Result of {@link resolveRoute}. */
export interface ResolvedRoute {
  pattern: RoutePattern;
  title: string;
  /** Dynamic segment values keyed by parameter name (`currency`, `transactionId`, …). */
  params: Record<string, string>;
}

/** One breadcrumb; the last crumb (current page) has no `href`. */
export interface Breadcrumb {
  label: string;
  href?: string;
}

/**
 * Canonical pathname: query and hash removed, leading slash ensured,
 * trailing slashes removed (`/dashboard/` → `/dashboard`).
 */
export function normalizePathname(pathname: string): string {
  let path = pathname.split(/[?#]/, 1)[0] ?? "";
  if (!path.startsWith("/")) path = `/${path}`;
  path = path.replace(/\/+$/, "");
  return path === "" ? "/" : path;
}

/** True when the path is the overview or any route beneath it. */
export function isDashboardPath(pathname: string): boolean {
  const path = normalizePathname(pathname);
  return path === DASHBOARD_ROOT || path.startsWith(`${DASHBOARD_ROOT}/`);
}

function itemMatchPrefix(item: NavItem): string {
  return item.activePrefix ?? item.href;
}

/**
 * The sidebar item that owns the path, including detail descendants
 * (`/dashboard/traders/abc` → Discover traders) and settings subroutes
 * (`/dashboard/settings/security` → Settings). `null` outside the dashboard
 * or for an unknown dashboard path.
 */
export function matchActiveRoute(pathname: string): NavMatch | null {
  const path = normalizePathname(pathname);
  let best: { match: NavMatch; length: number } | null = null;
  for (const group of NAV_GROUPS) {
    for (const item of group.items) {
      if (item.exact) {
        if (path === item.href && (!best || item.href.length > best.length)) {
          best = { match: { group, item }, length: item.href.length };
        }
        continue;
      }
      const prefix = itemMatchPrefix(item);
      const hit = path === prefix || path.startsWith(`${prefix}/`);
      if (hit && (!best || prefix.length > best.length)) {
        best = { match: { group, item }, length: prefix.length };
      }
    }
  }
  return best ? best.match : null;
}

/**
 * Resolve a concrete path to its route pattern and parameters, e.g.
 * `/dashboard/activity/tx-1` → `{ pattern: "/dashboard/activity/[transactionId]",
 * params: { transactionId: "tx-1" } }`. `null` for unknown paths.
 */
export function resolveRoute(pathname: string): ResolvedRoute | null {
  const segments = normalizePathname(pathname).split("/").filter(Boolean);
  for (const pattern of ROUTE_PATTERNS) {
    const parts = pattern.split("/").filter(Boolean);
    if (parts.length !== segments.length) continue;
    const params: Record<string, string> = {};
    let matched = true;
    for (let i = 0; i < parts.length; i += 1) {
      const part = parts[i];
      const segment = segments[i];
      if (part.startsWith("[") && part.endsWith("]")) {
        if (!segment) {
          matched = false;
          break;
        }
        params[part.slice(1, -1)] = decodeURIComponent(segment);
      } else if (part !== segment) {
        matched = false;
        break;
      }
    }
    if (matched) return { pattern, title: ROUTE_TITLES[pattern], params };
  }
  return null;
}

/** True when the pattern has a dynamic segment. */
export function isDetailPattern(pattern: RoutePattern): boolean {
  return pattern.includes("[");
}

/** Page title for a concrete path; "Dashboard" for unknown dashboard paths. */
export function routeTitleFor(pathname: string): string {
  return resolveRoute(pathname)?.title ?? "Dashboard";
}

/**
 * Breadcrumbs as Dashboard / Section / Page:
 *
 * - `/dashboard` → Dashboard, Overview
 * - `/dashboard/deposit` → Dashboard, Account, Deposit
 * - `/dashboard/settings/security` → Dashboard, Account tools, Settings, Security
 * - `/dashboard/traders/t1` → Dashboard, Copy trading, Discover traders, Trader profile
 * - `/dashboard/traders/t1` with `extra: [{ label: "Alex Morgan" }]` → …, Discover traders, Alex Morgan
 *
 * `extra` crumbs replace the generic detail title on a detail route and are
 * appended on any other route (a wizard step, for example). Every crumb but
 * the last carries an `href`; the last is the current page.
 */
export function breadcrumbsFor(pathname: string, extra?: ReadonlyArray<{ label: string }>): Breadcrumb[] {
  const path = normalizePathname(pathname);
  const extras = (extra ?? []).map((crumb) => ({ label: crumb.label }));
  const crumbs: Breadcrumb[] = [{ label: "Dashboard", href: DASHBOARD_ROOT }];
  const match = matchActiveRoute(path);
  if (!match) {
    return finishCrumbs(crumbs, extras);
  }
  const route = resolveRoute(path);
  const tail: Breadcrumb[] = [];
  if (route && (match.item.id === "settings" || isDetailPattern(route.pattern))) {
    // Settings tabs and detail records sit one level below their sidebar item.
    tail.push({ label: route.title });
  }
  const pageTail = extras.length > 0 && route && isDetailPattern(route.pattern) ? extras : [...tail, ...extras];
  if (match.item.id !== "overview") {
    crumbs.push({ label: match.group.label });
  }
  crumbs.push({ label: match.item.label, href: match.item.href });
  return finishCrumbs(crumbs, pageTail);
}

function finishCrumbs(crumbs: Breadcrumb[], tail: Breadcrumb[]): Breadcrumb[] {
  const all = [...crumbs, ...tail.map((crumb) => ({ label: crumb.label, href: crumb.href }))];
  const last = all[all.length - 1];
  if (last) all[all.length - 1] = { label: last.label };
  return all;
}

/** The settings tab for a path, or `null` outside `/dashboard/settings/*`. */
export function settingsTabFor(pathname: string): SettingsTab | null {
  const path = normalizePathname(pathname);
  return SETTINGS_TABS.find((tab) => path === tab.href || path.startsWith(`${tab.href}/`)) ?? null;
}
