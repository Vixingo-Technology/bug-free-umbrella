/**
 * Achievement catalog — single source of truth for rules + presentation.
 *
 * The slugs MUST match the rows seeded in
 * scripts/migrations/2026-06-30-achievements.sql. The evaluation engine
 * (lib/achievements/evaluate.ts) looks up rules by slug, and the portal UI
 * uses this file for icon names and tier colours.
 */

import type { AchievementTier, AchievementRule } from "@/prisma/generated/client";

export type CatalogEntry = {
    slug: string;
    name: string;
    nameBn: string;
    description: string;
    descriptionBn: string;
    icon: string; // lucide-react icon component name
    tier: AchievementTier;
    rule: AchievementRule;
    threshold?: number;
    orderIndex: number;
};

export const ACHIEVEMENT_CATALOG: readonly CatalogEntry[] = [
    // COMMON
    { slug: "first-belt",        name: "First Belt",         nameBn: "প্রথম বেল্ট",         description: "Pass your first grading.",                         descriptionBn: "আপনার প্রথম গ্রেডিং পাস করুন।",              icon: "Award",          tier: "COMMON",    rule: "GRADINGS_PASSED",         threshold: 1,   orderIndex: 40 },
    { slug: "first-event",       name: "Event Attendee",     nameBn: "ইভেন্টে উপস্থিত",       description: "Attend your first JKA event or seminar.",          descriptionBn: "প্রথম JKA ইভেন্টে অংশ নিন।",                 icon: "CalendarCheck",  tier: "COMMON",    rule: "EVENTS_ATTENDED",         threshold: 1,   orderIndex: 50 },

    // RARE
    { slug: "three-belts",       name: "Triple Rank",        nameBn: "তিন বেল্ট",           description: "Pass three gradings.",                             descriptionBn: "তিনটি গ্রেডিং পাস করুন।",                    icon: "Medal",          tier: "RARE",      rule: "GRADINGS_PASSED",         threshold: 3,   orderIndex: 80 },
    { slug: "first-certificate", name: "Certified",          nameBn: "সার্টিফাইড",          description: "Earn your first printed JKA certificate.",         descriptionBn: "প্রথম মুদ্রিত JKA সার্টিফিকেট অর্জন করুন।",    icon: "FileCheck",      tier: "RARE",      rule: "CERTIFICATES_EARNED",     threshold: 1,   orderIndex: 90 },
    { slug: "first-tournament",  name: "Competitor",         nameBn: "প্রতিযোগী",          description: "Register for your first tournament.",              descriptionBn: "প্রথম টুর্নামেন্টে নিবন্ধন করুন।",              icon: "Swords",         tier: "RARE",      rule: "TOURNAMENTS_PARTICIPATED",threshold: 1,   orderIndex: 100 },

    // EPIC
    { slug: "five-belts",        name: "Five Belt Climb",    nameBn: "পাঁচ বেল্ট আরোহণ",      description: "Pass five gradings.",                              descriptionBn: "পাঁচটি গ্রেডিং পাস করুন।",                    icon: "TrendingUp",     tier: "EPIC",      rule: "GRADINGS_PASSED",         threshold: 5,   orderIndex: 130 },
    { slug: "tournament-victor", name: "Tournament Victor",  nameBn: "টুর্নামেন্ট বিজয়ী",       description: "Win your first tournament match.",                 descriptionBn: "প্রথম টুর্নামেন্ট ম্যাচ জয় করুন।",              icon: "Trophy",         tier: "EPIC",      rule: "TOURNAMENT_WINS",         threshold: 1,   orderIndex: 140 },
    { slug: "kata-spirit",       name: "Kata Spirit",        nameBn: "কাটা আত্মা",           description: "Awarded by your dojo for exceptional kata performance.", descriptionBn: "অসাধারণ কাটা পরিবেশনার জন্য প্রদত্ত।",       icon: "Sparkles",       tier: "EPIC",      rule: "MANUAL",                                  orderIndex: 150 },

    // LEGENDARY
    { slug: "tournament-champion",name:"Tournament Champion",nameBn: "টুর্নামেন্ট চ্যাম্পিয়ন",   description: "Win five tournament matches.",                     descriptionBn: "পাঁচটি টুর্নামেন্ট ম্যাচ জয় করুন।",            icon: "Trophy",         tier: "LEGENDARY", rule: "TOURNAMENT_WINS",         threshold: 5,   orderIndex: 170 },
    { slug: "dojo-pride",        name: "Pride of the Dojo",  nameBn: "ডোজোর গর্ব",          description: "Awarded by the dojo head for outstanding character.", descriptionBn: "অসাধারণ চরিত্রের জন্য ডোজো প্রধান কর্তৃক প্রদত্ত।", icon: "Star",       tier: "LEGENDARY", rule: "MANUAL",                                  orderIndex: 180 },
] as const;

export const TIER_RANK: Record<AchievementTier, number> = {
    COMMON: 1,
    RARE: 2,
    EPIC: 3,
    LEGENDARY: 4,
};

/** Tailwind classes for each tier — used by every achievement renderer. */
export const TIER_STYLES: Record<
    AchievementTier,
    {
        label: string;
        ring: string;       // unlocked card border + ring
        bg: string;         // unlocked card background gradient
        text: string;       // unlocked icon colour
        chip: string;       // small tier-name chip
        glow?: string;      // animated glow for rare/legendary (locked = no glow)
    }
> = {
    COMMON: {
        label: "Common",
        ring: "border-emerald-200",
        bg: "bg-gradient-to-br from-emerald-50 to-white",
        text: "text-emerald-600",
        chip: "bg-emerald-100 text-emerald-700",
    },
    RARE: {
        label: "Rare",
        ring: "border-sky-300",
        bg: "bg-gradient-to-br from-sky-50 to-white",
        text: "text-sky-600",
        chip: "bg-sky-100 text-sky-700",
        glow: "shadow-[0_0_24px_rgba(56,189,248,0.45)] animate-[pulse_3s_ease-in-out_infinite]",
    },
    EPIC: {
        label: "Epic",
        ring: "border-violet-300",
        bg: "bg-gradient-to-br from-violet-50 to-white",
        text: "text-violet-600",
        chip: "bg-violet-100 text-violet-700",
        glow: "shadow-[0_0_28px_rgba(167,139,250,0.55)] animate-[pulse_2.6s_ease-in-out_infinite]",
    },
    LEGENDARY: {
        label: "Legendary",
        ring: "border-amber-400",
        bg: "bg-gradient-to-br from-amber-50 via-orange-50 to-white",
        text: "text-amber-600",
        chip: "bg-amber-100 text-amber-800",
        glow: "shadow-[0_0_32px_rgba(251,191,36,0.7)] animate-[pulse_2.2s_ease-in-out_infinite]",
    },
};

export function findCatalogEntry(slug: string): CatalogEntry | undefined {
    return ACHIEVEMENT_CATALOG.find((a) => a.slug === slug);
}
