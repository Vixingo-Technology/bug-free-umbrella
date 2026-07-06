"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { assignRole } from "@/lib/auth/assign-role";
import type { RoleId } from "@/lib/auth/load-current-user";
import { resolvePostAuthLanding } from "@/lib/auth/post-auth-landing";

type Result = { ok?: true; error?: string };

const VALID_ROLES: RoleId[] = ["STUDENT", "INSTRUCTOR", "DOJO_MANAGER"];

/**
 * Complete a pending invite: verify the invited session, save the chosen
 * name/rank, upgrade the pre-created role row with dojoId + rank, set the
 * password, and drop the user into their dashboard.
 */
export async function completeInviteSignupAction(
    formData: FormData
): Promise<Result> {
    const fullName = ((formData.get("fullName") as string) ?? "").trim();
    const rank = ((formData.get("rank") as string) ?? "").trim();
    const password = (formData.get("password") as string) ?? "";
    const confirm = (formData.get("confirm") as string) ?? "";

    if (!fullName) return { error: "Please enter your full name." };
    if (password.length < 8)
        return { error: "Password must be at least 8 characters." };
    if (password !== confirm) return { error: "Passwords do not match." };

    const supabase = await createClient();
    const {
        data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
        return {
            error: "Your invite link has expired. Ask your Dojo Head to resend the invite.",
        };
    }

    const meta = (user.user_metadata ?? {}) as Record<string, unknown>;
    if (!meta.pending_invite && !meta.invited) {
        return {
            error: "This account is already active. Please log in normally.",
        };
    }

    const role: RoleId =
        typeof meta.role === "string" && VALID_ROLES.includes(meta.role as RoleId)
            ? (meta.role as RoleId)
            : "STUDENT";
    const dojoId =
        typeof meta.dojo_id === "string" && meta.dojo_id ? meta.dojo_id : null;

    const { error: pwdError } = await supabase.auth.updateUser({
        password,
        data: {
            full_name: fullName,
            rank,
            pending_invite: false,
        },
    });
    if (pwdError) return { error: pwdError.message };

    try {
        await prisma.user.upsert({
            where: { id: user.id },
            create: {
                id: user.id,
                email: user.email ?? "",
                fullName,
                roleId: role,
                isActive: true,
            },
            update: {
                fullName,
                roleId: role,
                isActive: true,
            },
        });
        await assignRole(user.id, role, {
            dojoId,
            studentDefaults: {
                currentRank: rank || "White Belt",
                membershipStatus: "PENDING",
            },
        });

        if (role === "INSTRUCTOR" && rank) {
            await prisma.instructor.update({
                where: { id: user.id },
                data: { bio: `Rank: ${rank}` },
            });
        }
    } catch (e) {
        const message =
            e instanceof Error ? e.message : "Could not activate your account.";
        return { error: message };
    }

    // redirect() throws NEXT_REDIRECT — must run outside the try/catch above.
    // Redirect straight to the correct landing so we avoid a client-side
    // /portal → /portal/onboarding double-hop that can strand the router on
    // a stale RSC tree (blank onboarding screen until manual reload).
    redirect(await resolvePostAuthLanding(user.id));
}
