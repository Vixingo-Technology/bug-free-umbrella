// Server-only helpers for resolving the dojo session.
// Importing this from a client component will break the build —
// use lib/dojo-roles for shared constants/types instead.
import "server-only";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import {
    getCurrentDojoForUser,
    type ResolvedDojo,
} from "@/lib/dojo-resolver";
import {
    hasAtLeast,
    isDojoRole,
    type DojoRole,
} from "@/lib/dojo-roles";

export type DojoSession = {
    userId: string;
    email: string;
    fullName: string;
    role: DojoRole;
    dojo: ResolvedDojo | null;
    /** True when the user has filed an application but no Dojo exists yet. */
    pendingApproval: boolean;
};

/**
 * Resolve the current viewer's dojo, role, and identity.
 *
 * Source of truth:
 *   1. members.role + members.dojoId — single read, no joins. Roles in
 *      scope: INSTRUCTOR, DOJO_MANAGER, DOJO_OWNER.
 *   2. Supabase user_metadata.role — used as a *transient* role while an
 *      enlistment application is still pending admin approval. The session
 *      is flagged `pendingApproval: true` in that case.
 */
export async function getDojoSession(): Promise<DojoSession | null> {
    const supabase = await createClient();
    const {
        data: { user },
    } = await supabase.auth.getUser();
    if (!user) return null;

    const meta = (user.user_metadata ?? {}) as Record<string, unknown>;

    const membership = await getCurrentDojoForUser(user.id);

    let role: DojoRole;
    let dojo: ResolvedDojo | null;
    let pendingApproval = false;

    if (membership) {
        role = membership.role;
        dojo = membership.dojo;
    } else {
        const metaRole = meta.role;
        role = isDojoRole(metaRole) ? metaRole : "DOJO_OWNER";
        dojo = null;
        pendingApproval = true;
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
        dojo,
        pendingApproval,
    };
}

export async function requireDojoRole(min: DojoRole): Promise<DojoSession> {
    const session = await getDojoSession();
    if (!session) {
        redirect("/login?next=/portal");
    }
    if (!hasAtLeast(session.role, min)) {
        redirect("/portal?denied=1");
    }
    return session;
}
