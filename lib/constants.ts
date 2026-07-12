// =============================================================
// JKA Bangladesh — App-wide Constants
// =============================================================

/** Annual student membership fee in BDT */
export const MEMBERSHIP_FEE_BDT = 3000;

/** Annual dojo federation renewal fee in BDT */
export const DOJO_RENEWAL_FEE_BDT = 6000;

/** App name */
export const APP_NAME = "JKA Bangladesh";

/** Membership duration in years */
export const MEMBERSHIP_DURATION_YEARS = 1;

/** Dojo transfer request fee in BDT (non-refundable once paid) */
export const TRANSFER_REQUEST_FEE_BDT = 1000;

/** Belt rank names in order (matches belt_ranks.name in DB) */
export const BELT_RANKS_ORDERED = [
  "White Belt",
  "Yellow Belt",
  "Orange Belt",
  "Green Belt",
  "Blue Belt",
  "Purple Belt",
  "Brown Belt",
  "Black Belt 1st Dan",
  "Black Belt 2nd Dan",
  "Black Belt 3rd Dan",
  "Black Belt 4th Dan",
  "Black Belt 5th Dan",
] as const;

export const BELT_COLORS: Record<string, string> = {
  "White Belt":         "#FFFFFF",
  "Yellow Belt":        "#FFD700",
  "Orange Belt":        "#FF8C00",
  "Green Belt":         "#228B22",
  "Blue Belt":          "#0000CD",
  "Purple Belt":        "#7C3AED",
  "Brown Belt":         "#8B4513",
  "Black Belt 1st Dan": "#1a1a1a",
  "Black Belt 2nd Dan": "#1a1a1a",
  "Black Belt 3rd Dan": "#1a1a1a",
  "Black Belt 4th Dan": "#1a1a1a",
  "Black Belt 5th Dan": "#1a1a1a",
};

export const BLOOD_GROUPS = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"] as const;
