"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireDojoRole } from "@/lib/dojo-session";
import { createAdminClient } from "@/lib/supabase/admin";
import { assignRole } from "@/lib/auth/assign-role";

const INVITABLE_ROLES = ["STUDENT", "INSTRUCTOR", "DOJO_MANAGER"] as const;
type InvitableRole = (typeof INVITABLE_ROLES)[number];

export type DojoInviteResult = { ok: true } | { ok: false; error: string };

function appUrl(): string {
    return (
        process.env.NEXT_PUBLIC_APP_URL ??
        process.env.APP_URL ??
        "http://localhost:3000"
    );
}

/**
 * Send an invite from the current Dojo Head to a new staff member or student.
 * Pre-creates a Member row with the dojoId + role so the dojo sees them
 * immediately as "Invite sent" before they've activated their account.
 */
export async function inviteDojoMemberAction(
    formData: FormData
): Promise<DojoInviteResult> {
    const session = await requireDojoRole("DOJO_OWNER");
    if (!session.dojo) {
        return {
            ok: false,
            error: "Your dojo isn't approved yet. Invites unlock once the federation approves your enlistment.",
        };
    }

    const email = ((formData.get("email") as string) ?? "")
        .trim()
        .toLowerCase();
    const fullName = ((formData.get("fullName") as string) ?? "").trim();
    const role = formData.get("role") as InvitableRole;

    if (!email || !email.includes("@")) {
        return { ok: false, error: "A valid email is required." };
    }
    if (!INVITABLE_ROLES.includes(role)) {
        return { ok: false, error: "Pick a role for the invitee." };
    }

    const existing = await prisma.user.findUnique({
        where: { email },
        select: { id: true, student: { select: { dojoId: true } }, instructor: { select: { dojoId: true } }, dojoManager: { select: { dojoId: true } }, dojoOwner: { select: { dojoId: true } } },
    });
    if (existing) {
        const existingDojoId =
            existing.student?.dojoId ??
            existing.instructor?.dojoId ??
            existing.dojoManager?.dojoId ??
            existing.dojoOwner?.dojoId ??
            null;
        return {
            ok: false,
            error:
                existingDojoId === session.dojo.id
                    ? "This email is already part of your dojo."
                    : "Someone with this email is already a JKA member.",
        };
    }

    const admin = createAdminClient();
    const redirectTo = `${appUrl()}/auth/callback?next=/set-password`;

    const { data, error } = await admin.auth.admin.inviteUserByEmail(email, {
        redirectTo,
        data: {
            role,
            full_name: fullName || email,
            dojo_id: session.dojo.id,
            invited_by: session.userId,
            invited: true,
        },
    });

    if (error || !data.user) {
        return {
            ok: false,
            error: error?.message ?? "Failed to send invite.",
        };
    }

    await prisma.user.upsert({
        where: { id: data.user.id },
        create: {
            id: data.user.id,
            email,
            fullName: fullName || email,
            roleId: role,
            isActive: false,
        },
        update: {
            email,
            fullName: fullName || email,
            roleId: role,
        },
    });
    await assignRole(data.user.id, role, { dojoId: session.dojo.id });

    revalidatePath("/portal/dojo/students");
    return { ok: true };
}

/**
 * Re-send the Supabase invite email for a member who hasn't activated yet.
 */
export async function resendDojoInviteAction(
    formData: FormData
): Promise<DojoInviteResult> {
    const session = await requireDojoRole("DOJO_OWNER");
    if (!session.dojo) {
        return { ok: false, error: "Your dojo isn't approved yet." };
    }

    const memberId = (formData.get("memberId") as string) ?? "";
    const member = await prisma.user.findUnique({
        where: { id: memberId },
        select: {
            id: true,
            email: true,
            fullName: true,
            roleId: true,
            student: { select: { dojoId: true, onboardingComplete: true } },
            instructor: { select: { dojoId: true } },
            dojoManager: { select: { dojoId: true } },
        },
    });

    const memberDojoId =
        member?.student?.dojoId ??
        member?.instructor?.dojoId ??
        member?.dojoManager?.dojoId ??
        null;
    const memberOnboarded = member?.student?.onboardingComplete ?? (member?.roleId !== "STUDENT");

    if (!member || memberDojoId !== session.dojo.id) {
        return { ok: false, error: "Member not found in your dojo." };
    }
    if (memberOnboarded) {
        return {
            ok: false,
            error: "This member has already activated their account.",
        };
    }

    const admin = createAdminClient();
    const redirectTo = `${appUrl()}/auth/callback?next=/set-password`;

    const { error } = await admin.auth.admin.inviteUserByEmail(member.email, {
        redirectTo,
        data: {
            role: member.roleId,
            full_name: member.fullName,
            dojo_id: session.dojo.id,
            invited_by: session.userId,
            invited: true,
        },
    });

    if (error) return { ok: false, error: error.message };

    revalidatePath("/portal/dojo/students");
    return { ok: true };
}

/**
 * Revoke a pending invite — deletes the un-activated member row + auth user.
 * Refuses to touch members who already completed onboarding.
 */
export async function revokeDojoInviteAction(
    formData: FormData
): Promise<DojoInviteResult> {
    const session = await requireDojoRole("DOJO_OWNER");
    if (!session.dojo) {
        return { ok: false, error: "Your dojo isn't approved yet." };
    }

    const memberId = (formData.get("memberId") as string) ?? "";
    const member = await prisma.user.findUnique({
        where: { id: memberId },
        select: {
            id: true,
            roleId: true,
            student: { select: { dojoId: true, onboardingComplete: true } },
            instructor: { select: { dojoId: true } },
            dojoManager: { select: { dojoId: true } },
        },
    });

    const memberDojoId =
        member?.student?.dojoId ??
        member?.instructor?.dojoId ??
        member?.dojoManager?.dojoId ??
        null;
    const memberOnboarded = member?.student?.onboardingComplete ?? (member?.roleId !== "STUDENT");

    if (!member || memberDojoId !== session.dojo.id) {
        return { ok: false, error: "Member not found in your dojo." };
    }
    if (memberOnboarded) {
        return {
            ok: false,
            error: "This member has already activated their account — remove them from the roster instead.",
        };
    }

    const admin = createAdminClient();
    await admin.auth.admin.deleteUser(memberId).catch(() => null);
    await prisma.user.delete({ where: { id: memberId } });

    revalidatePath("/portal/dojo/students");
    return { ok: true };
}
