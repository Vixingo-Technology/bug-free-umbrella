import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import type { RoleId } from "@/lib/auth/load-current-user";
import InviteClient from "./invite-client";

export const metadata: Metadata = {
    title: "Accept your invitation — JKA Bangladesh",
    robots: { index: false, follow: false },
};

const VALID_ROLES: RoleId[] = ["STUDENT", "INSTRUCTOR", "DOJO_MANAGER"];

export default async function InvitePage() {
    const supabase = await createClient();
    const {
        data: { user },
    } = await supabase.auth.getUser();
    if (!user) redirect("/login?next=/invite");

    const meta = (user.user_metadata ?? {}) as Record<string, unknown>;

    // Gate: this page is only for invited members. A logged-in user with a
    // real password / existing profile should not land here.
    const isInvited = Boolean(meta.pending_invite || meta.invited);
    if (!isInvited) redirect("/portal");

    const invitedRole =
        typeof meta.role === "string" &&
        VALID_ROLES.includes(meta.role as RoleId)
            ? (meta.role as Exclude<RoleId, "ADMIN" | "DOJO_OWNER">)
            : "STUDENT";

    // Pull the inviting dojo's name — user_metadata may be stale, so the DB
    // linkage from the invite action is the source of truth.
    const dojoIdFromMeta =
        typeof meta.dojo_id === "string" ? meta.dojo_id : null;
    let dojoName = (meta.dojo_name as string) ?? "JKA Bangladesh";
    if (dojoIdFromMeta) {
        try {
            const dojo = await prisma.dojo.findUnique({
                where: { id: dojoIdFromMeta },
                select: { name: true },
            });
            if (dojo?.name) dojoName = dojo.name;
        } catch {
            /* keep metadata fallback */
        }
    }

    return (
        <InviteClient
            email={user.email ?? ""}
            fullName={(meta.full_name as string) ?? ""}
            rank={(meta.rank as string) ?? ""}
            role={invitedRole}
            dojoName={dojoName}
        />
    );
}
