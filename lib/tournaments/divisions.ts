// Event divisions. All divisions are admin-defined ("custom") per event —
// there is no WKF preset picker in the app. Codes are stable identifiers
// stored on registrations; do not rename them once an event is published.
//
// Divisions are no longer kata/kumite specific — the admin just gives each
// division a name and gates (age / belt / fees). `eventType` is retained
// on the type for backward compatibility with older rows but is not
// surfaced in the current UI; new divisions default to "KATA".

export type TournamentEventType = "KATA" | "KUMITE";

export type Gender = "MALE" | "FEMALE";

export type DivisionGender = "MALE" | "FEMALE" | "ANY";

// A single fee inside a division. `required` fees are always billed to
// the participant; `!required` fees are opt-in add-ons at registration.
// `memberDiscountPercent` (0-100) is applied to this fee's amount when a
// signed-in JKA member with an active membership registers; 0 = no
// discount on this fee.
export type DivisionFee = {
    id: string;
    name: string;
    amountBdt: number;
    required: boolean;
    memberDiscountPercent: number;
};

// A division on an event. `code` is a stable slug; `label` is the display
// name. Optional gates: `minAge` (years on the event date) and `minRankId`
// (belt_ranks.id). `fees` is the current source of truth for pricing;
// `priceBdt` is a legacy fallback (equal to sum of required fees) kept so
// older code paths keep working.
export type CustomDivision = {
    code: string;
    label: string;
    eventType: TournamentEventType;
    gender: DivisionGender;
    isTeam: boolean;
    minAge: number | null;
    minRankId: string | null;
    priceBdt: number | null;
    fees: DivisionFee[];
};

const CUSTOM_CODE_PREFIX = "DIV-";

function slugify(label: string): string {
    return label
        .toLowerCase()
        .normalize("NFKD")
        .replace(/[̀-ͯ]/g, "")
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "")
        .slice(0, 40);
}

// Deterministic code from label + type so the admin form's per-row key is
// stable across re-renders. Collisions inside a single event are rejected
// by the server action.
export function makeCustomDivisionCode(
    label: string,
    eventType: TournamentEventType,
): string {
    const slug = slugify(label) || Math.random().toString(36).slice(2, 8);
    return `${CUSTOM_CODE_PREFIX}${eventType}-${slug}`;
}

export function isCustomDivisionCode(code: string): boolean {
    // Also accept the legacy "CUSTOM-" prefix from earlier writes.
    return code.startsWith(CUSTOM_CODE_PREFIX) || code.startsWith("CUSTOM-");
}

function parseFees(raw: unknown): DivisionFee[] {
    if (!Array.isArray(raw)) return [];
    const out: DivisionFee[] = [];
    for (const r of raw) {
        if (!r || typeof r !== "object") continue;
        const rec = r as Record<string, unknown>;
        const name = typeof rec.name === "string" ? rec.name.trim() : "";
        if (!name) continue;
        const amountRaw = rec.amountBdt ?? rec.amount;
        const amount =
            typeof amountRaw === "number" && Number.isFinite(amountRaw)
                ? Math.round(amountRaw * 100) / 100
                : 0;
        const id =
            typeof rec.id === "string" && rec.id
                ? rec.id
                : Math.random().toString(36).slice(2, 10);
        const discountRaw = rec.memberDiscountPercent;
        let memberDiscountPercent = 0;
        if (typeof discountRaw === "number" && Number.isFinite(discountRaw)) {
            memberDiscountPercent = Math.max(0, Math.min(100, Math.trunc(discountRaw)));
        }
        out.push({
            id,
            name,
            amountBdt: amount < 0 ? 0 : amount,
            required: rec.required !== false,
            memberDiscountPercent,
        });
    }
    return out;
}

export function sumRequiredFees(fees: readonly DivisionFee[]): number {
    let total = 0;
    for (const f of fees) if (f.required) total += f.amountBdt;
    return Math.round(total * 100) / 100;
}

// Amount billed for a single fee, applying the fee's own member discount
// when the payer is an active JKA member. Rounded to 2dp.
export function feeAmountAfterMemberDiscount(
    fee: DivisionFee,
    isMember: boolean,
): number {
    if (!isMember || fee.memberDiscountPercent <= 0) {
        return Math.round(fee.amountBdt * 100) / 100;
    }
    const pct = Math.min(100, Math.max(0, fee.memberDiscountPercent));
    return Math.round(fee.amountBdt * (1 - pct / 100) * 100) / 100;
}

// Base price for a division — sum of required fees when the division has
// them; otherwise the legacy priceBdt field (may be null = free).
export function divisionBasePrice(d: CustomDivision): number {
    if (d.fees && d.fees.length > 0) return sumRequiredFees(d.fees);
    return d.priceBdt ?? 0;
}

// Parse the raw JSON stored on TournamentDetail.customDivisions. Anything
// malformed is dropped rather than throwing.
export function parseCustomDivisions(raw: unknown): CustomDivision[] {
    if (!Array.isArray(raw)) return [];
    const out: CustomDivision[] = [];
    for (const r of raw) {
        if (!r || typeof r !== "object") continue;
        const rec = r as Record<string, unknown>;
        const code = typeof rec.code === "string" ? rec.code : null;
        const label = typeof rec.label === "string" ? rec.label : null;
        // Older rows may omit eventType; treat missing as KATA so pricing
        // and lookups continue to work.
        const eventType: TournamentEventType =
            rec.eventType === "KUMITE" ? "KUMITE" : "KATA";
        if (!code || !label) continue;
        const gender: DivisionGender =
            rec.gender === "MALE" || rec.gender === "FEMALE"
                ? rec.gender
                : "ANY";
        const isTeam = typeof rec.isTeam === "boolean" ? rec.isTeam : false;
        const minAge =
            typeof rec.minAge === "number" && Number.isFinite(rec.minAge)
                ? Math.trunc(rec.minAge)
                : null;
        const minRankId =
            typeof rec.minRankId === "string" && rec.minRankId
                ? rec.minRankId
                : null;
        const fees = parseFees(rec.fees);
        // If the row supplies fees, derive priceBdt from the required ones so
        // legacy consumers (which read priceBdt directly) keep working.
        const legacyPrice =
            typeof rec.priceBdt === "number" && Number.isFinite(rec.priceBdt)
                ? Math.round(rec.priceBdt * 100) / 100
                : null;
        const priceBdt =
            fees.length > 0 ? sumRequiredFees(fees) : legacyPrice;
        out.push({
            code,
            label,
            eventType,
            gender,
            isTeam,
            minAge,
            minRankId,
            priceBdt,
            fees,
        });
    }
    return out;
}

// Find a division by code within a set of custom divisions.
export function resolveDivision(
    code: string,
    customDivisions?: readonly CustomDivision[] | null,
): CustomDivision | null {
    if (!customDivisions) return null;
    return customDivisions.find((c) => c.code === code) ?? null;
}

// Age at a given date — used to enforce a division's minAge on the event
// date (the same rule used by WKF-style age bands).
export function ageOnDate(dob: Date, on: Date): number {
    let age = on.getFullYear() - dob.getFullYear();
    const m = on.getMonth() - dob.getMonth();
    if (m < 0 || (m === 0 && on.getDate() < dob.getDate())) age--;
    return age;
}

export type EligibilityIssue =
    | "age-below-min"
    | "rank-below-min"
    | "weight-required";

// Check that a would-be entrant satisfies the division's gates. Gender is
// not enforced — admins pick who competes, and the current schema doesn't
// require gender-split divisions. Kumite divisions still require a weight
// value (used at weigh-in), even though weight isn't validated against a
// bracket.
export function checkDivisionEligibility(
    division: CustomDivision,
    entrant: {
        dob: Date;
        eventDate: Date;
        weightKg?: number | null;
        rankOrderIndex?: number | null;
    },
    ranks?: readonly { id: string; orderIndex: number }[],
): EligibilityIssue | null {
    if (division.minAge !== null) {
        const age = ageOnDate(entrant.dob, entrant.eventDate);
        if (age < division.minAge) return "age-below-min";
    }
    if (division.minRankId && ranks) {
        const required = ranks.find((r) => r.id === division.minRankId);
        if (required) {
            const have = entrant.rankOrderIndex;
            if (have === null || have === undefined || have < required.orderIndex) {
                return "rank-below-min";
            }
        }
    }
    if (
        division.eventType === "KUMITE" &&
        (entrant.weightKg === null || entrant.weightKg === undefined)
    ) {
        return "weight-required";
    }
    return null;
}
