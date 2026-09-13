/**
 * Allowlisted block-explorer mapping.
 *
 * An explorer link is built only from a confirmed network id and a
 * transaction hash that matches the network's hash pattern. Arbitrary
 * transaction fields never become external URLs. Client-safe and pure; used
 * by the live mappers and the fixtures alike.
 */

/** Explorer base URL and hash pattern per confirmed network id. */
export const EXPLORER_ALLOWLIST: Readonly<Record<string, { base: string; hashPattern: RegExp }>> = {
  bitcoin: { base: "https://mempool.space/tx/", hashPattern: /^[0-9a-f]{64}$/ },
  ethereum: { base: "https://etherscan.io/tx/", hashPattern: /^0x[0-9a-f]{64}$/ },
};

/** Explorer URL for a hash on an allowlisted network, otherwise `null`. */
export function explorerUrlFor(networkId: string | null | undefined, txHash: string | null | undefined): string | null {
  if (!networkId || !txHash) return null;
  const entry = Object.prototype.hasOwnProperty.call(EXPLORER_ALLOWLIST, networkId)
    ? EXPLORER_ALLOWLIST[networkId]
    : undefined;
  if (!entry) return null;
  const hash = txHash.trim().toLowerCase();
  if (!entry.hashPattern.test(hash)) return null;
  return `${entry.base}${hash}`;
}
