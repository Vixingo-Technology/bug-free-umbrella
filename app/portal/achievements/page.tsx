import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Trophy } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { ACHIEVEMENT_CATALOG, TIER_STYLES } from "@/lib/achievements/catalog";
import { evaluateAchievements } from "@/lib/achievements/evaluate";
import AchievementCard from "@/components/achievements/achievement-card";
import type { AchievementTier } from "@/prisma/generated/client";

export const metadata: Metadata = {
    title: "Achievements — JKA Bangladesh",
};

export const dynamic = "force-dynamic";

const TIER_ORDER: AchievementTier[] = ["LEGENDARY", "EPIC", "RARE", "COMMON"];

export default async function AchievementsPage() {
    const supabase = await createClient();
    const {
        data: { user },
    } = await supabase.auth.getUser();
    if (!user) redirect("/login?next=/portal/achievements");

    // Re-evaluate on each visit so the page is always fresh (cheap — just
    // counts queries plus an insert when something new fires).
    await evaluateAchievements(user.id);

    const unlocked = await prisma.studentAchievement.findMany({
        where: { studentId: user.id },
        select: {
            unlockedAt: true,
            achievement: { select: { slug: true } },
        },
    });
    const unlockedBySlug = new Map(
        unlocked.map((u) => [u.achievement.slug, u.unlockedAt]),
    );

    const total = ACHIEVEMENT_CATALOG.length;
    const unlockedCount = unlocked.length;
    const pct = total > 0 ? Math.round((unlockedCount / total) * 100) : 0;

    return (
        <div className="space-y-8">
            {/* Header */}
            <div className="bg-gradient-to-br from-zinc-900 via-zinc-800 to-zinc-900 rounded-2xl p-6 sm:p-8 text-white relative overflow-hidden">
                <div className="absolute -right-12 -top-12 w-64 h-64 rounded-full bg-amber-500/10 blur-3xl pointer-events-none" />
                <div className="relative">
                    <p className="text-[10px] tracking-[0.4em] uppercase text-amber-400 font-bold mb-2">
                        Your journey
                    </p>
                    <h1 className="font-karate text-2xl md:text-3xl font-bold uppercase tracking-wider mb-3 flex items-center gap-3">
                        <Trophy className="text-amber-400" size={28} />
                        Achievements
                    </h1>
                    <p className="text-zinc-300 text-sm max-w-xl">
                        {unlockedCount} of {total} unlocked · keep showing up,
                        grading, and competing to unlock rare and legendary badges.
                    </p>
                    <div className="mt-4 max-w-md">
                        <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                            <div
                                className="h-full bg-gradient-to-r from-amber-400 via-orange-400 to-amber-500 transition-all"
                                style={{ width: `${pct}%` }}
                            />
                        </div>
                        <p className="text-[10px] mt-1.5 font-mono text-zinc-400">
                            {pct}% complete
                        </p>
                    </div>
                </div>
            </div>

            {/* Tier sections */}
            {TIER_ORDER.map((tier) => {
                const items = ACHIEVEMENT_CATALOG
                    .filter((a) => a.tier === tier)
                    .sort((a, b) => a.orderIndex - b.orderIndex);
                if (items.length === 0) return null;
                const style = TIER_STYLES[tier];
                const tierUnlocked = items.filter((a) => unlockedBySlug.has(a.slug)).length;

                return (
                    <section key={tier} className="space-y-4">
                        <div className="flex items-center justify-between">
                            <h2 className="font-karate text-lg font-bold uppercase tracking-wider text-zinc-900 flex items-center gap-3">
                                <span className={`inline-block w-2 h-6 rounded ${style.chip.split(" ")[0]}`} />
                                {style.label}
                            </h2>
                            <span className="text-xs font-mono font-bold text-zinc-500">
                                {tierUnlocked} / {items.length}
                            </span>
                        </div>
                        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
                            {items.map((a) => (
                                <AchievementCard
                                    key={a.slug}
                                    name={a.name}
                                    description={a.description}
                                    icon={a.icon}
                                    tier={a.tier}
                                    unlocked={unlockedBySlug.has(a.slug)}
                                    unlockedAt={unlockedBySlug.get(a.slug) ?? null}
                                />
                            ))}
                        </div>
                    </section>
                );
            })}
        </div>
    );
}
