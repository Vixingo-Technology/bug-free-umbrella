import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export const DOJO_ROLES = [
    "DOJO_INSTRUCTOR",
    "DOJO_MANAGER",
    "DOJO_OWNER",
] as const;

export type DojoRole = (typeof DOJO_ROLES)[number];

const ROLE_RANK: Record<DojoRole, number> = {
    DOJO_INSTRUCTOR: 1,
    DOJO_MANAGER: 2,
    DOJO_OWNER: 3,
};

export const ROLE_LABEL: Record<DojoRole, string> = {
    DOJO_INSTRUCTOR: "Instructor",
    DOJO_MANAGER: "Manager",
    DOJO_OWNER: "Dojo Head",
};

export const ROLE_BADGE_COLOR: Record<DojoRole, string> = {
    DOJO_INSTRUCTOR: "bg-emerald-100 text-emerald-700 border-emerald-200",
    DOJO_MANAGER: "bg-blue-100 text-blue-700 border-blue-200",
    DOJO_OWNER: "bg-accent-red/10 text-accent-red border-accent-red/30",
};

export const PREVIEW_COOKIE = "jka_dojo_preview_role";

export function hasAtLeast(role: DojoRole, min: DojoRole): boolean {
    return ROLE_RANK[role] >= ROLE_RANK[min];
}

export function isDojoRole(value: unknown): value is DojoRole {
    return (
        typeof value === "string" &&
        (DOJO_ROLES as readonly string[]).includes(value)
    );
}

export type DojoSession = {
    userId: string;
    email: string;
    fullName: string;
    role: DojoRole;
    realRole: DojoRole;
    isPreviewing: boolean;
};

/**
 * Resolve the current viewer's dojo role.
 *
 * Source of truth: Supabase user_metadata.role (set at enlistment).
 * The Owner can override with a preview cookie to see lower roles' views.
 * Lower roles cannot escalate themselves via the cookie.
 */
export async function getDojoSession(): Promise<DojoSession | null> {
    const supabase = await createClient();
    const {
        data: { user },
    } = await supabase.auth.getUser();
    if (!user) return null;

    const meta = (user.user_metadata ?? {}) as Record<string, unknown>;
    const metaRole = meta.role;
    const realRole: DojoRole = isDojoRole(metaRole)
        ? metaRole
        : // Default new dojo signups to OWNER until we wire DojoStaff invites.
          "DOJO_OWNER";

    let role = realRole;
    let isPreviewing = false;

    if (hasAtLeast(realRole, "DOJO_OWNER")) {
        const cookieStore = await cookies();
        const previewRaw = cookieStore.get(PREVIEW_COOKIE)?.value;
        if (previewRaw && isDojoRole(previewRaw) && previewRaw !== realRole) {
            role = previewRaw;
            isPreviewing = true;
        }
    }

    const fullName =
        (typeof meta.full_name === "string" && meta.full_name) ||
        (typeof meta.pending_dojo_name === "string" && meta.pending_dojo_name) ||
        user.email?.split("@")[0] ||
        "Dojo Head";

    return {
        userId: user.id,
        email: user.email ?? "",
        fullName,
        role,
        realRole,
        isPreviewing,
    };
}

/**
 * Page guard: returns the session if the viewer meets the minimum role,
 * otherwise redirects.
 */
export async function requireDojoRole(min: DojoRole): Promise<DojoSession> {
    const session = await getDojoSession();
    if (!session) {
        redirect("/login?next=/dojo/dashboard");
    }
    if (!hasAtLeast(session.role, min)) {
        redirect("/dojo/dashboard?denied=1");
    }
    return session;
}
