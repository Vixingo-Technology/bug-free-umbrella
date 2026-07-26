import { CheckCircle2, XCircle, AlertTriangle, Clock } from "lucide-react";

export type MembershipStatusLabel =
    | "Active"
    | "Expired"
    | "Expiring Soon"
    | "Pending";

const statusDot: Record<MembershipStatusLabel, string> = {
    Active: "bg-emerald-500",
    Expired: "bg-red-500",
    "Expiring Soon": "bg-amber-500",
    Pending: "bg-zinc-400",
};

const statusIcon: Record<MembershipStatusLabel, any> = {
    Active: CheckCircle2,
    Expired: XCircle,
    "Expiring Soon": AlertTriangle,
    Pending: Clock,
};

const beltColors: Record<string, string> = {
    "White Belt":          "#FFFFFF",
    "Stripe Yellow Belt":  "#FFD700",
    "Yellow Belt":         "#FFD700",
    "Orange Belt":         "#FF8C00",
    "Green Belt":          "#228B22",
    "Blue Belt":           "#0000CD",
    "Purple Belt":         "#7C3AED",
    "Brown Belt 3rd Kyu":  "#8B4513",
    "Brown Belt 2nd Kyu":  "#8B4513",
    "Brown Belt 1st Kyu":  "#8B4513",
    "Black Belt 1st Dan":  "#1a1a1a",
};

function isLightColor(hex: string): boolean {
    const clean = hex.replace("#", "");
    if (clean.length !== 6) return false;
    const r = parseInt(clean.slice(0, 2), 16);
    const g = parseInt(clean.slice(2, 4), 16);
    const b = parseInt(clean.slice(4, 6), 16);
    return (r * 299 + g * 587 + b * 114) / 1000 > 170;
}

interface Props {
    fullName: string;
    email?: string | null;
    currentRank?: string | null;
    dojoName?: string | null;
    role?: string | null;
    membershipStatus: MembershipStatusLabel;
    memberNumber?: string | null;
    avatarUrl?: string | null;
    /** Adds a subtle scale-on-hover for clickable contexts. */
    interactive?: boolean;
}

export default function DigitalCard({
    fullName,
    currentRank,
    dojoName,
    role,
    membershipStatus,
    memberNumber,
    avatarUrl,
    interactive = false,
}: Props) {
    const belt = currentRank ?? "White Belt";
    const beltColor = beltColors[belt] ?? "#FFFFFF";
    const beltTextDark = isLightColor(beltColor);
    const dot = statusDot[membershipStatus];
    const initial = (fullName || "M").charAt(0).toUpperCase();
    const affiliation =
        role && dojoName
            ? `${role} of ${dojoName}`
            : role ?? (dojoName ? `Member of ${dojoName}` : "Member");

    return (
        <div
            className={`relative h-full min-h-[260px] w-full overflow-hidden rounded-2xl p-6 bg-gradient-to-br from-zinc-900 via-zinc-800 to-zinc-900 border border-white/10 text-white ${interactive ? "transition-transform duration-300 hover:scale-[1.01] cursor-pointer" : ""}`}
        >
            <div
                className="absolute -top-2 -right-2 w-40 h-40 rounded-full blur-[60px] opacity-30"
                style={{ backgroundColor: beltColor }}
            />
            <div className="absolute -bottom-4 -left-4 w-28 h-28 bg-accent-red/20 rounded-full blur-[50px]" />

            <div className="relative z-10 flex flex-col h-full">
                <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-2 min-w-0">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                            src="/assets/jka_logo.svg"
                            alt="JKA Bangladesh"
                            className="w-10 h-10 flex-shrink-0 drop-shadow-[0_2px_6px_rgba(0,0,0,0.45)]"
                        />
                        <div className="min-w-0">
                            <p className="text-[9px] tracking-[0.3em] uppercase text-zinc-400 font-bold">
                                JKA Bangladesh
                            </p>
                            <p className="text-[9px] tracking-widest uppercase text-zinc-500 mt-0.5">
                                Digital Membership
                            </p>
                        </div>
                    </div>

                    <div
                        className="shrink-0 rounded-full px-3 py-1 border shadow-md"
                        style={{
                            backgroundColor: beltColor,
                            borderColor: beltTextDark
                                ? "rgba(0,0,0,0.15)"
                                : "rgba(255,255,255,0.25)",
                            boxShadow: `0 0 14px ${beltColor}66`,
                        }}
                    >
                        <p
                            className="text-[10px] tracking-widest uppercase font-bold whitespace-nowrap"
                            style={{ color: beltTextDark ? "#111" : "#fff" }}
                        >
                            {belt}
                        </p>
                    </div>
                </div>

                <div className="flex flex-col items-center text-center mt-4 mb-3">
                    <div className="w-20 h-20 rounded-full overflow-hidden border-2 border-white/25 bg-white/5 shadow-xl">
                        {avatarUrl ? (
                            /* eslint-disable-next-line @next/next/no-img-element */
                            <img
                                src={avatarUrl}
                                alt={fullName}
                                className="w-full h-full object-cover"
                            />
                        ) : (
                            <span className="flex w-full h-full items-center justify-center text-2xl font-bold text-white/90 bg-gradient-to-br from-zinc-700 to-zinc-900">
                                {initial}
                            </span>
                        )}
                    </div>
                    <h3 className="text-xl md:text-2xl font-bold leading-tight mt-3 truncate max-w-full">
                        {fullName || "Member"}
                    </h3>
                    <p className="text-xs text-zinc-300 mt-1 truncate max-w-full">
                        {affiliation}
                    </p>
                </div>

                <div className="mt-auto flex items-center justify-between gap-3 pt-4 border-t border-zinc-700/50">
                    {memberNumber ? (
                        <p className="text-[11px] tracking-widest uppercase text-zinc-300 font-mono font-bold truncate">
                            #{memberNumber}
                        </p>
                    ) : (
                        <span className="text-[11px] tracking-widest uppercase text-zinc-500 font-mono">
                            Reg No pending
                        </span>
                    )}
                    <div className="flex items-center gap-1.5 shrink-0">
                        <span className={`w-2 h-2 rounded-full ${dot}`} />
                        <p className="text-[10px] tracking-widest uppercase font-bold">
                            {membershipStatus}
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}

export { statusIcon };
