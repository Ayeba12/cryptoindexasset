/**
 * Exact decimal-string arithmetic for dashboard money.
 *
 * Pure and dependency-free. Every value is a {@link DecimalString}
 * (`-?\d+(\.\d+)?`) and is handled as a scaled `BigInt`, so `0.1 + 0.2` is
 * exactly `0.3` and eight-decimal balances never lose digits. Nothing here
 * calls `parseFloat` or `Number` on a value.
 *
 * Every function throws {@link MoneyError} on invalid input instead of
 * returning `NaN`, `0` or a guess. Callers that receive untrusted strings
 * check {@link isDecimalString} first.
 *
 * Results keep the wider scale of their inputs (`add("0.10000000",
 * "0.02")` is `"0.12000000"`) so ledger precision survives arithmetic. Use
 * {@link normalize} to drop redundant zeros or {@link toFixed} to render at a
 * fixed precision.
 */

import type { DecimalString } from "./contracts";

/** Thrown for any value that is not a canonical decimal string or for an unsupported operation. */
export class MoneyError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "MoneyError";
  }
}

/** Canonical decimal string pattern: optional minus, integer digits, optional fraction. */
export const DECIMAL_PATTERN = /^-?\d+(\.\d+)?$/;

/** A parsed decimal: sign, digit parts and the scaled integer representation. */
export interface ParsedDecimal {
  /** -1 for negative non-zero values, 0 for zero, 1 for positive values. */
  sign: -1 | 0 | 1;
  /** Integer digits without sign or leading zeros (at least "0"). */
  integer: string;
  /** Fraction digits exactly as supplied (may be empty). */
  fraction: string;
  /** Number of fraction digits. */
  scale: number;
  /** Signed value multiplied by 10^scale. */
  units: bigint;
}

/** Rounding behaviour for {@link toFixed} when digits must be dropped. */
export type RoundingMode = "half-up" | "truncate" | "exact";

const ZERO = BigInt(0);
const ONE = BigInt(1);
const TEN = BigInt(10);
const TWO = BigInt(2);

function pow10(exponent: number): bigint {
  let result = ONE;
  for (let i = 0; i < exponent; i += 1) result *= TEN;
  return result;
}

function describe(value: unknown): string {
  if (typeof value === "string") return JSON.stringify(value);
  return `${typeof value}`;
}

/** Type guard: true only for a canonical decimal string. */
export function isDecimalString(value: unknown): value is DecimalString {
  return typeof value === "string" && DECIMAL_PATTERN.test(value);
}

/** Parse a decimal string into its parts. Throws {@link MoneyError} for anything else. */
export function parseDecimal(value: unknown): ParsedDecimal {
  if (!isDecimalString(value)) {
    throw new MoneyError(`Invalid decimal string: ${describe(value)}`);
  }
  const negative = value.startsWith("-");
  const body = negative ? value.slice(1) : value;
  const dot = body.indexOf(".");
  const rawInteger = dot === -1 ? body : body.slice(0, dot);
  const fraction = dot === -1 ? "" : body.slice(dot + 1);
  const magnitude = BigInt(rawInteger + fraction);
  const units = negative ? -magnitude : magnitude;
  const integer = rawInteger.replace(/^0+(?=\d)/, "");
  const sign: -1 | 0 | 1 = units === ZERO ? 0 : negative ? -1 : 1;
  return { sign, integer, fraction, scale: fraction.length, units };
}

/** Build a decimal string from scaled units. Exported for adapters that already hold BigInt values. */
export function fromUnits(units: bigint, scale: number): DecimalString {
  if (!Number.isInteger(scale) || scale < 0) {
    throw new MoneyError(`Invalid scale: ${String(scale)}`);
  }
  const negative = units < ZERO;
  let digits = (negative ? -units : units).toString();
  if (scale === 0) return (negative ? "-" : "") + digits;
  if (digits.length <= scale) digits = "0".repeat(scale - digits.length + 1) + digits;
  const integer = digits.slice(0, digits.length - scale);
  const fraction = digits.slice(digits.length - scale);
  return `${negative ? "-" : ""}${integer}.${fraction}`;
}

function align(a: ParsedDecimal, b: ParsedDecimal): { a: bigint; b: bigint; scale: number } {
  const scale = Math.max(a.scale, b.scale);
  return {
    a: a.units * pow10(scale - a.scale),
    b: b.units * pow10(scale - b.scale),
    scale,
  };
}

/**
 * Canonical form: no leading zeros on the integer part, no trailing zeros on
 * the fraction, no fraction point when the fraction is empty, and never
 * `"-0"`. `"0100.50000"` becomes `"100.5"`; `"-0.0"` becomes `"0"`.
 */
export function normalize(value: DecimalString): DecimalString {
  const parsed = parseDecimal(value);
  let units = parsed.units;
  let scale = parsed.scale;
  while (scale > 0 && units % TEN === ZERO) {
    units /= TEN;
    scale -= 1;
  }
  return fromUnits(units, scale);
}

/** Exact sum; the result keeps the wider scale of the two inputs. */
export function add(a: DecimalString, b: DecimalString): DecimalString {
  const aligned = align(parseDecimal(a), parseDecimal(b));
  return fromUnits(aligned.a + aligned.b, aligned.scale);
}

/** Exact difference `a - b`; the result keeps the wider scale of the two inputs. */
export function subtract(a: DecimalString, b: DecimalString): DecimalString {
  const aligned = align(parseDecimal(a), parseDecimal(b));
  return fromUnits(aligned.a - aligned.b, aligned.scale);
}

/** Exact sum of a list; an empty list is `"0"`. */
export function sum(values: readonly DecimalString[]): DecimalString {
  return values.reduce<DecimalString>((total, value) => add(total, value), "0");
}

/** Compare two values numerically: -1 when `a < b`, 0 when equal, 1 when `a > b`. */
export function compare(a: DecimalString, b: DecimalString): -1 | 0 | 1 {
  const aligned = align(parseDecimal(a), parseDecimal(b));
  if (aligned.a < aligned.b) return -1;
  if (aligned.a > aligned.b) return 1;
  return 0;
}

/** True when the value is below zero. `"-0.00"` is not negative. */
export function isNegative(value: DecimalString): boolean {
  return parseDecimal(value).sign === -1;
}

/** True when the value is above zero. */
export function isPositive(value: DecimalString): boolean {
  return parseDecimal(value).sign === 1;
}

/** True when the value equals zero at any scale (`"0"`, `"0.00000000"`, `"-0.0"`). */
export function isZero(value: DecimalString): boolean {
  return parseDecimal(value).sign === 0;
}

/** Sign flip; zero stays `"0…"` without a minus. */
export function negate(value: DecimalString): DecimalString {
  const parsed = parseDecimal(value);
  return fromUnits(-parsed.units, parsed.scale);
}

/** Absolute value. */
export function abs(value: DecimalString): DecimalString {
  const parsed = parseDecimal(value);
  return fromUnits(parsed.units < ZERO ? -parsed.units : parsed.units, parsed.scale);
}

/**
 * Exact product; the result scale is the sum of both scales. Intended for
 * fixture quotes (`units × price`) only. Live fiat estimates come from the
 * server with their quote timestamp.
 */
export function multiplyByDecimal(a: DecimalString, b: DecimalString): DecimalString {
  const pa = parseDecimal(a);
  const pb = parseDecimal(b);
  return fromUnits(pa.units * pb.units, pa.scale + pb.scale);
}

/**
 * Render at exactly `precision` fraction digits without floating point.
 *
 * - Fewer digits than `precision`: padded with zeros (`"1.5"` → `"1.50"`).
 * - More digits: reduced per `mode`. `"half-up"` (default) rounds half away
 *   from zero; `"truncate"` drops the extra digits; `"exact"` throws
 *   {@link MoneyError} when any dropped digit is non-zero, so callers that
 *   must never approximate can opt in.
 */
export function toFixed(value: DecimalString, precision: number, mode: RoundingMode = "half-up"): DecimalString {
  if (!Number.isInteger(precision) || precision < 0) {
    throw new MoneyError(`Invalid precision: ${String(precision)}`);
  }
  const parsed = parseDecimal(value);
  if (parsed.scale <= precision) {
    return fromUnits(parsed.units * pow10(precision - parsed.scale), precision);
  }
  const divisor = pow10(parsed.scale - precision);
  let quotient = parsed.units / divisor;
  const remainder = parsed.units % divisor;
  if (remainder !== ZERO) {
    if (mode === "exact") {
      throw new MoneyError(`Value ${JSON.stringify(value)} cannot be shown at ${precision} decimals without loss`);
    }
    if (mode === "half-up") {
      const magnitude = remainder < ZERO ? -remainder : remainder;
      if (magnitude * TWO >= divisor) quotient += parsed.units < ZERO ? -ONE : ONE;
    }
  }
  return fromUnits(quotient, precision);
}

/** Number of fraction digits in the value as written. */
export function scaleOf(value: DecimalString): number {
  return parseDecimal(value).scale;
}

/** Smallest of the values; throws on an empty list. */
export function min(values: readonly DecimalString[]): DecimalString {
  if (values.length === 0) throw new MoneyError("min() needs at least one value");
  return values.reduce((best, value) => (compare(value, best) < 0 ? value : best));
}

/** Largest of the values; throws on an empty list. */
export function max(values: readonly DecimalString[]): DecimalString {
  if (values.length === 0) throw new MoneyError("max() needs at least one value");
  return values.reduce((best, value) => (compare(value, best) > 0 ? value : best));
}
