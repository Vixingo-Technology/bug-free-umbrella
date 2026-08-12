// Non-admin accounts use a synthetic Supabase-auth email so families can share
// one real inbox across many accounts. The real address for notifications and
// display lives on `users.contact_email`.
const SYNTHETIC_EMAIL_PATTERN = /@members\.jkabangladesh\.(com|local)$/i;

export function isSyntheticEmail(email?: string | null): boolean {
    return !!email && SYNTHETIC_EMAIL_PATTERN.test(email);
}

export function displayEmail(
    user: { email?: string | null; contactEmail?: string | null } | null | undefined,
    fallback = "",
): string {
    const contact = user?.contactEmail?.trim();
    if (contact) return contact;
    const auth = user?.email?.trim();
    if (!auth) return fallback;
    return isSyntheticEmail(auth) ? fallback : auth;
}
