/**
 * Deposit instructions stored as `SystemSetting` rows.
 *
 * Key: `deposit-instruction:<CURRENCY>:<networkId>`. Value: JSON validated
 * by {@link depositSettingSchema}. A missing or invalid row makes the
 * selection `unavailable`; nothing is guessed. Pure and client-safe apart
 * from the `zod` dependency.
 */

import { z } from "zod";

import { isSupportedCrypto, type DepositInstruction, type NetworkRef, type SupportedCrypto } from "../contracts";
import { DECIMAL_PATTERN } from "../money";

/** Prefix of every deposit-instruction setting key. */
export const DEPOSIT_SETTING_PREFIX = "deposit-instruction:";

/** Schema of the setting value. Optional policies are `null` when absent, never invented. */
export const depositSettingSchema = z.object({
  networkName: z.string().trim().min(1).max(80),
  address: z.string().trim().min(8).max(200),
  tag: z.string().trim().min(1).max(64).nullish(),
  minimumDeposit: z.string().trim().regex(DECIMAL_PATTERN).nullish(),
  confirmations: z.number().int().nonnegative().max(10_000).nullish(),
  notice: z.string().trim().max(500).nullish(),
  expiresAt: z.string().datetime({ offset: true }).nullish(),
});

/** Parsed setting value. */
export type DepositSetting = z.infer<typeof depositSettingSchema>;

/** Setting key for an asset/network selection. */
export function depositSettingKey(currency: SupportedCrypto, networkId: string): string {
  return `${DEPOSIT_SETTING_PREFIX}${currency}:${networkId}`;
}

const KEY_PATTERN = /^deposit-instruction:([A-Z]{3,5}):([a-z0-9-]{2,40})$/;

/** Currency and network id from a setting key, or `null` when the key is not a deposit instruction. */
export function parseDepositSettingKey(key: string): { currency: SupportedCrypto; networkId: string } | null {
  const match = KEY_PATTERN.exec(key);
  if (!match) return null;
  const [, currency, networkId] = match;
  if (!isSupportedCrypto(currency)) return null;
  return { currency, networkId };
}

/** Parse a raw JSON setting value; `null` when it is not valid JSON or fails the schema. */
export function parseDepositSetting(value: string): DepositSetting | null {
  let json: unknown;
  try {
    json = JSON.parse(value);
  } catch {
    return null;
  }
  const result = depositSettingSchema.safeParse(json);
  return result.success ? result.data : null;
}

/** Network reference described by a parsed setting. */
export function networkFromSetting(networkId: string, setting: DepositSetting): NetworkRef {
  return { id: networkId, name: setting.networkName, requiresTag: typeof setting.tag === "string" && setting.tag.length > 0 };
}

/** Deposit instruction for a selection from its parsed setting. */
export function instructionFromSetting(
  currency: SupportedCrypto,
  networkId: string,
  setting: DepositSetting,
  issuedAt: string,
): DepositInstruction {
  return {
    currency,
    network: networkFromSetting(networkId, setting),
    address: setting.address,
    tag: setting.tag ?? null,
    minimumDeposit: setting.minimumDeposit ?? null,
    confirmations: setting.confirmations ?? null,
    expiresAt: setting.expiresAt ?? null,
    notice: setting.notice ?? null,
    issuedAt,
  };
}

/**
 * Networks per currency from every deposit-instruction row. Rows whose value
 * fails validation are skipped so an invalid row never advertises a network.
 */
export function networksFromSettings(rows: ReadonlyArray<{ key: string; value: string }>): Partial<Record<SupportedCrypto, NetworkRef[]>> {
  const networks: Partial<Record<SupportedCrypto, NetworkRef[]>> = {};
  for (const row of rows) {
    const parsedKey = parseDepositSettingKey(row.key);
    if (!parsedKey) continue;
    const setting = parseDepositSetting(row.value);
    if (!setting) continue;
    const list = networks[parsedKey.currency] ?? [];
    if (!list.some((network) => network.id === parsedKey.networkId)) {
      list.push(networkFromSetting(parsedKey.networkId, setting));
    }
    networks[parsedKey.currency] = list;
  }
  return networks;
}
