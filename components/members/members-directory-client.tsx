"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { motion } from "motion/react";
import { Search, ChevronLeft, ChevronRight, IdCard, X } from "lucide-react";
import DigitalCardModal from "@/components/portal/digital-card-modal";
import type { MembershipStatusLabel } from "@/components/portal/digital-card";

export interface DirectoryMember {
    id: string;
    fullName: string;
    email: string | null;
    avatarUrl: string | null;
    role: string;
    memberNumber: string | null;
    currentRank: string;
    dojoName: string | null;
    joinDate: string | null;
    expiryDate: string | null;
    membershipStatus: MembershipStatusLabel;
}

interface Props {
    initialQuery: string;
    page: number;
    totalPages: number;
    total: number;
    pageSize: number;
    members: DirectoryMember[];
}

const statusStyles: Record<MembershipStatusLabel, string> = {
    Active: "bg-emerald-50 text-emerald-700",
    Expired: "bg-red-50 text-red-700",
    "Expiring Soon": "bg-amber-50 text-amber-700",
    Pending: "bg-zinc-100 text-zinc-600",
};

export default function MembersDirectoryClient({
    initialQuery,
    page,
    totalPages,
    total,
    pageSize,
    members,
}: Props) {
    const router = useRouter();
    const params = useSearchParams();
    const [term, setTerm] = useState(initialQuery);
    const [isPending, startTransition] = useTransition();
    const [openId, setOpenId] = useState<string | null>(null);

    useEffect(() => {
        setTerm(initialQuery);
    }, [initialQuery]);

    const active = useMemo(
        () => members.find((m) => m.id === openId) ?? null,
        [members, openId],
    );

    const commitSearch = (next: string) => {
        const p = new URLSearchParams(params.toString());
        if (next) p.set("q", next);
        else p.delete("q");
        p.delete("page");
        startTransition(() => {
            router.push(`/members?${p.toString()}`);
        });
    };

    const goToPage = (target: number) => {
        const p = new URLSearchParams(params.toString());
        if (target <= 1) p.delete("page");
        else p.set("page", String(target));
        startTransition(() => {
            router.push(`/members?${p.toString()}`);
        });
    };

    const from = total === 0 ? 0 : (page - 1) * pageSize + 1;
    const to = Math.min(total, page * pageSize);

    return (
        <section className="py-14">
            <div className="max-w-6xl mx-auto px-6 lg:px-12">
                <form
                    onSubmit={(e) => {
                        e.preventDefault();
                        commitSearch(term.trim());
                    }}
                    className="relative mb-8"
                >
                    <div className="flex items-center gap-2 rounded-sm border border-zinc-300 bg-white shadow-sm focus-within:border-accent-red transition-colors">
                        <Search size={16} className="ml-4 text-zinc-500 shrink-0" />
                        <input
                            type="text"
                            value={term}
                            onChange={(e) => setTerm(e.target.value)}
                            placeholder="Search by name or Reg No (e.g. JKA-BD-2607101)"
                            className="flex-1 py-3 pr-2 outline-none bg-transparent text-sm placeholder:text-zinc-400"
                        />
                        {term && (
                            <button
                                type="button"
                                onClick={() => {
                                    setTerm("");
                                    commitSearch("");
                                }}
                                className="text-zinc-400 hover:text-accent-red p-2"
                                aria-label="Clear search"
                            >
                                <X size={14} />
                            </button>
                        )}
                        <button
                            type="submit"
                            className="bg-zinc-900 hover:bg-accent-red text-white text-[11px] tracking-widest uppercase font-bold px-5 py-3 transition-colors"
                        >
                            Search
                        </button>
                    </div>
                </form>

                <div className="flex items-center justify-between mb-6 text-xs uppercase tracking-widest text-zinc-500">
                    <span>
                        {total} member{total === 1 ? "" : "s"}
                        {initialQuery ? ` · matching "${initialQuery}"` : ""}
                    </span>
                    <span>
                        {from}-{to} of {total}
                    </span>
                </div>

                {members.length === 0 ? (
                    <div className="border border-dashed border-zinc-300 rounded-sm py-16 text-center">
                        <p className="text-sm text-zinc-500">
                            No members matched your search.
                        </p>
                    </div>
                ) : (
                    <div
                        className={`grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 transition-opacity ${isPending ? "opacity-50" : ""}`}
                    >
                        {members.map((m, i) => (
                            <motion.article
                                key={m.id}
                                initial={{ opacity: 0, y: 12 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ duration: 0.35, delay: i * 0.03 }}
                                className="group relative bg-white border border-zinc-200 rounded-sm p-5 shadow-sm hover:shadow-lg hover:-translate-y-1 hover:border-accent-red transition-all duration-300"
                                style={{ transformStyle: "preserve-3d" }}
                            >
                                <div className="flex items-center gap-4">
                                    <div className="w-14 h-14 rounded-full overflow-hidden bg-gradient-to-br from-zinc-800 to-zinc-950 border border-zinc-200 flex items-center justify-center text-white font-bold shrink-0">
                                        {m.avatarUrl ? (
                                            /* eslint-disable-next-line @next/next/no-img-element */
                                            <img
                                                src={m.avatarUrl}
                                                alt={m.fullName}
                                                className="w-full h-full object-cover"
                                            />
                                        ) : (
                                            <span>{m.fullName.charAt(0).toUpperCase()}</span>
                                        )}
                                    </div>
                                    <div className="min-w-0 flex-1">
                                        <h3 className="font-bold text-zinc-900 truncate group-hover:text-accent-red transition-colors">
                                            {m.fullName}
                                        </h3>
                                        <p className="text-[10px] tracking-widest uppercase text-zinc-500 mt-0.5 font-mono truncate">
                                            {m.memberNumber ?? "Reg No pending"}
                                        </p>
                                    </div>
                                </div>

                                <dl className="mt-5 space-y-1.5 text-[11px]">
                                    <Row label="Rank" value={m.currentRank} />
                                    <Row label="Dojo" value={m.dojoName ?? "—"} />
                                    <Row label="Role" value={m.role} />
                                </dl>

                                <div className="mt-4 flex items-center justify-between">
                                    <span
                                        className={`inline-flex items-center gap-1 text-[10px] font-bold tracking-widest uppercase px-2 py-1 rounded-sm ${statusStyles[m.membershipStatus]}`}
                                    >
                                        {m.membershipStatus}
                                    </span>
                                    <button
                                        type="button"
                                        onClick={() => setOpenId(m.id)}
                                        className="inline-flex items-center gap-1.5 text-[10px] font-bold tracking-widest uppercase px-3 py-1.5 rounded-sm bg-zinc-900 hover:bg-accent-red text-white transition-colors"
                                    >
                                        <IdCard size={12} />
                                        View Card
                                    </button>
                                </div>

                                <span className="pointer-events-none absolute inset-x-0 -bottom-px h-px bg-accent-red scale-x-0 group-hover:scale-x-100 origin-left transition-transform duration-500" />
                            </motion.article>
                        ))}
                    </div>
                )}

                {totalPages > 1 && (
                    <nav className="flex items-center justify-center gap-2 mt-10">
                        <button
                            type="button"
                            onClick={() => goToPage(page - 1)}
                            disabled={page <= 1 || isPending}
                            className="inline-flex items-center gap-1 px-3 py-2 border border-zinc-300 rounded-sm text-xs uppercase tracking-widest font-bold disabled:opacity-40 disabled:cursor-not-allowed hover:border-accent-red hover:text-accent-red transition-colors"
                        >
                            <ChevronLeft size={14} />
                            Prev
                        </button>

                        {pageButtons(page, totalPages).map((n, i) =>
                            typeof n === "number" ? (
                                <button
                                    key={`${i}-${n}`}
                                    type="button"
                                    onClick={() => goToPage(n)}
                                    disabled={isPending}
                                    className={`min-w-[36px] px-2 py-2 text-xs font-bold rounded-sm border transition-colors ${
                                        n === page
                                            ? "bg-zinc-900 text-white border-zinc-900"
                                            : "border-zinc-300 text-zinc-700 hover:border-accent-red hover:text-accent-red"
                                    }`}
                                >
                                    {n}
                                </button>
                            ) : (
                                <span
                                    key={`ellipsis-${i}`}
                                    className="px-2 text-zinc-400 text-xs"
                                >
                                    …
                                </span>
                            ),
                        )}

                        <button
                            type="button"
                            onClick={() => goToPage(page + 1)}
                            disabled={page >= totalPages || isPending}
                            className="inline-flex items-center gap-1 px-3 py-2 border border-zinc-300 rounded-sm text-xs uppercase tracking-widest font-bold disabled:opacity-40 disabled:cursor-not-allowed hover:border-accent-red hover:text-accent-red transition-colors"
                        >
                            Next
                            <ChevronRight size={14} />
                        </button>
                    </nav>
                )}
            </div>

            <DigitalCardModal
                open={!!active}
                onClose={() => setOpenId(null)}
                card={
                    active
                        ? {
                              id: active.id,
                              fullName: active.fullName,
                              currentRank: active.currentRank,
                              dojoName: active.dojoName,
                              role: active.role,
                              membershipStatus: active.membershipStatus,
                              memberNumber: active.memberNumber,
                              avatarUrl: active.avatarUrl,
                              joinedLabel: fmtDate(active.joinDate),
                              expiresLabel: fmtDate(active.expiryDate),
                          }
                        : null
                }
            />
        </section>
    );
}

function Row({ label, value }: { label: string; value: string }) {
    return (
        <div className="flex items-center justify-between gap-3">
            <dt className="text-zinc-500 uppercase tracking-widest text-[10px]">
                {label}
            </dt>
            <dd className="text-zinc-900 font-semibold truncate max-w-[60%] text-right">
                {value}
            </dd>
        </div>
    );
}

function fmtDate(iso: string | null): string | null {
    if (!iso) return null;
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return null;
    return d.toLocaleDateString("en-GB", {
        month: "short",
        year: "numeric",
    });
}

function pageButtons(current: number, total: number): Array<number | "…"> {
    if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
    const set = new Set<number>([1, total, current, current - 1, current + 1]);
    const nums = [...set].filter((n) => n >= 1 && n <= total).sort((a, b) => a - b);
    const out: Array<number | "…"> = [];
    for (let i = 0; i < nums.length; i++) {
        out.push(nums[i]);
        if (i < nums.length - 1 && nums[i + 1] - nums[i] > 1) out.push("…");
    }
    return out;
}
