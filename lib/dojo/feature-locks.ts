// Feature-lock resolver for the dojo console.
//
// The dojo dashboard progressively unlocks:
//   1. UNPAID (DojoApplication.PENDING_PAYMENT)  → everything locked except Overview
//   2. AWAITING_APPROVAL (DojoApplication.PAID)  → also unlocks Dojo Settings
//   3. APPROVED, <30 active students             → auto-locks certificates,
//                                                  announcements, transfers,
//                                                  and staff invites
//   4. APPROVED, ≥30 active students             → fully unlocked
//
// The JKA admin can additionally lock any FEATURE_KEY for a specific dojo
// via the admin dojos panel; those locks stack on top of the auto locks.
//
// This module is CLIENT-SAFE — pure constants, types, and predicates. The
// prisma-backed resolver lives in ./feature-locks.server.ts so importing
// this file from a client component never drags `pg` into the bundle.

export const STUDENT_MILESTONE = 30;

export const FEATURE_KEYS = [
    "members",
    "join-requests",
    "gradings",
    "certificates",
    "announcements",
    "transfers",
    "renewals",
    "settings",
    "invite-staff",
] as const;

export type FeatureKey = (typeof FEATURE_KEYS)[number];

export function isFeatureKey(value: unknown): value is FeatureKey {
    return (
        typeof value === "string" &&
        (FEATURE_KEYS as readonly string[]).includes(value)
    );
}

export const FEATURE_LABEL: Record<FeatureKey, string> = {
    "members":        "Members",
    "join-requests":  "Join requests",
    "gradings":       "Belt tests",
    "certificates":   "Certificates",
    "announcements":  "Announcements",
    "transfers":      "Transfer requests",
    "renewals":       "Renewals",
    "settings":       "Dojo settings",
    "invite-staff":   "Invite instructors/managers",
};

// Feature keys that map to a /portal/dojo/* subroute the layout should
// redirect away from when locked. "invite-staff" is a within-page toggle
// (not its own route) and so is intentionally absent.
export const FEATURE_PATH: Partial<Record<FeatureKey, string>> = {
    "members":       "/portal/dojo/members",
    "join-requests": "/portal/dojo/join-requests",
    "gradings":      "/portal/dojo/gradings",
    "certificates":  "/portal/dojo/certificates",
    "announcements": "/portal/dojo/announcements",
    "transfers":     "/portal/dojo/transfers",
    "renewals":      "/portal/dojo/renewals",
    "settings":      "/portal/dojo/settings",
};

// Features that auto-lock until the dojo hits the student milestone.
// Exported for the server resolver in ./feature-locks.server.ts.
export const MILESTONE_LOCKED: readonly FeatureKey[] = [
    "certificates",
    "announcements",
    "transfers",
    "invite-staff",
];

export type DojoFeatureLocks = {
    /** All locked feature keys — milestone + admin-set, deduped. */
    locked: Set<FeatureKey>;
    /** Locked purely because the dojo is under the student milestone. */
    milestoneLocked: Set<FeatureKey>;
    /** Locked because the admin toggled them off. */
    adminLocked: Set<FeatureKey>;
    /** Current active-student count and the milestone threshold. */
    studentCount: number;
    milestone: number;
};

/**
 * Given the current pathname, return the feature key it belongs to
 * (if any). Used by the layout to decide whether to redirect.
 */
export function featureForPath(pathname: string): FeatureKey | null {
    for (const [key, path] of Object.entries(FEATURE_PATH) as [
        FeatureKey,
        string,
    ][]) {
        if (pathname === path || pathname.startsWith(path + "/")) return key;
    }
    return null;
}
