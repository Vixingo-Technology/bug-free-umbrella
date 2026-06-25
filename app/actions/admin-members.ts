"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/admin-guard";
import { createAdminClient } from "@/lib/supabase/admin";

type ActionResult = { ok: true } | { ok: false; error: string };

const ROLES = ["STUDENT", "INSTRUCTOR", "DOJO_MANAGER", "DOJO_OWNER", "ADMIN"] as const;
type Role = (typeof ROLES)[number];

const STATUSES = ["PENDING", "ACTIVE", "EXPIRED", "SUSPENDED"] as const;
type Status = (typeof STATUSES)[number];

export async function inviteMemberAction(formData: FormData): Promise<ActionResult> {
    await requireAdmin();

    const email = (formData.get("email") as string)?.trim().toLowerCase();
    const fullName = ((formData.get("fullName") as string) ?? "").trim();
    const role = formData.get("role") as Role;

    if (!email) return { ok: false, error: "Email is required." };
    if (!ROLES.includes(role)) return { ok: false, error: "Invalid role." };

    const existing = await prisma.member.findUnique({ where: { email } });
    if (existing) return { ok: false, error: "A member with this email already exists." };

    const admin = createAdminClient();

    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? process.env.APP_URL ?? "http://localhost:3000";
    const redirectTo = `${appUrl}/auth/callback?next=/set-password`;

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

    // Pre-create the member row so the invited user shows up in the list
    // immediately. The auth/callback upsert will keep it in sync.
    await prisma.member.upsert({
        where: { id: data.user.id },
        create: {
            id: data.user.id,
            email,
            fullName: fullName || email,
            role,
            onboardingComplete: false,
            membershipStatus: "PENDING",
        },
        update: {
            email,
            fullName: fullName || email,
            role,
        },
    });

    revalidatePath("/portal/admin/members");
    return { ok: true };
}

export async function updateMemberRoleAction(formData: FormData): Promise<ActionResult> {
    await requireAdmin();

    const memberId = formData.get("memberId") as string;
    const role = formData.get("role") as Role;

    if (!memberId) return { ok: false, error: "Member id is required." };
    if (!ROLES.includes(role)) return { ok: false, error: "Invalid role." };

    await prisma.member.update({
        where: { id: memberId },
        data: { role },
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
    await requireAdmin();

    const memberId = formData.get("memberId") as string;
    const status = formData.get("status") as Status;

    if (!memberId) return { ok: false, error: "Member id is required." };
    if (!STATUSES.includes(status)) return { ok: false, error: "Invalid status." };

    await prisma.member.update({
        where: { id: memberId },
        data: {
            membershipStatus: status,
            isActive: status !== "SUSPENDED",
        },
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
