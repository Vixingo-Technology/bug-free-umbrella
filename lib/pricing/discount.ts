// Shared helpers for typed discounts. A discount is either a percentage
// (0–100, 2dp) applied to a base amount, or a flat BDT amount that is
// subtracted from the base. Import from both client and server code — no
// runtime deps beyond stdlib.

export type DiscountType = "PERCENT" | "FIXED";

export function isDiscountType(v: unknown): v is DiscountType {
    return v === "PERCENT" || v === "FIXED";
}

export function coerceDiscountType(v: unknown): DiscountType {
    return isDiscountType(v) ? v : "PERCENT";
}

const round2 = (n: number) => Math.round(n * 100) / 100;

/**
 * Apply a typed discount to a base amount. Returns the amount payable
 * after the discount, floored at 0 and rounded to 2dp. Zero-or-negative
 * inputs pass through unchanged.
 */
export function applyTypedDiscount(
    base: number,
    type: DiscountType,
    value: number,
): number {
    if (!Number.isFinite(base) || base <= 0) return base;
    if (!Number.isFinite(value) || value <= 0) return base;
    if (type === "FIXED") {
        return Math.max(0, round2(base - value));
    }
    const pct = Math.max(0, Math.min(100, value));
    return Math.max(0, round2(base * (1 - pct / 100)));
}

/**
 * The savings amount produced by a typed discount on a base amount —
 * i.e. `base - applyTypedDiscount(base, type, value)`. Rounded to 2dp.
 */
export function typedDiscountSavings(
    base: number,
    type: DiscountType,
    value: number,
): number {
    const after = applyTypedDiscount(base, type, value);
    return round2(base - after);
}

/**
 * Human-readable label for a typed discount value — e.g. "-12.5%" or
 * "-৳500". Returns an empty string for zero / non-positive values.
 */
export function formatTypedDiscount(
    type: DiscountType,
    value: number,
): string {
    if (!Number.isFinite(value) || value <= 0) return "";
    if (type === "FIXED") return `−৳${round2(value).toLocaleString()}`;
    return `−${round2(Math.min(100, value))}%`;
}
