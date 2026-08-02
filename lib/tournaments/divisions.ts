// WKF-standard tournament divisions. Source: Appendix 2 (Kata) and Appendix 3
// (Kumite) of the JKA Bangladesh tournament rulebook. Codes are stable —
// registrations reference them, so do not renumber existing entries.

export type TournamentEventType = "KATA" | "KUMITE";

export type Gender = "MALE" | "FEMALE";

export type Division = {
    code: string;
    label: string;
    eventType: TournamentEventType;
    gender: Gender;
    ageMin: number;
    ageMax: number | null; // null = no upper bound
    weightMinKg: number | null; // inclusive lower bound; null = no lower bound
    weightMaxKg: number | null; // exclusive upper bound; null = open
    isTeam: boolean;
    ageBand:
        | "U14"
        | "CADET"
        | "JUNIOR"
        | "CADET_JUNIOR"
        | "U21"
        | "SENIOR";
};

// ── KATA (Appendix 2) ────────────────────────────────────────────────────

const KATA: readonly Division[] = [
    // Team kata
    {
        code: "KATA-TEAM-SR-M",
        label: "Team Kata Senior Male (16+)",
        eventType: "KATA",
        gender: "MALE",
        ageMin: 16,
        ageMax: null,
        weightMinKg: null,
        weightMaxKg: null,
        isTeam: true,
        ageBand: "SENIOR",
    },
    {
        code: "KATA-TEAM-SR-F",
        label: "Team Kata Senior Female (16+)",
        eventType: "KATA",
        gender: "FEMALE",
        ageMin: 16,
        ageMax: null,
        weightMinKg: null,
        weightMaxKg: null,
        isTeam: true,
        ageBand: "SENIOR",
    },
    {
        code: "KATA-TEAM-CJ-M",
        label: "Team Kata Cadet & Junior Male (14 – <18)",
        eventType: "KATA",
        gender: "MALE",
        ageMin: 14,
        ageMax: 17,
        weightMinKg: null,
        weightMaxKg: null,
        isTeam: true,
        ageBand: "CADET_JUNIOR",
    },
    {
        code: "KATA-TEAM-CJ-F",
        label: "Team Kata Cadet & Junior Female (14 – <18)",
        eventType: "KATA",
        gender: "FEMALE",
        ageMin: 14,
        ageMax: 17,
        weightMinKg: null,
        weightMaxKg: null,
        isTeam: true,
        ageBand: "CADET_JUNIOR",
    },
    // Individual kata — Senior
    {
        code: "KATA-IND-SR-M",
        label: "Individual Kata Senior Male (16+)",
        eventType: "KATA",
        gender: "MALE",
        ageMin: 16,
        ageMax: null,
        weightMinKg: null,
        weightMaxKg: null,
        isTeam: false,
        ageBand: "SENIOR",
    },
    {
        code: "KATA-IND-SR-F",
        label: "Individual Kata Senior Female (16+)",
        eventType: "KATA",
        gender: "FEMALE",
        ageMin: 16,
        ageMax: null,
        weightMinKg: null,
        weightMaxKg: null,
        isTeam: false,
        ageBand: "SENIOR",
    },
    // Individual kata — U21
    {
        code: "KATA-IND-U21-M",
        label: "Individual Kata U21 Male (18 – <21)",
        eventType: "KATA",
        gender: "MALE",
        ageMin: 18,
        ageMax: 20,
        weightMinKg: null,
        weightMaxKg: null,
        isTeam: false,
        ageBand: "U21",
    },
    {
        code: "KATA-IND-U21-F",
        label: "Individual Kata U21 Female (18 – <21)",
        eventType: "KATA",
        gender: "FEMALE",
        ageMin: 18,
        ageMax: 20,
        weightMinKg: null,
        weightMaxKg: null,
        isTeam: false,
        ageBand: "U21",
    },
    // Individual kata — Junior
    {
        code: "KATA-IND-JR-M",
        label: "Individual Kata Junior Male (16 – <18)",
        eventType: "KATA",
        gender: "MALE",
        ageMin: 16,
        ageMax: 17,
        weightMinKg: null,
        weightMaxKg: null,
        isTeam: false,
        ageBand: "JUNIOR",
    },
    {
        code: "KATA-IND-JR-F",
        label: "Individual Kata Junior Female (16 – <18)",
        eventType: "KATA",
        gender: "FEMALE",
        ageMin: 16,
        ageMax: 17,
        weightMinKg: null,
        weightMaxKg: null,
        isTeam: false,
        ageBand: "JUNIOR",
    },
    // Individual kata — Cadet
    {
        code: "KATA-IND-CDT-M",
        label: "Individual Cadet Kata Male (14 – <16)",
        eventType: "KATA",
        gender: "MALE",
        ageMin: 14,
        ageMax: 15,
        weightMinKg: null,
        weightMaxKg: null,
        isTeam: false,
        ageBand: "CADET",
    },
    {
        code: "KATA-IND-CDT-F",
        label: "Individual Cadet Kata Female (14 – <16)",
        eventType: "KATA",
        gender: "FEMALE",
        ageMin: 14,
        ageMax: 15,
        weightMinKg: null,
        weightMaxKg: null,
        isTeam: false,
        ageBand: "CADET",
    },
    // Youth kata — U14
    {
        code: "KATA-IND-U14-M",
        label: "Youth Kata U14 Male (12 – <14)",
        eventType: "KATA",
        gender: "MALE",
        ageMin: 12,
        ageMax: 13,
        weightMinKg: null,
        weightMaxKg: null,
        isTeam: false,
        ageBand: "U14",
    },
    {
        code: "KATA-IND-U14-F",
        label: "Youth Kata U14 Female (12 – <14)",
        eventType: "KATA",
        gender: "FEMALE",
        ageMin: 12,
        ageMax: 13,
        weightMinKg: null,
        weightMaxKg: null,
        isTeam: false,
        ageBand: "U14",
    },
] as const;

// ── KUMITE (Appendix 3) ──────────────────────────────────────────────────
// Weight ranges use `weightMaxKg` as exclusive upper bound (e.g. −60 kg means
// weightKg < 60). The final "+X kg" entry uses weightMinKg = X and no max.

type KumiteRow = {
    ageBand: Division["ageBand"];
    ageMin: number;
    ageMax: number | null;
    male: number[]; // ordered thresholds; last item = min for open class
    female: number[];
    labelPrefix: string;
};

const KUMITE_ROWS: readonly KumiteRow[] = [
    {
        ageBand: "SENIOR",
        ageMin: 18,
        ageMax: null,
        male: [60, 67, 75, 84],
        female: [50, 55, 61, 68],
        labelPrefix: "Senior",
    },
    {
        ageBand: "U21",
        ageMin: 18,
        ageMax: 20,
        male: [60, 67, 75, 84],
        female: [50, 55, 61, 68],
        labelPrefix: "U21",
    },
    {
        ageBand: "JUNIOR",
        ageMin: 16,
        ageMax: 17,
        male: [55, 61, 68, 76],
        female: [48, 53, 59, 66],
        labelPrefix: "Junior",
    },
    {
        ageBand: "CADET",
        ageMin: 14,
        ageMax: 15,
        male: [52, 57, 63, 70],
        female: [47, 54, 61],
        labelPrefix: "Cadet",
    },
    {
        ageBand: "U14",
        ageMin: 12,
        ageMax: 13,
        male: [40, 45, 50, 55],
        female: [42, 47, 52],
        labelPrefix: "U14",
    },
];

function buildKumite(): Division[] {
    const out: Division[] = [];
    for (const row of KUMITE_ROWS) {
        for (const gender of ["MALE", "FEMALE"] as const) {
            const cuts = gender === "MALE" ? row.male : row.female;
            const genderLabel = gender === "MALE" ? "Male" : "Female";
            const codeGender = gender === "MALE" ? "M" : "F";
            for (let i = 0; i < cuts.length; i++) {
                const max = cuts[i];
                out.push({
                    code: `KUMITE-${row.ageBand}-${codeGender}-U${max}`,
                    label: `${row.labelPrefix} ${genderLabel} −${max} kg`,
                    eventType: "KUMITE",
                    gender,
                    ageMin: row.ageMin,
                    ageMax: row.ageMax,
                    weightMinKg: i === 0 ? null : cuts[i - 1],
                    weightMaxKg: max,
                    isTeam: false,
                    ageBand: row.ageBand,
                });
            }
            // Open weight ( +last )
            const openMin = cuts[cuts.length - 1];
            out.push({
                code: `KUMITE-${row.ageBand}-${codeGender}-O${openMin}`,
                label: `${row.labelPrefix} ${genderLabel} +${openMin} kg`,
                eventType: "KUMITE",
                gender,
                ageMin: row.ageMin,
                ageMax: row.ageMax,
                weightMinKg: openMin,
                weightMaxKg: null,
                isTeam: false,
                ageBand: row.ageBand,
            });
        }
    }
    return out;
}

const KUMITE: readonly Division[] = buildKumite();

// ── Public API ───────────────────────────────────────────────────────────

export const ALL_DIVISIONS: readonly Division[] = [...KATA, ...KUMITE];

const BY_CODE = new Map(ALL_DIVISIONS.map((d) => [d.code, d]));

export function getDivision(code: string): Division | undefined {
    return BY_CODE.get(code);
}

export function divisionsFor(eventType: TournamentEventType): readonly Division[] {
    return eventType === "KATA" ? KATA : KUMITE;
}

// ── Custom (admin-defined) divisions ────────────────────────────────────
// Custom divisions live on `TournamentDetail.customDivisions` as JSON. They
// carry no age/weight bounds — the admin's label is the whole spec — so
// eligibility for them is not enforced beyond gender.

export type CustomDivision = {
    code: string;
    label: string;
    eventType: TournamentEventType;
    isTeam: boolean;
};

const CUSTOM_CODE_PREFIX = "CUSTOM-";

function slugify(label: string): string {
    return label
        .toLowerCase()
        .normalize("NFKD")
        .replace(/[̀-ͯ]/g, "")
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "")
        .slice(0, 40);
}

// Deterministic-ish code — good enough for the admin form to pre-populate a
// code so the picker key is stable across renders. Duplicates within one event
// are de-duped by the admin form before save.
export function makeCustomDivisionCode(
    label: string,
    eventType: TournamentEventType,
): string {
    const slug = slugify(label) || Math.random().toString(36).slice(2, 8);
    return `${CUSTOM_CODE_PREFIX}${eventType}-${slug}`;
}

export function isCustomDivisionCode(code: string): boolean {
    return code.startsWith(CUSTOM_CODE_PREFIX);
}

// Parse a raw JSON value (as stored on TournamentDetail.customDivisions) into
// a typed array. Anything malformed is dropped rather than throwing.
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
        const isTeam = typeof rec.isTeam === "boolean" ? rec.isTeam : false;
        if (!code || !label || !eventType) continue;
        out.push({ code, label, eventType, isTeam });
    }
    return out;
}

// Custom divisions are shaped like a Division so the participant form and
// the reporting UI can treat them uniformly. Age/weight bounds are open, so
// the WKF eligibility checks pass trivially — only gender is enforced.
export function customToDivision(c: CustomDivision): Division {
    return {
        code: c.code,
        label: c.label,
        eventType: c.eventType,
        gender: "MALE", // placeholder; see resolveDivision — custom rows aren't
        // gender-locked. The registration form treats a custom code as valid
        // for both genders and skips the gender check.
        ageMin: 0,
        ageMax: null,
        weightMinKg: null,
        weightMaxKg: null,
        isTeam: c.isTeam,
        ageBand: "SENIOR",
    };
}

// Look a division up by code, checking the WKF preset first then the event's
// admin-defined extras. Returns null if the code isn't recognised.
export function resolveDivision(
    code: string,
    customDivisions?: readonly CustomDivision[] | null,
): Division | null {
    const preset = getDivision(code);
    if (preset) return preset;
    if (!customDivisions) return null;
    const custom = customDivisions.find((c) => c.code === code);
    return custom ? customToDivision(custom) : null;
}

// Compute the participant's age at the tournament date to match the WKF rule
// (bands use age on the day of competition).
export function ageOnDate(dob: Date, on: Date): number {
    let age = on.getFullYear() - dob.getFullYear();
    const m = on.getMonth() - dob.getMonth();
    if (m < 0 || (m === 0 && on.getDate() < dob.getDate())) age--;
    return age;
}

export type EligibilityIssue =
    | "wrong-event-type"
    | "wrong-gender"
    | "age-below-min"
    | "age-above-max"
    | "weight-below-min"
    | "weight-above-max"
    | "weight-required";

export function checkDivisionEligibility(
    division: Division,
    entrant: {
        gender: Gender;
        dob: Date;
        eventDate: Date;
        weightKg?: number | null;
    },
): EligibilityIssue | null {
    // Custom (admin-defined) divisions carry no age/weight/gender spec, so
    // eligibility is always ok for them — the admin owns the rules.
    if (isCustomDivisionCode(division.code)) return null;

    if (division.gender !== entrant.gender) return "wrong-gender";

    const age = ageOnDate(entrant.dob, entrant.eventDate);
    if (age < division.ageMin) return "age-below-min";
    if (division.ageMax !== null && age > division.ageMax) return "age-above-max";

    if (division.eventType === "KUMITE") {
        if (entrant.weightKg == null) return "weight-required";
        if (
            division.weightMinKg !== null &&
            entrant.weightKg < division.weightMinKg
        ) {
            return "weight-below-min";
        }
        if (
            division.weightMaxKg !== null &&
            entrant.weightKg >= division.weightMaxKg
        ) {
            return "weight-above-max";
        }
    }
    return null;
}
