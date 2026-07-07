import { MEMBERSHIP_DURATION_YEARS } from "@/lib/constants";

/**
 * Return the new expiry date after renewal.
 *
 * Renewing early should NOT throw away the remaining days on the current
 * subscription — we anchor to the later of `now` and the existing expiry,
 * then add the membership duration. Expired members restart from today.
 */
export function extendExpiry(
    current: Date | null | undefined,
    years: number = MEMBERSHIP_DURATION_YEARS,
): Date {
    const now = new Date();
    const currentMs = current ? new Date(current).getTime() : 0;
    const anchor = new Date(Math.max(currentMs, now.getTime()));
    anchor.setFullYear(anchor.getFullYear() + years);
    return anchor;
}
