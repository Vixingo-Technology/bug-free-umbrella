"use client";

import * as Icons from "lucide-react";
import type { LucideIcon } from "lucide-react";
import Link from "next/link";
import { Trophy, ChevronRight, Lock } from "lucide-react";
import { TIER_STYLES } from "@/lib/achievements/catalog";
import type { AchievementTier } from "@/prisma/generated/client";

export type AchievementItem = {
    slug: string;
    name: string;
    description: string;
    icon: string;
    tier: AchievementTier;
    unlocked: boolean;
    unlockedAt: string | null;
};

interface Props {
    achievements: AchievementItem[];
    unlocked: number;
    total: number;
    pct: number;
}

function renderIcon(name: string, size: number, className: string) {
    const Comp: LucideIcon = (Icons as unknown as Record<string, LucideIcon>)[name] ?? Icons.Award;
    return <Comp size={size} className={className} />;
}

/**
 * Steam-style achievements panel for the member dashboard. Shows a headline
 * progress bar ("You've unlocked 3/18 (17%)"), the most recently unlocked
 * achievement with full details on top, and every remaining achievement as a
 * compact icon-only badge (tier-coloured when unlocked, locked otherwise).
 */
export default function AchievementsPanel({ achievements, unlocked, total, pct }: Props) {
    const unlockedItems = achievements
        .filter((a) => a.unlocked && a.unlockedAt)
        .sort((a, b) => new Date(b.unlockedAt!).getTime() - new Date(a.unlockedAt!).getTime());

    const featured = unlockedItems[0] ?? null;
    const rest = achievements.filter((a) => a.slug !== featured?.slug);

    const featuredStyle = featured ? TIER_STYLES[featured.tier] : null;

    return (
        <div className="flex flex-col h-full">
            {/* Header */}
            <div className="flex items-center justify-between mb-4">
                <h2 className="text-sm font-bold text-zinc-900 flex items-center gap-2">
                    <Trophy size={16} className="text-amber-500" />
                    Achievements
                </h2>
                <Link
                    href="/portal/achievements"
                    className="text-xs text-accent-red font-semibold hover:text-accent-gold transition-colors flex items-center gap-1"
                >
                    View All <ChevronRight size={12} />
                </Link>
            </div>

            {/* Progress */}
            <div className="mb-4">
                <p className="text-xs font-medium text-zinc-600">
                    You&apos;ve unlocked{" "}
                    <span className="font-bold text-zinc-900">
                        {unlocked}/{total}
                    </span>{" "}
                    <span className="text-zinc-400">({pct}%)</span>
                </p>
                <div className="mt-2 h-1.5 bg-zinc-100 rounded-full overflow-hidden">
                    <div
                        className="h-full bg-gradient-to-r from-amber-400 via-orange-400 to-amber-500 transition-all"
                        style={{ width: `${pct}%` }}
                    />
                </div>
            </div>

            {/* Recently unlocked — featured with details */}
            {featured && featuredStyle ? (
                <div
                    className={`flex items-center gap-3 p-3 rounded-xl border ${featuredStyle.ring} ${featuredStyle.bg} mb-4`}
                >
                    <div
                        className={`w-12 h-12 flex-shrink-0 rounded-full bg-white border-2 ${featuredStyle.ring} flex items-center justify-center shadow-sm`}
                    >
                        {renderIcon(featured.icon, 22, featuredStyle.text)}
                    </div>
                    <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                            <p className="text-sm font-bold text-zinc-900 truncate">{featured.name}</p>
                            <span
                                className={`text-[9px] font-bold tracking-widest uppercase px-1.5 py-0.5 rounded ${featuredStyle.chip}`}
                            >
                                {featuredStyle.label}
                            </span>
                        </div>
                        <p className="text-xs text-zinc-600 mt-0.5 line-clamp-2">{featured.description}</p>
                        {featured.unlockedAt && (
                            <p className="text-[10px] font-mono text-zinc-400 mt-0.5">
                                Unlocked{" "}
                                {new Date(featured.unlockedAt).toLocaleDateString("en-GB", {
                                    day: "numeric",
                                    month: "short",
                                    year: "numeric",
                                })}
                            </p>
                        )}
                    </div>
                </div>
            ) : (
                <div className="flex items-center gap-3 p-3 rounded-xl border border-zinc-100 bg-zinc-50/70 mb-4">
                    <div className="w-12 h-12 flex-shrink-0 rounded-full bg-zinc-100 flex items-center justify-center">
                        <Lock size={20} className="text-zinc-400" />
                    </div>
                    <div>
                        <p className="text-sm font-semibold text-zinc-700">No achievements yet</p>
                        <p className="text-xs text-zinc-500 mt-0.5">
                            Show up, grade, and compete to unlock your first badge.
                        </p>
                    </div>
                </div>
            )}

            {/* Remaining achievements — icon only */}
            <div className="mt-auto flex flex-wrap gap-2">
                {rest.map((a) => {
                    const style = TIER_STYLES[a.tier];
                    if (a.unlocked) {
                        return (
                            <div
                                key={a.slug}
                                title={a.name}
                                className={`w-9 h-9 rounded-lg border ${style.ring} ${style.bg} flex items-center justify-center`}
                            >
                                {renderIcon(a.icon, 16, style.text)}
                            </div>
                        );
                    }
                    return (
                        <div
                            key={a.slug}
                            title={`${a.name} — Locked`}
                            className="w-9 h-9 rounded-lg border border-zinc-200 bg-zinc-50 flex items-center justify-center opacity-60"
                        >
                            <Lock size={14} className="text-zinc-400" />
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
