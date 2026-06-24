import type { User } from "@supabase/supabase-js";
import { prisma } from "@/lib/prisma";
import { emitMemberCreated } from "@/lib/n8n";

/**
 * Upsert a members row for a Supabase auth user and emit jka.member.created
 * on first creation. Safe to call from auth callbacks and OTP verification
 * flows — idempotent and non-fatal if anything fails.
 */
export async function provisionMemberFromSupabaseUser(user: User): Promise<void> {
    try {
        const meta = user.user_metadata ?? {};
        const fullName: string =
            (meta.full_name ??
            [meta.first_name, meta.last_name].filter(Boolean).join(" ")) ||
            user.email!;

        await prisma.member.upsert({
            where: { id: user.id },
            create: {
                id: user.id,
                email: user.email!,
                fullName,
                currentRank: meta.current_rank ?? "White Belt",
                role: meta.role === "INSTRUCTOR" ? "INSTRUCTOR"
                    : meta.role === "ADMIN" ? "ADMIN"
                    : "STUDENT",
                onboardingComplete: false,
                membershipStatus: "PENDING",
            },
            update: {
                email: user.email!,
            },
        });

        const freshMember = await prisma.member.findUnique({ where: { id: user.id } });
        const isNew = freshMember && (Date.now() - freshMember.createdAt.getTime()) < 30_000;
        if (isNew) {
            await emitMemberCreated({
                id: freshMember.id,
                fullName: freshMember.fullName,
                email: freshMember.email,
                phone: freshMember.phone,
                currentRank: freshMember.currentRank,
            });
        }
    } catch (err) {
        console.error("[provisionMemberFromSupabaseUser] failed:", err);
    }
}
