const LOCAL_BASE = "https://crypto-index-asset.invalid";

const CUSTOMER_ROOTS = [
  "/dashboard",
  "/deposit",
  "/withdraw",
  "/transactions",
  "/settings",
  "/copy-trading/private",
] as const;

const ADMIN_ROOTS = ["/admin"] as const;
const CALLBACK_ROOTS = ["/dashboard", "/reset-password"] as const;

function belongsToRoot(pathname: string, root: string): boolean {
  return pathname === root || pathname.startsWith(`${root}/`);
}

export function sanitizeInternalPath(
  value: string | null | undefined,
  fallback: string,
  allowedRoots: readonly string[],
): string {
  if (!value || !value.startsWith("/") || value.startsWith("//")) return fallback;
  if (value.includes("\\") || /[\u0000-\u001f\u007f]/.test(value)) return fallback;

  try {
    const resolved = new URL(value, LOCAL_BASE);
    if (resolved.origin !== LOCAL_BASE) return fallback;

    const decodedPathname = decodeURIComponent(resolved.pathname);
    if (decodedPathname.startsWith("//") || decodedPathname.includes("\\")) return fallback;
    if (!allowedRoots.some((root) => belongsToRoot(decodedPathname, root))) return fallback;

    return `${resolved.pathname}${resolved.search}${resolved.hash}`;
  } catch {
    return fallback;
  }
}

export function sanitizeCustomerReturnPath(value: string | null | undefined): string {
  return sanitizeInternalPath(value, "/dashboard", CUSTOMER_ROOTS);
}

export function sanitizeAdminReturnPath(value: string | null | undefined): string {
  return sanitizeInternalPath(value, "/admin", ADMIN_ROOTS);
}

export function sanitizeAuthCallbackPath(value: string | null | undefined): string {
  return sanitizeInternalPath(value, "/dashboard", CALLBACK_ROOTS);
}

