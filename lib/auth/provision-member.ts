import type { User } from "@supabase/supabase-js";
import { prisma } from "@/lib/prisma";
import { emitMemberCreated } from "@/lib/n8n";
import type { RoleId } from "@/lib/auth/load-current-user";
import { ensureRegNo } from "@/lib/members/reg-no";

/**
 * Upsert a user + role-specific profile row for a Supabase auth user
 * and emit jka.member.created on first creation. Safe to call from auth
 * callbacks and OTP verification flows — idempotent and non-fatal if
 * anything fails.
 */
export async function provisionMemberFromSupabaseUser(user: User): Promise<void> {
    try {
        const meta = user.user_metadata ?? {};
        const fullName: string =
            (meta.full_name ??
            [meta.first_name, meta.last_name].filter(Boolean).join(" ")) ||
            user.email!;

        const role: RoleId =
            meta.role === "ADMIN" ? "ADMIN"
            : meta.role === "DOJO_OWNER" ? "DOJO_OWNER"
            : meta.role === "DOJO_MANAGER" ? "DOJO_MANAGER"
            : meta.role === "INSTRUCTOR" ? "INSTRUCTOR"
            : "STUDENT";

        const dojoId =
            typeof meta.dojo_id === "string" && meta.dojo_id ? meta.dojo_id : null;
        const phone =
            typeof user.phone === "string" && user.phone ? user.phone : null;

        const wasExisting = await prisma.user.findUnique({
            where: { id: user.id },
            select: { id: true },
        });

        await prisma.user.upsert({
            where: { id: user.id },
            create: {
                id: user.id,
                email: user.email!,
                phone,
                fullName,
                roleId: role,
            },
            update: {
                email: user.email!,
            },
        });

        // Ensure the matching role-specific row exists, with appropriate
        // defaults. Use plain create/update — we only insert when missing
        // so an already-onboarded student isn't reset.
        switch (role) {
            case "STUDENT": {
                await prisma.student.upsert({
                    where: { id: user.id },
                    create: {
                        id: user.id,
                        currentRank: meta.current_rank ?? "White Belt",
                        dojoId,
                        onboardingComplete: false,
                        membershipStatus: "PENDING",
                    },
                    update: {},
                });
                break;
            }
            case "INSTRUCTOR":
                await prisma.instructor.upsert({
                    where: { id: user.id },
                    create: { id: user.id, dojoId },
                    update: {},
                });
                break;
            case "DOJO_MANAGER":
                await prisma.dojoManager.upsert({
                    where: { id: user.id },
                    create: { id: user.id, dojoId },
                    update: {},
                });
                break;
            case "DOJO_OWNER":
                await prisma.dojoOwner.upsert({
                    where: { id: user.id },
                    create: { id: user.id, dojoId },
                    update: {},
                });
                break;
            case "ADMIN":
                await prisma.admin.upsert({
                    where: { id: user.id },
                    create: { id: user.id },
                    update: {},
                });
                break;
        }

        // Every role gets a Reg No (JKA-BD-YYMMxxx) on the users row.
        await ensureRegNo(user.id);

        if (!wasExisting) {
            const fresh = await prisma.user.findUnique({ where: { id: user.id } });
            if (fresh) {
                await emitMemberCreated({
                    id: fresh.id,
                    fullName: fresh.fullName,
                    email: fresh.email,
                    phone: fresh.phone,
                    currentRank:
                        role === "STUDENT"
                            ? (meta.current_rank as string | undefined) ?? "White Belt"
                            : "—",
                });
            }
        }
    } catch (err) {
        console.error("[provisionMemberFromSupabaseUser] failed:", err);
    }
}
