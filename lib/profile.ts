/**
 * Profile completeness helpers.
 *
 * `isProfileComplete` is the single source of truth for the portal layout's
 * onboarding-redirect guard.  Add fields here when they become required.
 */

export interface ProfileCheckable {
    phone?: string | null;
    dojoId?: string | null;
}

/**
 * Returns true only when all required profile fields are present.
 * Required: phone number + dojo assignment.
 *
 * Father's / mother's name are collected during onboarding for new members
 * and surfaced as a backfill prompt at certificate-request time for legacy
 * rows — they intentionally do NOT gate portal access here, so the 700+
 * existing members aren't pushed back through onboarding.
 */
export function isProfileComplete(member: ProfileCheckable | null | undefined): boolean {
    if (!member) return false;
    return !!(member.phone?.trim() && member.dojoId?.trim());
}
