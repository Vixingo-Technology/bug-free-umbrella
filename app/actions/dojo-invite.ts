"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireDojoRole } from "@/lib/dojo-session";
import { createAdminClient } from "@/lib/supabase/admin";
import { assignRole } from "@/lib/auth/assign-role";
import { generateTemporaryPassword } from "@/lib/auth/temporary-password";
import {
    DOJO_STAFF_LIMIT,
    invitableRolesFor,
    isStaffRole,
    type InvitableRole,
} from "@/lib/dojo-roles";
import { resolveDojoFeatureLocks } from "@/lib/dojo/feature-locks.server";
import { BELT_RANKS_ORDERED } from "@/lib/constants";
import { ensureRegNo } from "@/lib/members/reg-no";

const ROLE_LABEL: Record<InvitableRole, string> = {
    STUDENT: "student",
    INSTRUCTOR: "instructor",
    DOJO_MANAGER: "manager",
};

export type DojoInviteResult = { ok: true } | { ok: false; error: string };

function appUrl(): string {
    const url = process.env.NEXT_PUBLIC_APP_URL ?? process.env.APP_URL;
    if (!url) {
        if (process.env.NODE_ENV === "production") {
            throw new Error(
                "NEXT_PUBLIC_APP_URL (or APP_URL) is required in production — invite links depend on it. Without it, Supabase rejects the redirect and drops users on the Site URL instead of /auth/callback."
            );
        }
        return "http://localhost:3000";
    }
    return url;
}

/**
 * Send an invite from the current Dojo Head to a new staff member or student.
 * Pre-creates a Member row with the dojoId + role so the dojo sees them
 * immediately as "Invite sent" before they've activated their account.
 */
export async function inviteDojoMemberAction(
    formData: FormData
): Promise<DojoInviteResult> {
    // Anyone at Instructor level or above can invite — the specific roles
    // they're allowed to invite depend on their own role (see invitableRolesFor).
    const session = await requireDojoRole("INSTRUCTOR");
    if (!session.dojo) {
        return {
            ok: false,
            error: "Your dojo isn't approved yet. Invites unlock once the federation approves your enlistment.",
        };
    }

    // Activation gate — the dojo must have completed the enlistment payment
    // before anyone can invite members.
    if (!session.dojo.isActive) {
        return {
            ok: false,
            error: "Activate your dojo (complete the enlistment payment) before inviting members.",
        };
    }

    const email = ((formData.get("email") as string) ?? "")
        .trim()
        .toLowerCase();
    const fullName = ((formData.get("fullName") as string) ?? "").trim();
    const rank = ((formData.get("rank") as string) ?? "").trim();
    const role = formData.get("role") as InvitableRole;

    if (!email || !email.includes("@")) {
        return { ok: false, error: "A valid email is required." };
    }

    const allowedRoles = invitableRolesFor(session.role);
    if (!allowedRoles.includes(role)) {
        const allowedNames = allowedRoles.map((r) => ROLE_LABEL[r]).join(", ");
        return {
            ok: false,
            error: `You can only invite: ${allowedNames}.`,
        };
    }

    if (isStaffRole(role)) {
        // Feature-lock gate — invite-staff is locked until the dojo hits
        // the student milestone (or the JKA admin unlocks it manually).
        const locks = await resolveDojoFeatureLocks(session.dojo.id);
        if (locks.locked.has("invite-staff")) {
            const reason = locks.milestoneLocked.has("invite-staff")
                ? `Instructor and manager invites unlock once your dojo has ${locks.milestone} active students (currently ${locks.studentCount}). You can keep inviting students meanwhile.`
                : "Instructor and manager invites are currently locked for this dojo. Contact the JKA admin to unlock.";
            return { ok: false, error: reason };
        }

        const [instructorCount, managerCount] = await Promise.all([
            prisma.instructor.count({ where: { dojoId: session.dojo.id } }),
            prisma.dojoManager.count({ where: { dojoId: session.dojo.id } }),
        ]);
        if (instructorCount + managerCount >= DOJO_STAFF_LIMIT) {
            return {
                ok: false,
                error: `Your dojo has reached the ${DOJO_STAFF_LIMIT}-staff limit (instructors + managers combined). Revoke a pending invite or remove a staff member before inviting another. Students are unlimited.`,
            };
        }
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
    const redirectTo = `${appUrl()}/auth/callback?next=/invite`;

    const { data, error } = await admin.auth.admin.inviteUserByEmail(email, {
        redirectTo,
        data: {
            role,
            full_name: fullName || email,
            rank,
            dojo_id: session.dojo.id,
            dojo_name: session.dojo.name,
            invited_by: session.userId,
            invited: true,
            pending_invite: true,
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

    revalidatePath("/portal/dojo/members");
    return { ok: true };
}

/**
 * Re-send the Supabase invite email for a member who hasn't activated yet.
 */
export async function resendDojoInviteAction(
    formData: FormData
): Promise<DojoInviteResult> {
    const session = await requireDojoRole("INSTRUCTOR");
    if (!session.dojo) {
        return { ok: false, error: "Your dojo isn't approved yet." };
    }
    if (!session.dojo.isActive) {
        return {
            ok: false,
            error: "Activate your dojo before managing invites.",
        };
    }

    const memberId = (formData.get("memberId") as string) ?? "";
    const member = await prisma.user.findUnique({
        where: { id: memberId },
        select: {
            id: true,
            email: true,
            fullName: true,
            roleId: true,
            isActive: true,
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
    // A pending invite is any user whose account isn't active yet, OR a
    // student who hasn't finished onboarding. Non-student invitees don't
    // have an onboarding step — `isActive` is the source of truth for them.
    const memberOnboarded =
        member?.roleId === "STUDENT"
            ? (member?.student?.onboardingComplete ?? false)
            : (member?.isActive ?? false);

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
    const redirectTo = `${appUrl()}/auth/callback?next=/invite`;

    const { error } = await admin.auth.admin.inviteUserByEmail(member.email, {
        redirectTo,
        data: {
            role: member.roleId,
            full_name: member.fullName,
            dojo_id: session.dojo.id,
            dojo_name: session.dojo.name,
            invited_by: session.userId,
            invited: true,
            pending_invite: true,
        },
    });

    if (error) return { ok: false, error: error.message };

    revalidatePath("/portal/dojo/members");
    return { ok: true };
}

/**
 * Revoke a pending invite — deletes the un-activated member row + auth user.
 * Refuses to touch members who already completed onboarding.
 */
export async function revokeDojoInviteAction(
    formData: FormData
): Promise<DojoInviteResult> {
    const session = await requireDojoRole("INSTRUCTOR");
    if (!session.dojo) {
        return { ok: false, error: "Your dojo isn't approved yet." };
    }
    if (!session.dojo.isActive) {
        return {
            ok: false,
            error: "Activate your dojo before managing invites.",
        };
    }

    const memberId = (formData.get("memberId") as string) ?? "";
    const member = await prisma.user.findUnique({
        where: { id: memberId },
        select: {
            id: true,
            roleId: true,
            isActive: true,
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
    const memberOnboarded =
        member?.roleId === "STUDENT"
            ? (member?.student?.onboardingComplete ?? false)
            : (member?.isActive ?? false);

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

    revalidatePath("/portal/dojo/members");
    return { ok: true };
}

// ─────────────────────────────────────────────────────────────
// Create an existing (already-training) student directly, without
// sending an email invite. Dojo Head enters the student's details;
// the action provisions the Supabase user with a synthetic email +
// temporary password and returns the Member ID / password so the
// Dojo Head can hand them to the student in person.
// ─────────────────────────────────────────────────────────────

export type CreateExistingStudentResult =
    | { ok: true; memberNumber: string; temporaryPassword: string }
    | { ok: false; error: string };

export async function createExistingStudentAction(
    formData: FormData
): Promise<CreateExistingStudentResult> {
    const session = await requireDojoRole("DOJO_OWNER");
    if (!session.dojo) {
        return {
            ok: false,
            error: "Your dojo isn't approved yet. Wait for federation approval before adding members.",
        };
    }
    if (!session.dojo.isActive) {
        return {
            ok: false,
            error: "Activate your dojo (complete the enlistment payment) before adding members.",
        };
    }

    const fullName = ((formData.get("fullName") as string) ?? "").trim();
    const phone = ((formData.get("phone") as string) ?? "").trim();
    const currentRank = ((formData.get("currentRank") as string) ?? "").trim();
    const dateOfBirthRaw = ((formData.get("dateOfBirth") as string) ?? "").trim();
    const expiryDateRaw = ((formData.get("expiryDate") as string) ?? "").trim();

    if (!fullName) return { ok: false, error: "Full name is required." };
    if (!phone) return { ok: false, error: "Phone number is required." };
    if (!currentRank) return { ok: false, error: "Belt rank is required." };
    if (!expiryDateRaw) return { ok: false, error: "Membership expiry date is required." };

    if (!(BELT_RANKS_ORDERED as readonly string[]).includes(currentRank)) {
        return { ok: false, error: "Pick a valid belt rank from the list." };
    }

    const expiryDate = new Date(expiryDateRaw);
    if (Number.isNaN(expiryDate.getTime())) {
        return { ok: false, error: "Membership expiry date is invalid." };
    }

    const dateOfBirth = dateOfBirthRaw ? new Date(dateOfBirthRaw) : null;
    if (dateOfBirth && Number.isNaN(dateOfBirth.getTime())) {
        return { ok: false, error: "Date of birth is invalid." };
    }

    // Synthetic email — the student logs in by Member ID; the email exists
    // only because Supabase requires one. Domain uses .local so it can never
    // route to a real mailbox.
    const syntheticEmail = `member-${randomUUID()}@members.jkabangladesh.local`;
    const temporaryPassword = generateTemporaryPassword();

    const admin = createAdminClient();
    const { data, error } = await admin.auth.admin.createUser({
        email: syntheticEmail,
        password: temporaryPassword,
        email_confirm: true,
        user_metadata: {
            full_name: fullName,
            role: "STUDENT",
            dojo_id: session.dojo.id,
            dojo_name: session.dojo.name,
            created_by_dojo: true,
        },
    });

    if (error || !data.user) {
        return {
            ok: false,
            error: error?.message ?? "Failed to create the student account.",
        };
    }

    const userId = data.user.id;

    try {
        await prisma.user.create({
            data: {
                id: userId,
                email: syntheticEmail,
                phone,
                fullName,
                roleId: "STUDENT",
                mustChangePassword: true,
            },
        });

        await prisma.student.create({
            data: {
                id: userId,
                dojoId: session.dojo.id,
                currentRank,
                requestedRank: currentRank,
                assignedRank: currentRank,
                expiryDate,
                membershipStatus: "ACTIVE",
                joinStage: "JOINED",
                joinedAt: new Date(),
                onboardingComplete: false,
            },
        });

        if (dateOfBirth) {
            await prisma.profile.create({
                data: {
                    id: userId,
                    dateOfBirth,
                },
            });
        }
    } catch (err: any) {
        // Roll back the Supabase auth user if the DB rows failed to insert —
        // otherwise the account is unreachable and permanently orphaned.
        await admin.auth.admin.deleteUser(userId).catch(() => null);
        return {
            ok: false,
            error: err?.message ?? "Failed to save the student's records.",
        };
    }

    const memberNumber = await ensureRegNo(userId);
    if (!memberNumber) {
        // Extremely unlikely (5 retries exhausted). Surface a clear message
        // rather than returning an unusable Member ID.
        await admin.auth.admin.deleteUser(userId).catch(() => null);
        await prisma.user.delete({ where: { id: userId } }).catch(() => null);
        return {
            ok: false,
            error: "Could not allocate a Member ID. Try again in a moment.",
        };
    }

    revalidatePath("/portal/dojo/members");
    return { ok: true, memberNumber, temporaryPassword };
}

// ─────────────────────────────────────────────────────────────
// Reset a member's password. Dojo Managers and Owners can reset
// students in their own dojo; Owners can additionally reset
// instructors and managers in their own dojo. The action returns
// a fresh temporary password to display once — the member is
// forced to replace it on next login via mustChangePassword.
// ─────────────────────────────────────────────────────────────

export type ResetMemberPasswordResult =
    | { ok: true; temporaryPassword: string }
    | { ok: false; error: string };

export async function resetDojoMemberPasswordAction(
    formData: FormData
): Promise<ResetMemberPasswordResult> {
    const session = await requireDojoRole("DOJO_MANAGER");
    if (!session.dojo) {
        return { ok: false, error: "Your dojo isn't approved yet." };
    }
    if (!session.dojo.isActive) {
        return {
            ok: false,
            error: "Activate your dojo (complete the enlistment payment) before managing members.",
        };
    }

    const memberId = ((formData.get("memberId") as string) ?? "").trim();
    if (!memberId) return { ok: false, error: "Member id is required." };
    if (memberId === session.userId) {
        return {
            ok: false,
            error: "Use Account settings to change your own password.",
        };
    }

    const member = await prisma.user.findUnique({
        where: { id: memberId },
        select: {
            id: true,
            roleId: true,
            student: { select: { dojoId: true } },
            instructor: { select: { dojoId: true } },
            dojoManager: { select: { dojoId: true } },
        },
    });
    if (!member) return { ok: false, error: "Member not found." };

    const memberDojoId =
        member.student?.dojoId ??
        member.instructor?.dojoId ??
        member.dojoManager?.dojoId ??
        null;
    if (memberDojoId !== session.dojo.id) {
        return { ok: false, error: "Member is not part of your dojo." };
    }

    // Managers can only reset students; Owners can reset students, instructors,
    // and other managers in their dojo. Nobody in this flow can touch the
    // Dojo Owner account — that's an admin-only reset.
    if (member.roleId === "DOJO_OWNER") {
        return {
            ok: false,
            error: "The Dojo Head's password must be reset by a JKA admin.",
        };
    }
    if (session.role === "DOJO_MANAGER" && member.roleId !== "STUDENT") {
        return {
            ok: false,
            error: "Managers can only reset student passwords.",
        };
    }

    const temporaryPassword = generateTemporaryPassword();
    const admin = createAdminClient();
    const { error } = await admin.auth.admin.updateUserById(memberId, {
        password: temporaryPassword,
    });
    if (error) return { ok: false, error: error.message };

    await prisma.user.update({
        where: { id: memberId },
        data: { mustChangePassword: true },
    });

    revalidatePath("/portal/dojo/members");
    revalidatePath(`/portal/dojo/members/${memberId}`);
    return { ok: true, temporaryPassword };
}
