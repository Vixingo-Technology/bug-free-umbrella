// Built-in WKF (World Karate Federation) division presets. Admins can
// import any subset of these into an event's divisions block. Presets are
// pure data — imported divisions are copied into the event with fresh
// codes and empty fee lists so the admin can price each one.
//
// Age bands and kumite weight classes follow the current WKF competition
// rules (individual kata & kumite). Team kata is offered as a single
// division per age band and has no weight requirement.

import type { CustomDivision, TournamentEventType, DivisionGender } from "./divisions";

export type WkfPreset = {
    id: string;
    label: string;
    eventType: TournamentEventType;
    gender: DivisionGender;
    isTeam: boolean;
    minAge: number | null;
    maxAge: number | null;
    minWeightKg: number | null;
    maxWeightKg: number | null;
    group: string;
};

// Category groups shown in the picker.
export const WKF_GROUPS = [
    "Individual Kata",
    "Team Kata",
    "Kumite — Cadet (U16)",
    "Kumite — Junior (U18)",
    "Kumite — U21",
    "Kumite — Senior",
] as const;

function p(
    id: string,
    label: string,
    group: (typeof WKF_GROUPS)[number],
    eventType: TournamentEventType,
    gender: DivisionGender,
    isTeam: boolean,
    minAge: number | null,
    maxAge: number | null,
    minWeightKg: number | null,
    maxWeightKg: number | null,
): WkfPreset {
    return {
        id,
        label,
        group,
        eventType,
        gender,
        isTeam,
        minAge,
        maxAge,
        minWeightKg,
        maxWeightKg,
    };
}

export const WKF_PRESETS: WkfPreset[] = [
    // Individual Kata — age-banded, split by gender.
    p("kata-ind-u12-male", "Kata Individual U12 Male", "Individual Kata", "KATA", "MALE", false, null, 11, null, null),
    p("kata-ind-u12-female", "Kata Individual U12 Female", "Individual Kata", "KATA", "FEMALE", false, null, 11, null, null),
    p("kata-ind-u14-male", "Kata Individual U14 Male", "Individual Kata", "KATA", "MALE", false, 12, 13, null, null),
    p("kata-ind-u14-female", "Kata Individual U14 Female", "Individual Kata", "KATA", "FEMALE", false, 12, 13, null, null),
    p("kata-ind-cadet-male", "Kata Individual Cadet Male (14-15)", "Individual Kata", "KATA", "MALE", false, 14, 15, null, null),
    p("kata-ind-cadet-female", "Kata Individual Cadet Female (14-15)", "Individual Kata", "KATA", "FEMALE", false, 14, 15, null, null),
    p("kata-ind-junior-male", "Kata Individual Junior Male (16-17)", "Individual Kata", "KATA", "MALE", false, 16, 17, null, null),
    p("kata-ind-junior-female", "Kata Individual Junior Female (16-17)", "Individual Kata", "KATA", "FEMALE", false, 16, 17, null, null),
    p("kata-ind-u21-male", "Kata Individual U21 Male (18-20)", "Individual Kata", "KATA", "MALE", false, 18, 20, null, null),
    p("kata-ind-u21-female", "Kata Individual U21 Female (18-20)", "Individual Kata", "KATA", "FEMALE", false, 18, 20, null, null),
    p("kata-ind-senior-male", "Kata Individual Senior Male (18+)", "Individual Kata", "KATA", "MALE", false, 18, null, null, null),
    p("kata-ind-senior-female", "Kata Individual Senior Female (18+)", "Individual Kata", "KATA", "FEMALE", false, 18, null, null, null),

    // Team Kata — 3-person, single gender per team, no weight.
    p("kata-team-cadet-male", "Kata Team Cadet Male (14-15)", "Team Kata", "KATA", "MALE", true, 14, 15, null, null),
    p("kata-team-cadet-female", "Kata Team Cadet Female (14-15)", "Team Kata", "KATA", "FEMALE", true, 14, 15, null, null),
    p("kata-team-junior-male", "Kata Team Junior Male (16-17)", "Team Kata", "KATA", "MALE", true, 16, 17, null, null),
    p("kata-team-junior-female", "Kata Team Junior Female (16-17)", "Team Kata", "KATA", "FEMALE", true, 16, 17, null, null),
    p("kata-team-senior-male", "Kata Team Senior Male (18+)", "Team Kata", "KATA", "MALE", true, 18, null, null, null),
    p("kata-team-senior-female", "Kata Team Senior Female (18+)", "Team Kata", "KATA", "FEMALE", true, 18, null, null, null),

    // Cadet Kumite (U16 — 14-15 yrs)
    p("kumite-cadet-m-52", "Kumite Cadet Male -52 kg", "Kumite — Cadet (U16)", "KUMITE", "MALE", false, 14, 15, null, 52),
    p("kumite-cadet-m-57", "Kumite Cadet Male -57 kg", "Kumite — Cadet (U16)", "KUMITE", "MALE", false, 14, 15, 52.01, 57),
    p("kumite-cadet-m-63", "Kumite Cadet Male -63 kg", "Kumite — Cadet (U16)", "KUMITE", "MALE", false, 14, 15, 57.01, 63),
    p("kumite-cadet-m-70", "Kumite Cadet Male -70 kg", "Kumite — Cadet (U16)", "KUMITE", "MALE", false, 14, 15, 63.01, 70),
    p("kumite-cadet-m-70p", "Kumite Cadet Male +70 kg", "Kumite — Cadet (U16)", "KUMITE", "MALE", false, 14, 15, 70.01, null),
    p("kumite-cadet-f-47", "Kumite Cadet Female -47 kg", "Kumite — Cadet (U16)", "KUMITE", "FEMALE", false, 14, 15, null, 47),
    p("kumite-cadet-f-54", "Kumite Cadet Female -54 kg", "Kumite — Cadet (U16)", "KUMITE", "FEMALE", false, 14, 15, 47.01, 54),
    p("kumite-cadet-f-54p", "Kumite Cadet Female +54 kg", "Kumite — Cadet (U16)", "KUMITE", "FEMALE", false, 14, 15, 54.01, null),

    // Junior Kumite (U18 — 16-17 yrs)
    p("kumite-junior-m-55", "Kumite Junior Male -55 kg", "Kumite — Junior (U18)", "KUMITE", "MALE", false, 16, 17, null, 55),
    p("kumite-junior-m-61", "Kumite Junior Male -61 kg", "Kumite — Junior (U18)", "KUMITE", "MALE", false, 16, 17, 55.01, 61),
    p("kumite-junior-m-68", "Kumite Junior Male -68 kg", "Kumite — Junior (U18)", "KUMITE", "MALE", false, 16, 17, 61.01, 68),
    p("kumite-junior-m-76", "Kumite Junior Male -76 kg", "Kumite — Junior (U18)", "KUMITE", "MALE", false, 16, 17, 68.01, 76),
    p("kumite-junior-m-76p", "Kumite Junior Male +76 kg", "Kumite — Junior (U18)", "KUMITE", "MALE", false, 16, 17, 76.01, null),
    p("kumite-junior-f-48", "Kumite Junior Female -48 kg", "Kumite — Junior (U18)", "KUMITE", "FEMALE", false, 16, 17, null, 48),
    p("kumite-junior-f-53", "Kumite Junior Female -53 kg", "Kumite — Junior (U18)", "KUMITE", "FEMALE", false, 16, 17, 48.01, 53),
    p("kumite-junior-f-59", "Kumite Junior Female -59 kg", "Kumite — Junior (U18)", "KUMITE", "FEMALE", false, 16, 17, 53.01, 59),
    p("kumite-junior-f-66", "Kumite Junior Female -66 kg", "Kumite — Junior (U18)", "KUMITE", "FEMALE", false, 16, 17, 59.01, 66),
    p("kumite-junior-f-66p", "Kumite Junior Female +66 kg", "Kumite — Junior (U18)", "KUMITE", "FEMALE", false, 16, 17, 66.01, null),

    // U21 Kumite (18-20 yrs)
    p("kumite-u21-m-60", "Kumite U21 Male -60 kg", "Kumite — U21", "KUMITE", "MALE", false, 18, 20, null, 60),
    p("kumite-u21-m-67", "Kumite U21 Male -67 kg", "Kumite — U21", "KUMITE", "MALE", false, 18, 20, 60.01, 67),
    p("kumite-u21-m-75", "Kumite U21 Male -75 kg", "Kumite — U21", "KUMITE", "MALE", false, 18, 20, 67.01, 75),
    p("kumite-u21-m-84", "Kumite U21 Male -84 kg", "Kumite — U21", "KUMITE", "MALE", false, 18, 20, 75.01, 84),
    p("kumite-u21-m-84p", "Kumite U21 Male +84 kg", "Kumite — U21", "KUMITE", "MALE", false, 18, 20, 84.01, null),
    p("kumite-u21-f-50", "Kumite U21 Female -50 kg", "Kumite — U21", "KUMITE", "FEMALE", false, 18, 20, null, 50),
    p("kumite-u21-f-55", "Kumite U21 Female -55 kg", "Kumite — U21", "KUMITE", "FEMALE", false, 18, 20, 50.01, 55),
    p("kumite-u21-f-61", "Kumite U21 Female -61 kg", "Kumite — U21", "KUMITE", "FEMALE", false, 18, 20, 55.01, 61),
    p("kumite-u21-f-68", "Kumite U21 Female -68 kg", "Kumite — U21", "KUMITE", "FEMALE", false, 18, 20, 61.01, 68),
    p("kumite-u21-f-68p", "Kumite U21 Female +68 kg", "Kumite — U21", "KUMITE", "FEMALE", false, 18, 20, 68.01, null),

    // Senior Kumite (18+)
    p("kumite-senior-m-60", "Kumite Senior Male -60 kg", "Kumite — Senior", "KUMITE", "MALE", false, 18, null, null, 60),
    p("kumite-senior-m-67", "Kumite Senior Male -67 kg", "Kumite — Senior", "KUMITE", "MALE", false, 18, null, 60.01, 67),
    p("kumite-senior-m-75", "Kumite Senior Male -75 kg", "Kumite — Senior", "KUMITE", "MALE", false, 18, null, 67.01, 75),
    p("kumite-senior-m-84", "Kumite Senior Male -84 kg", "Kumite — Senior", "KUMITE", "MALE", false, 18, null, 75.01, 84),
    p("kumite-senior-m-84p", "Kumite Senior Male +84 kg", "Kumite — Senior", "KUMITE", "MALE", false, 18, null, 84.01, null),
    p("kumite-senior-f-50", "Kumite Senior Female -50 kg", "Kumite — Senior", "KUMITE", "FEMALE", false, 18, null, null, 50),
    p("kumite-senior-f-55", "Kumite Senior Female -55 kg", "Kumite — Senior", "KUMITE", "FEMALE", false, 18, null, 50.01, 55),
    p("kumite-senior-f-61", "Kumite Senior Female -61 kg", "Kumite — Senior", "KUMITE", "FEMALE", false, 18, null, 55.01, 61),
    p("kumite-senior-f-68", "Kumite Senior Female -68 kg", "Kumite — Senior", "KUMITE", "FEMALE", false, 18, null, 61.01, 68),
    p("kumite-senior-f-68p", "Kumite Senior Female +68 kg", "Kumite — Senior", "KUMITE", "FEMALE", false, 18, null, 68.01, null),
];

// Turn a preset into a fresh CustomDivision draft — the code prefix must
// match makeCustomDivisionCode's shape so the server action treats it as
// a valid custom row.
export function wkfPresetToDivision(
    preset: WkfPreset,
    slugify: (label: string, eventType: TournamentEventType) => string,
): CustomDivision {
    return {
        code: slugify(preset.label, preset.eventType),
        label: preset.label,
        eventType: preset.eventType,
        gender: preset.gender,
        isTeam: preset.isTeam,
        minAge: preset.minAge,
        maxAge: preset.maxAge,
        minWeightKg: preset.minWeightKg,
        maxWeightKg: preset.maxWeightKg,
        minRankId: null,
        priceBdt: null,
        fees: [],
    };
}
