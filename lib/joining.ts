import { BELT_RANKS_ORDERED } from "@/lib/constants";

/**
 * Number of belt "steps" between White Belt and the given rank.
 * Returns 0 for White Belt (or unknown ranks — safe fallback).
 */
export function beltStepsFromWhite(rank: string | null | undefined): number {
    if (!rank) return 0;
    const idx = BELT_RANKS_ORDERED.indexOf(rank as (typeof BELT_RANKS_ORDERED)[number]);
    return idx > 0 ? idx : 0;
}

/**
 * Flat past-belt fee = per-rank amount × number of belts above White.
 * White Belt returns 0.
 */
export function calculatePastBeltFee(
    assignedRank: string,
    perRankBDT: number,
): number {
    return beltStepsFromWhite(assignedRank) * perRankBDT;
}

export const JOIN_STAGE_LABELS = {
    FEE_UNPAID: "Membership fee",
    AWAITING_APPROVAL: "Dojo approval",
    PAST_BELT_UNPAID: "Past-belt fee",
    JOINED: "Joined",
} as const;

export type JoinStage = keyof typeof JOIN_STAGE_LABELS;
