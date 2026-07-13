"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/admin-guard";
import { createAdminClient } from "@/lib/supabase/admin";
import { assignRole } from "@/lib/auth/assign-role";
import { sendEmail } from "@/lib/email/resend";
import { buildDojoOwnerInviteEmail } from "@/lib/email/templates/dojo-owner-invite";
import { logActivity } from "@/lib/activity/log";

type ActionResult = { ok: true } | { ok: false; error: string };

const ROLES = ["STUDENT", "INSTRUCTOR", "DOJO_MANAGER", "DOJO_OWNER", "ADMIN"] as const;
type Role = (typeof ROLES)[number];

// Admin can only issue federation-level invites: bring on new Dojo Owners
// (via the enlist-dojo flow) or promote another Admin. Instructors, managers
// and students are invited by a Dojo Owner from within their own dojo panel.
const ADMIN_INVITABLE_ROLES = ["DOJO_OWNER", "ADMIN"] as const;
type AdminInvitableRole = (typeof ADMIN_INVITABLE_ROLES)[number];

const STATUSES = ["PENDING", "ACTIVE", "EXPIRED", "SUSPENDED"] as const;
type Status = (typeof STATUSES)[number];

function appUrl(): string {
    return (
        process.env.NEXT_PUBLIC_APP_URL ??
        process.env.APP_URL ??
        "http://localhost:3000"
    );
}

export async function inviteMemberAction(formData: FormData): Promise<ActionResult> {
    const { userId: adminId } = await requireAdmin();

    const email = (formData.get("email") as string)?.trim().toLowerCase();
    const fullName = ((formData.get("fullName") as string) ?? "").trim();
    const role = formData.get("role") as AdminInvitableRole;

    if (!email) return { ok: false, error: "Email is required." };
    if (!ADMIN_INVITABLE_ROLES.includes(role)) {
        return {
            ok: false,
            error: "Admins can only invite Dojo Owners or other Admins.",
        };
    }

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) return { ok: false, error: "A member with this email already exists." };

    // Dojo Owners go through the public /enlist-dojo/signup flow — we send a
    // marketing-style invitation email with the CTA, but we do NOT pre-create
    // a Supabase auth user or a DB row. The enlistment wizard collects the
    // dojo, verifies email, and takes the one-time payment on its own.
    if (role === "DOJO_OWNER") {
        const inviter = await prisma.user.findUnique({
            where: { id: adminId },
            select: { fullName: true },
        });
        const signupUrl = `${appUrl()}/enlist-dojo/signup`;
        const email_ = await buildDojoOwnerInviteEmail({
            signupUrl,
            inviteeName: fullName || null,
            inviterName: inviter?.fullName ?? null,
        });
        const res = await sendEmail({
            to: email,
            subject: email_.subject,
            html: email_.html,
            text: email_.text,
        });
        if (!res.ok) return { ok: false, error: res.error };
        return { ok: true };
    }

    // ADMIN — use Supabase's invite so the recipient lands on /set-password
    // and immediately has a working admin account.
    const admin = createAdminClient();
    const redirectTo = `${appUrl()}/auth/callback?next=/set-password`;

    const { data, error } = await admin.auth.admin.inviteUserByEmail(email, {
        redirectTo,
        data: {
            role,
            full_name: fullName || email,
            invited: true,
        },
    });

    if (error || !data.user) {
        return { ok: false, error: error?.message ?? "Failed to send invite." };
    }

    await prisma.user.upsert({
        where: { id: data.user.id },
        create: {
            id: data.user.id,
            email,
            fullName: fullName || email,
            roleId: role,
        },
        update: {
            email,
            fullName: fullName || email,
            roleId: role,
        },
    });
    await assignRole(data.user.id, role);

    revalidatePath("/portal/admin/members");
    return { ok: true };
}

export async function updateMemberRoleAction(formData: FormData): Promise<ActionResult> {
    const { userId: adminId } = await requireAdmin();

    const memberId = formData.get("memberId") as string;
    const role = formData.get("role") as Role;

    if (!memberId) return { ok: false, error: "Member id is required." };
    if (!ROLES.includes(role)) return { ok: false, error: "Invalid role." };

    const before = await prisma.user.findUnique({
        where: { id: memberId },
        select: { roleId: true, email: true, fullName: true },
    });

    await assignRole(memberId, role);

    await logActivity({
        action: "admin.member.role_change",
        message: `Role changed for ${before?.fullName ?? memberId}: ${before?.roleId ?? "?"} → ${role}`,
        severity: role === "ADMIN" ? "WARNING" : "INFO",
        actorId: adminId,
        actorRole: "ADMIN",
        resource: "user",
        resourceId: memberId,
        metadata: { from: before?.roleId, to: role, email: before?.email },
    });

    // Keep user_metadata in sync so the JWT role claim stays accurate
    try {
        const admin = createAdminClient();
        await admin.auth.admin.updateUserById(memberId, {
            user_metadata: { role },
        });
    } catch {
        // Non-fatal — DB is the source of truth.
    }

    revalidatePath("/portal/admin/members");
    return { ok: true };
}

export async function updateMemberStatusAction(formData: FormData): Promise<ActionResult> {
    const { userId: adminId } = await requireAdmin();

    const memberId = formData.get("memberId") as string;
    const status = formData.get("status") as Status;

    if (!memberId) return { ok: false, error: "Member id is required." };
    if (!STATUSES.includes(status)) return { ok: false, error: "Invalid status." };

    const target = await prisma.user.findUnique({
        where: { id: memberId },
        select: { fullName: true, email: true },
    });

    await prisma.$transaction([
        prisma.user.update({
            where: { id: memberId },
            data: { isActive: status !== "SUSPENDED" },
        }),
        prisma.student.updateMany({
            where: { id: memberId },
            data: { membershipStatus: status },
        }),
    ]);

    await logActivity({
        action: "admin.member.status_change",
        message: `${target?.fullName ?? memberId} status → ${status}`,
        severity: status === "SUSPENDED" ? "WARNING" : "INFO",
        actorId: adminId,
        actorRole: "ADMIN",
        resource: "user",
        resourceId: memberId,
        metadata: { status, email: target?.email },
    });

    revalidatePath("/portal/admin/members");
    return { ok: true };
}

export async function deleteMemberAction(formData: FormData): Promise<ActionResult> {
    const { userId: adminId } = await requireAdmin();

    const memberId = formData.get("memberId") as string;
    if (!memberId) return { ok: false, error: "Member id is required." };
    if (memberId === adminId) {
        return { ok: false, error: "You cannot delete your own admin account." };
    }

    const target = await prisma.user.findUnique({
        where: { id: memberId },
        select: { id: true, fullName: true, email: true, roleId: true },
    });
    if (!target) return { ok: false, error: "Member not found." };

    const admin = createAdminClient();

    // Detach any dojo the member is tied to BEFORE removing the user. The
    // dojo itself must survive — a Dojo Owner leaving the club doesn't take
    // the physical dojo with them. Doing this explicitly (rather than relying
    // on schema-level FK behaviour) removes any risk that a stale DB-level
    // cascade from an earlier migration takes the dojo down with the owner.
    await prisma.dojoOwner.deleteMany({ where: { id: memberId } });
    await prisma.dojoManager.deleteMany({ where: { id: memberId } });
    await prisma.instructor.deleteMany({ where: { id: memberId } });

    // Delete the Supabase auth user next — the DB row (and every role-table
    // row via ON DELETE CASCADE) goes with it because `users.id` references
    // `auth.users.id`. If auth deletion fails we bail out before touching the DB.
    const { error: authError } = await admin.auth.admin.deleteUser(memberId);
    if (authError && !/not.?found/i.test(authError.message)) {
        return { ok: false, error: authError.message };
    }

    // Belt-and-braces: if the DB row is still present (e.g. no auth cascade
    // configured), remove it explicitly. Role-specific rows cascade from `users`.
    await prisma.user.deleteMany({ where: { id: memberId } });

    await logActivity({
        action: "admin.member.delete",
        message: `Hard-deleted ${target.fullName} (${target.email})`,
        severity: "CRITICAL",
        actorId: adminId,
        actorRole: "ADMIN",
        resource: "user",
        resourceId: memberId,
        metadata: { role: target.roleId, email: target.email },
    });

    revalidatePath("/portal/admin/members");
    return { ok: true };
}

export async function resendInviteAction(formData: FormData): Promise<ActionResult> {
    await requireAdmin();

    const email = (formData.get("email") as string)?.trim().toLowerCase();
    if (!email) return { ok: false, error: "Email is required." };

    const admin = createAdminClient();
    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? process.env.APP_URL ?? "http://localhost:3000";

    const { error } = await admin.auth.admin.inviteUserByEmail(email, {
        redirectTo: `${appUrl}/auth/callback?next=/set-password`,
    });

    if (error) return { ok: false, error: error.message };
    return { ok: true };
}
