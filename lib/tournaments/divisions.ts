// Event divisions. All divisions are admin-defined ("custom") per event —
// there is no WKF preset picker in the app. Codes are stable identifiers
// stored on registrations; do not rename them once an event is published.

export type TournamentEventType = "KATA" | "KUMITE";

export type Gender = "MALE" | "FEMALE";

// A division on an event. `code` is a stable slug; `label` is the display
// name. Optional gates apply on top of the label: gender restricts entry
// (ANY = no restriction), minAge (years on the event date) and minRankId
// (belt_ranks.id) further limit who may enter. `priceBdt` is the entry fee
// for this division (0/null = free entry).
export type DivisionGender = "MALE" | "FEMALE" | "ANY";

export type CustomDivision = {
    code: string;
    label: string;
    eventType: TournamentEventType;
    gender: DivisionGender;
    isTeam: boolean;
    minAge: number | null;
    minRankId: string | null;
    priceBdt: number | null;
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
        const eventType =
            rec.eventType === "KATA" || rec.eventType === "KUMITE"
                ? (rec.eventType as TournamentEventType)
                : null;
        if (!code || !label || !eventType) continue;
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
        const priceBdt =
            typeof rec.priceBdt === "number" && Number.isFinite(rec.priceBdt)
                ? Math.round(rec.priceBdt * 100) / 100
                : null;
        out.push({
            code,
            label,
            eventType,
            gender,
            isTeam,
            minAge,
            minRankId,
            priceBdt,
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
