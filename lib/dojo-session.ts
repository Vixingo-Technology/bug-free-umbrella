// Server-only helpers for resolving the dojo session.
// Importing this from a client component will break the build —
// use lib/dojo-roles for shared constants/types instead.
import "server-only";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import {
    getCurrentDojoForUser,
    type ResolvedDojo,
} from "@/lib/dojo-resolver";
import {
    hasAtLeast,
    isDojoRole,
    PREVIEW_COOKIE,
    type DojoRole,
} from "@/lib/dojo-roles";

export type DojoSession = {
    userId: string;
    email: string;
    fullName: string;
    role: DojoRole;
    realRole: DojoRole;
    isPreviewing: boolean;
    dojo: ResolvedDojo | null;
    /** True when the user has filed an application but no Dojo exists yet. */
    pendingApproval: boolean;
};

/**
 * Resolve the current viewer's dojo, role, and identity.
 *
 * Source of truth (in order):
 *   1. Member row + Dojo relationship (head instructor → DOJO_OWNER;
 *      Instructor with assigned dojoId → DOJO_INSTRUCTOR).
 *   2. Supabase user_metadata.role — used as a *transient* role while an
 *      enlistment application is still pending admin approval. The session is
 *      flagged `pendingApproval: true` in that case.
 */
export async function getDojoSession(): Promise<DojoSession | null> {
    const supabase = await createClient();
    const {
        data: { user },
    } = await supabase.auth.getUser();
    if (!user) return null;

    const meta = (user.user_metadata ?? {}) as Record<string, unknown>;

    const membership = await getCurrentDojoForUser(user.id);

    let realRole: DojoRole;
    let dojo: ResolvedDojo | null;
    let pendingApproval = false;

    if (membership) {
        realRole = membership.role;
        dojo = membership.dojo;
    } else {
        const metaRole = meta.role;
        realRole = isDojoRole(metaRole) ? metaRole : "DOJO_OWNER";
        dojo = null;
        pendingApproval = true;
    }

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
        dojo,
        pendingApproval,
    };
}

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
