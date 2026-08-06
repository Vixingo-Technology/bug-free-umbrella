import "server-only";
import {
    parseCustomDivisions,
    resolveDivision,
    feeAmountAfterMemberDiscount,
} from "@/lib/tournaments/divisions";
import { applyDiscount } from "@/lib/auth/is-jka-member";

// Snapshot rows written on register: [{ id, name, amountBdt }]. The id
// matches a DivisionFee.id and lets us re-derive which optional fees the
// participant picked without trusting the snapshot amounts (which we only
// use as a display hint elsewhere).
type PickedFee = { id: string; name: string; amountBdt: number };

function parsePickedFees(raw: unknown): PickedFee[] {
    if (!Array.isArray(raw)) return [];
    return raw
        .filter((r): r is Record<string, unknown> => !!r && typeof r === "object")
        .map((r) => ({
            id: typeof r.id === "string" ? r.id : "",
            name: typeof r.name === "string" ? r.name : "",
            amountBdt:
                typeof r.amountBdt === "number"
                    ? r.amountBdt
                    : Number(r.amountBdt ?? 0),
        }))
        .filter((f) => f.id && f.name);
}

const round2 = (n: number) => Math.round(n * 100) / 100;

export type EventPricingContext = {
    ticketPrice: number | null;
    multiDivisionDiscountPercent: number;
    customDivisions: unknown;
};

export type PricingRow = {
    divisionCode: string | null;
    selectedOptionalFees: unknown;
};

/**
 * Recompute the payable amount for a whole registration group from the row
 * snapshots + current event data. Mirrors the per-row math in
 * `registerForTournamentAction`: per-division required fees + picked opt-in
 * fees (member discount per fee), sum, apply multi-division discount when
 * 2+ rows, then add the event-wide base ticket ONCE for the group.
 *
 * We recompute rather than sum stored `amountDue` because the base ticket is
 * allocated to a single row at registration; when siblings drop out (existing
 * rows skipped, or a partial cancel) the surviving rows' stored amounts no
 * longer cover the full group total.
 */
export function computeGroupPayable(
    rows: readonly PricingRow[],
    event: EventPricingContext,
    isMember: boolean,
): number {
    const customDivisions = parseCustomDivisions(event.customDivisions);
    const includedRows = rows.filter((r) => r.divisionCode !== null);

    let divisionsSubtotal = 0;
    for (const row of includedRows) {
        const division = resolveDivision(row.divisionCode!, customDivisions);
        if (!division) continue;

        const pickedIds = new Set(
            parsePickedFees(row.selectedOptionalFees).map((f) => f.id),
        );

        let effective = 0;
        if (division.fees && division.fees.length > 0) {
            for (const f of division.fees) {
                const isActive = f.required || pickedIds.has(f.id);
                if (isActive) {
                    effective += feeAmountAfterMemberDiscount(f, isMember);
                }
            }
        } else {
            effective = division.priceBdt ?? 0;
        }

        if (effective > 0 && includedRows.length >= 2) {
            effective = applyDiscount(
                effective,
                event.multiDivisionDiscountPercent,
            );
        }
        divisionsSubtotal += round2(effective);
    }
    divisionsSubtotal = round2(divisionsSubtotal);

    const ticketAmount =
        event.ticketPrice !== null && event.ticketPrice > 0
            ? round2(event.ticketPrice)
            : 0;

    return round2(divisionsSubtotal + ticketAmount);
}
