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
  "Black Belt 2nd Dan",
  "Black Belt 3rd Dan",
  "Black Belt 4th Dan",
  "Black Belt 5th Dan",
  "Black Belt 6th Dan",
  "Black Belt 7th Dan",
  "Black Belt 8th Dan",
  "Black Belt 9th Dan",
  "Black Belt 10th Dan",
] as const;

/** Japanese names for Black Belt dan grades — matches the naming used in the
 *  Dojo Enlistment signup rank dropdown. Values are DB `belt_ranks.name`. */
export const BLACK_BELT_JAPANESE_NAMES: Record<string, string> = {
  "Black Belt 1st Dan":   "Shodan",
  "Black Belt 2nd Dan":   "Nidan",
  "Black Belt 3rd Dan":   "Sandan",
  "Black Belt 4th Dan":   "Yondan",
  "Black Belt 5th Dan":   "Godan",
  "Black Belt 6th Dan":   "Rokudan",
  "Black Belt 7th Dan":   "Nanadan",
  "Black Belt 8th Dan":   "Hachidan",
  "Black Belt 9th Dan":   "Kudan",
  "Black Belt 10th Dan":  "Judan",
};

/** Kyu grade for the coloured belts whose DB name does not already carry it.
 *  Brown belts already include "1st/2nd/3rd Kyu" in their name, so they are
 *  intentionally omitted here. Values are DB `belt_ranks.name`. */
export const KYU_GRADES: Record<string, string> = {
  "White Belt":         "10th Kyu",
  "Stripe Yellow Belt": "9th Kyu",
  "Yellow Belt":        "8th Kyu",
  "Orange Belt":        "7th Kyu",
  "Green Belt":         "6th Kyu",
  "Blue Belt":          "5th Kyu",
  "Purple Belt":        "4th Kyu",
};

/** Human-facing label for a belt rank. Coloured belts read Kyu-first —
 *  "10th Kyu - White Belt" down to "1st Kyu - Brown Belt". Brown belts carry
 *  their Kyu in the DB name ("Brown Belt 3rd Kyu"), so it is reordered to the
 *  same shape. Dan grades drop the "Black Belt " prefix and get their Japanese
 *  name appended (e.g. "1st Dan (Shodan)").
 *  The DB value is preserved for lookups — pass the raw name to Prisma. */
export function formatBeltRank(name: string | null | undefined): string {
  if (!name) return "—";
  const kyu = KYU_GRADES[name];
  if (kyu) return `${kyu} - ${name}`;
  const brown = name.match(/^Brown Belt (\d+(?:st|nd|rd|th) Kyu)$/);
  if (brown) return `${brown[1]} - Brown Belt`;
  const jp = BLACK_BELT_JAPANESE_NAMES[name];
  if (!jp) return name;
  const stripped = name.replace(/^Black Belt\s+/, "");
  return `${stripped} (${jp})`;
}

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
  "Black Belt 2nd Dan":   "#1a1a1a",
  "Black Belt 3rd Dan":   "#1a1a1a",
  "Black Belt 4th Dan":   "#1a1a1a",
  "Black Belt 5th Dan":   "#1a1a1a",
  "Black Belt 6th Dan":   "#1a1a1a",
  "Black Belt 7th Dan":   "#1a1a1a",
  "Black Belt 8th Dan":   "#1a1a1a",
  "Black Belt 9th Dan":   "#1a1a1a",
  "Black Belt 10th Dan":  "#1a1a1a",
};

export const BLOOD_GROUPS = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"] as const;
