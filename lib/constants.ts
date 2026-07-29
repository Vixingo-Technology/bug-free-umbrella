// =============================================================
// JKA Bangladesh — App-wide Constants
// =============================================================

/** Annual student membership fee in BDT */
export const MEMBERSHIP_FEE_BDT = 300;

/** One-time dojo affiliation (enlistment) fee in BDT */
export const DOJO_ENLISTMENT_FEE_BDT = 5000;

/** Annual dojo federation renewal fee in BDT */
export const DOJO_RENEWAL_FEE_BDT = 2500;

/** App name */
export const APP_NAME = "JKA Bangladesh";

/** Membership duration in years */
export const MEMBERSHIP_DURATION_YEARS = 1;

/** Dojo transfer request fee in BDT (non-refundable once paid) */
export const TRANSFER_REQUEST_FEE_BDT = 1000;

/** Flat catch-up fee (BDT) per belt when a new student starts above White Belt.
 *  Charged during the joining flow after the dojo owner assigns the rank. */
export const PAST_BELT_FEE_PER_RANK_BDT = 500;

/** Belt rank names in order (matches belt_ranks.name in DB) */
export const BELT_RANKS_ORDERED = [
  "White Belt",
  "Stripe Yellow Belt",
  "Yellow Belt",
  "Orange Belt",
  "Green Belt",
  "Blue Belt",
  "Purple Belt",
  "Brown Belt 3rd Kyu",
  "Brown Belt 2nd Kyu",
  "Brown Belt 1st Kyu",
  "Black Belt 1st Dan",
] as const;

export const BELT_COLORS: Record<string, string> = {
  "White Belt":           "#FFFFFF",
  "Stripe Yellow Belt":   "#FFD700",
  "Yellow Belt":          "#FFD700",
  "Orange Belt":          "#FF8C00",
  "Green Belt":           "#228B22",
  "Blue Belt":            "#0000CD",
  "Purple Belt":          "#7C3AED",
  "Brown Belt 3rd Kyu":   "#8B4513",
  "Brown Belt 2nd Kyu":   "#8B4513",
  "Brown Belt 1st Kyu":   "#8B4513",
  "Black Belt 1st Dan":   "#1a1a1a",
};

export const BLOOD_GROUPS = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"] as const;
