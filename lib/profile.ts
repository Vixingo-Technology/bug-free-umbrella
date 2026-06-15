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
 */
export function isProfileComplete(member: ProfileCheckable | null | undefined): boolean {
    if (!member) return false;
    return !!(member.phone?.trim() && member.dojoId?.trim());
}
