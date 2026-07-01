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
    "White Belt": "#FFFFFF",
    "Yellow Belt": "#FFD700",
    "Orange Belt": "#FF8C00",
    "Green Belt": "#228B22",
    "Blue Belt": "#0000CD",
    "Brown Belt": "#8B4513",
    "Black Belt": "#1a1a1a",
};

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
    email,
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
    const dot = statusDot[membershipStatus];
    const initial = (fullName || "M").charAt(0).toUpperCase();

    return (
        <div
            className={`relative h-[260px] w-full overflow-hidden rounded-2xl p-6 bg-gradient-to-br from-zinc-900 via-zinc-800 to-zinc-900 border border-white/10 text-white ${interactive ? "transition-transform duration-300 hover:scale-[1.01] cursor-pointer" : ""}`}
        >
            <div
                className="absolute -top-2 -right-2 w-40 h-40 rounded-full blur-[60px] opacity-30"
                style={{ backgroundColor: beltColor }}
            />
            <div className="absolute -bottom-4 -left-4 w-28 h-28 bg-accent-red/20 rounded-full blur-[50px]" />

            <div className="relative z-10 flex flex-col h-full">
                <div className="flex items-start justify-between mb-0">
                    <div className="flex items-center gap-2">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                            src="/assets/jka_logo.svg"
                            alt="JKA Bangladesh"
                            className="w-10 h-10 flex-shrink-0 drop-shadow-[0_2px_6px_rgba(0,0,0,0.45)]"
                        />
                        <div>
                            <p className="text-[9px] tracking-[0.3em] uppercase text-zinc-400 font-bold">
                                JKA Bangladesh
                            </p>
                            <p className="text-[9px] tracking-widest uppercase text-zinc-500 mt-0.5">
                                Digital Membership
                            </p>
                        </div>
                    </div>
                    <div
                        className="w-4 h-4 rounded-full border border-white/30 flex-shrink-0 shadow"
                        style={{
                            backgroundColor: beltColor,
                            boxShadow: `0 0 10px ${beltColor}55`,
                        }}
                        aria-label={`${belt} accent`}
                    />
                </div>

                <div className="flex flex-row-reverse items-center justify-start gap-3">
                    <div className="w-14 h-14 rounded-full overflow-hidden border-2 border-white/20 bg-white/5 flex-shrink-0 shadow-lg">
                        {avatarUrl ? (
                            /* eslint-disable-next-line @next/next/no-img-element */
                            <img
                                src={avatarUrl}
                                alt={fullName}
                                className="w-full h-full object-cover"
                            />
                        ) : (
                            <span className="flex w-full h-full items-center justify-center text-lg font-bold text-white/90 bg-gradient-to-br from-zinc-700 to-zinc-900">
                                {initial}
                            </span>
                        )}
                    </div>
                    <div className="min-w-0 text-right">
                        <h3 className="text-lg font-bold leading-tight truncate">
                            {fullName || "Member"}
                        </h3>
                        {email && (
                            <p className="text-zinc-400 text-xs mt-0.5 truncate">
                                {email}
                            </p>
                        )}
                        {memberNumber && (
                            <p className="text-[10px] tracking-widest uppercase text-zinc-500 mt-1 font-mono">
                                #{memberNumber}
                            </p>
                        )}
                    </div>
                </div>

                <div className="mt-auto grid grid-cols-2 gap-3 pt-5 border-t border-zinc-700/50">
                    <div>
                        <p className="text-[9px] tracking-widest uppercase text-zinc-500">
                            Rank
                        </p>
                        <p className="text-xs font-semibold mt-0.5">{belt}</p>
                    </div>
                    <div>
                        <p className="text-[9px] tracking-widest uppercase text-zinc-500">
                            Dojo
                        </p>
                        <p className="text-xs font-semibold mt-0.5 truncate">
                            {dojoName ?? "—"}
                        </p>
                    </div>
                    <div>
                        <p className="text-[9px] tracking-widest uppercase text-zinc-500">
                            Status
                        </p>
                        <div className="flex items-center gap-1 mt-0.5">
                            <span
                                className={`w-1.5 h-1.5 rounded-full ${dot}`}
                            />
                            <p className="text-xs font-semibold">
                                {membershipStatus}
                            </p>
                        </div>
                    </div>
                    <div>
                        <p className="text-[9px] tracking-widest uppercase text-zinc-500">
                            Role
                        </p>
                        <p className="text-xs font-semibold mt-0.5">
                            {role ?? "Student"}
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}

export { statusIcon };
