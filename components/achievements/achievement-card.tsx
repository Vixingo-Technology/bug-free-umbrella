import * as Icons from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { AchievementTier } from "@/prisma/generated/client";
import { TIER_STYLES } from "@/lib/achievements/catalog";

export type AchievementCardProps = {
    name: string;
    description: string;
    icon: string;
    tier: AchievementTier;
    unlocked: boolean;
    unlockedAt?: Date | null;
    size?: "sm" | "md";
};

/**
 * Shared achievement card. Locked = greyscale + low opacity; unlocked =
 * tier-coloured. Rare/Epic/Legendary unlocked cards get an animated glow.
 */
export default function AchievementCard({
    name,
    description,
    icon,
    tier,
    unlocked,
    unlockedAt,
    size = "md",
}: AchievementCardProps) {
    const IconComp: LucideIcon =
        (Icons as unknown as Record<string, LucideIcon>)[icon] ?? Icons.Award;
    const style = TIER_STYLES[tier];

    const padding = size === "sm" ? "p-3" : "p-5";
    const iconSize = size === "sm" ? 22 : 28;
    const iconWrap = size === "sm" ? "w-12 h-12" : "w-16 h-16";

    if (!unlocked) {
        return (
            <div
                className={`relative ${padding} rounded-lg border border-zinc-200 bg-zinc-50/60 grayscale opacity-60 flex flex-col items-center text-center`}
            >
                <div className={`${iconWrap} rounded-full bg-zinc-200 flex items-center justify-center mb-3`}>
                    <Icons.Lock size={iconSize - 4} className="text-zinc-400" />
                </div>
                <p className="font-bold text-sm text-zinc-600 leading-tight">{name}</p>
                <p className={`text-xs text-zinc-500 mt-1 ${size === "sm" ? "line-clamp-2" : ""}`}>
                    {description}
                </p>
                <span className="mt-3 text-[9px] font-bold tracking-widest uppercase px-1.5 py-0.5 rounded bg-zinc-200 text-zinc-500">
                    {style.label}
                </span>
            </div>
        );
    }

    return (
        <div
            className={`relative ${padding} rounded-lg border-2 ${style.ring} ${style.bg} flex flex-col items-center text-center ${style.glow ?? ""}`}
        >
            <div className={`${iconWrap} rounded-full bg-white ${style.ring} border-2 flex items-center justify-center mb-3 shadow-sm`}>
                <IconComp size={iconSize} className={style.text} />
            </div>
            <p className="font-bold text-sm text-zinc-900 leading-tight">{name}</p>
            <p className={`text-xs text-zinc-600 mt-1 ${size === "sm" ? "line-clamp-2" : ""}`}>
                {description}
            </p>
            <div className="flex items-center gap-1.5 mt-3">
                <span className={`text-[9px] font-bold tracking-widest uppercase px-1.5 py-0.5 rounded ${style.chip}`}>
                    {style.label}
                </span>
                {unlockedAt && (
                    <span className="text-[10px] font-mono text-zinc-500">
                        {new Date(unlockedAt).toLocaleDateString("en-GB", {
                            day: "numeric",
                            month: "short",
                            year: "numeric",
                        })}
                    </span>
                )}
            </div>
        </div>
    );
}
