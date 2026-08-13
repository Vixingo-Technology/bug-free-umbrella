"use client";

import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import {
    AlertCircle,
    Award,
    CheckSquare,
    CreditCard,
    Loader2,
    Search,
    Sparkles,
    Square,
} from "lucide-react";
import { createCertificateOrderAction } from "@/app/portal/dojo/certificates/actions";

type Item = {
    id: string;
    createdAt: string;
    member: {
        id: string;
        fullName: string;
        memberNumber: string | null;
        fatherName: string | null;
        motherName: string | null;
    };
    toRank: {
        name: string;
        kyuDan: string | null;
        colorHex: string | null;
        certificatePrice: string | number | null;
    } | null;
    gradingEvent: {
        name: string;
        eventDate: string;
    } | null;
};

type Props = {
    items: Item[];
    disabled: boolean;
    skipPayment?: boolean;
};

export default function RequestCertificatesPanel({
    items,
    disabled,
    skipPayment = false,
}: Props) {
    const [selected, setSelected] = useState<Set<string>>(new Set());
    const [query, setQuery] = useState("");
    const [error, setError] = useState<string | null>(null);
    const [pending, startTransition] = useTransition();

    const filtered = useMemo(() => {
        const q = query.trim().toLowerCase();
        if (!q) return items;
        return items.filter((i) => {
            const haystack = [
                i.member.fullName,
                i.member.memberNumber ?? "",
                i.toRank?.name ?? "",
                i.toRank?.kyuDan ?? "",
            ]
                .join(" ")
                .toLowerCase();
            return haystack.includes(q);
        });
    }, [items, query]);

    const total = useMemo(() => {
        return items
            .filter((i) => selected.has(i.id))
            .reduce((sum, i) => sum + Number(i.toRank?.certificatePrice ?? 0), 0);
    }, [items, selected]);

    function toggle(id: string) {
        const next = new Set(selected);
        if (next.has(id)) next.delete(id);
        else next.add(id);
        setSelected(next);
    }

    function toggleAll() {
        if (selected.size === filtered.length) {
            setSelected(new Set());
        } else {
            setSelected(new Set(filtered.map((i) => i.id)));
        }
    }

    function submit() {
        setError(null);
        if (selected.size === 0) {
            setError("Select at least one student.");
            return;
        }
        startTransition(async () => {
            const res = await createCertificateOrderAction({
                gradingIds: Array.from(selected),
            });
            if (res && "error" in res) {
                setError(res.error);
            }
            // Success redirects to checkout — nothing else to do here.
        });
    }

    const allChecked =
        filtered.length > 0 && selected.size === filtered.length;

    return (
        <section className="bg-white border border-zinc-200 rounded-sm shadow-sm">
            <header className="px-5 py-4 border-b border-zinc-200 flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                    <Award size={14} className="text-accent-red" />
                    <h3 className="text-xs tracking-widest uppercase font-bold text-zinc-500">
                        Eligible students
                    </h3>
                </div>
                <p className="text-[11px] text-zinc-500">
                    {items.length} passed grading
                    {items.length === 1 ? "" : "s"} awaiting certificate
                </p>
            </header>

            {items.length === 0 ? (
                <div className="p-10 text-center text-sm text-zinc-500">
                    No eligible students. Once gradings are published, they
                    appear here for certificate ordering.
                </div>
            ) : (
                <>
                    <div className="px-4 sm:px-5 py-3 border-b border-zinc-200 flex items-center gap-3">
                        <Search size={14} className="text-zinc-400 shrink-0" />
                        <input
                            type="text"
                            value={query}
                            onChange={(e) => setQuery(e.target.value)}
                            placeholder="Search by name, rank, member #…"
                            className="flex-1 min-w-0 bg-transparent text-sm focus:outline-none placeholder:text-zinc-400"
                        />
                        <button
                            type="button"
                            onClick={toggleAll}
                            className="inline-flex items-center gap-1 text-[10px] tracking-widest uppercase font-bold text-zinc-500 hover:text-accent-red whitespace-nowrap shrink-0"
                        >
                            {allChecked ? (
                                <CheckSquare size={12} />
                            ) : (
                                <Square size={12} />
                            )}
                            <span className="hidden xs:inline sm:inline">
                                {allChecked ? "Clear all" : "Select all"}
                            </span>
                        </button>
                    </div>

                    <ul className="sm:hidden divide-y divide-zinc-100">
                        {filtered.map((i) => {
                            const checked = selected.has(i.id);
                            const price = Number(
                                i.toRank?.certificatePrice ?? 0,
                            );
                            const missingParents =
                                !i.member.fatherName?.trim() ||
                                !i.member.motherName?.trim();
                            return (
                                <li
                                    key={i.id}
                                    onClick={() =>
                                        !missingParents && toggle(i.id)
                                    }
                                    className={`px-4 py-4 flex items-start gap-3 ${
                                        missingParents
                                            ? "opacity-60"
                                            : "active:bg-zinc-50 cursor-pointer"
                                    }`}
                                >
                                    <input
                                        type="checkbox"
                                        checked={checked}
                                        disabled={missingParents}
                                        onChange={() => toggle(i.id)}
                                        onClick={(e) => e.stopPropagation()}
                                        className="mt-1 accent-accent-red shrink-0"
                                    />
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-start justify-between gap-3">
                                            <div className="min-w-0">
                                                <p className="font-semibold text-zinc-900 truncate">
                                                    {i.member.fullName}
                                                </p>
                                                <p className="text-[11px] text-zinc-400 uppercase tracking-widest truncate">
                                                    {i.member.memberNumber ??
                                                        "—"}
                                                </p>
                                            </div>
                                            <span className="font-mono text-sm text-zinc-700 shrink-0">
                                                {price > 0
                                                    ? `৳${price.toLocaleString()}`
                                                    : "—"}
                                            </span>
                                        </div>
                                        <div className="mt-2 flex items-center gap-2">
                                            <span
                                                className="inline-block w-2.5 h-2.5 rounded-full border border-zinc-300 shrink-0"
                                                style={{
                                                    backgroundColor:
                                                        i.toRank?.colorHex ??
                                                        "#fff",
                                                }}
                                            />
                                            <span className="text-xs text-zinc-700 truncate">
                                                {i.toRank?.name ?? "—"}
                                            </span>
                                        </div>
                                        {i.gradingEvent?.name && (
                                            <p className="mt-1 text-[11px] text-zinc-500 truncate">
                                                {i.gradingEvent.name}
                                            </p>
                                        )}
                                        {missingParents && (
                                            <p className="mt-2 text-[11px] text-amber-600 inline-flex items-center gap-1">
                                                <AlertCircle size={10} />
                                                Parents&apos; names missing
                                            </p>
                                        )}
                                    </div>
                                </li>
                            );
                        })}
                    </ul>

                    <div className="hidden sm:block overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="text-left text-[10px] tracking-widest uppercase font-bold text-zinc-400 border-b border-zinc-200">
                                    <th className="px-5 py-3 w-10"></th>
                                    <th className="px-5 py-3">Student</th>
                                    <th className="px-5 py-3">Rank earned</th>
                                    <th className="px-5 py-3">Event</th>
                                    <th className="px-5 py-3 text-right">
                                        Price
                                    </th>
                                </tr>
                            </thead>
                            <tbody>
                                {filtered.map((i) => {
                                    const checked = selected.has(i.id);
                                    const price = Number(
                                        i.toRank?.certificatePrice ?? 0,
                                    );
                                    const missingParents =
                                        !i.member.fatherName?.trim() ||
                                        !i.member.motherName?.trim();
                                    return (
                                        <tr
                                            key={i.id}
                                            onClick={() => !missingParents && toggle(i.id)}
                                            className={`border-b border-zinc-100 ${
                                                missingParents
                                                    ? "opacity-60"
                                                    : "hover:bg-zinc-50 cursor-pointer"
                                            } transition-colors`}
                                        >
                                            <td className="px-5 py-3">
                                                <input
                                                    type="checkbox"
                                                    checked={checked}
                                                    disabled={missingParents}
                                                    onChange={() => toggle(i.id)}
                                                    onClick={(e) => e.stopPropagation()}
                                                    className="accent-accent-red"
                                                />
                                            </td>
                                            <td className="px-5 py-3">
                                                <p className="font-semibold text-zinc-900">
                                                    {i.member.fullName}
                                                </p>
                                                <p className="text-[11px] text-zinc-400 uppercase tracking-widest">
                                                    {i.member.memberNumber ?? "—"}
                                                </p>
                                                {missingParents && (
                                                    <p className="text-[11px] text-amber-600 mt-1 inline-flex items-center gap-1">
                                                        <AlertCircle size={10} />
                                                        Parents&apos; names missing
                                                    </p>
                                                )}
                                            </td>
                                            <td className="px-5 py-3">
                                                <div className="flex items-center gap-2">
                                                    <span
                                                        className="inline-block w-2.5 h-2.5 rounded-full border border-zinc-300"
                                                        style={{
                                                            backgroundColor:
                                                                i.toRank?.colorHex ??
                                                                "#fff",
                                                        }}
                                                    />
                                                    <span className="text-zinc-700">
                                                        {i.toRank?.name ?? "—"}
                                                    </span>
                                                </div>
                                            </td>
                                            <td className="px-5 py-3 text-zinc-500 text-xs">
                                                {i.gradingEvent?.name ?? "—"}
                                            </td>
                                            <td className="px-5 py-3 text-right font-mono text-zinc-700">
                                                {price > 0
                                                    ? `৳${price.toLocaleString()}`
                                                    : "—"}
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>

                    <footer className="px-5 py-4 border-t border-zinc-200 flex flex-col sm:flex-row items-stretch sm:items-center gap-3 justify-between">
                        <div className="flex flex-col">
                            <p className="text-xs text-zinc-500">
                                {selected.size} certificate
                                {selected.size === 1 ? "" : "s"} selected
                            </p>
                            <p className="text-lg font-bold text-zinc-900">
                                Total: <span className="text-accent-red">৳{total.toLocaleString()}</span>
                            </p>
                        </div>
                        <div className="flex flex-col items-stretch sm:items-end gap-2">
                            <button
                                type="button"
                                onClick={submit}
                                disabled={disabled || pending || selected.size === 0}
                                className="inline-flex items-center justify-center gap-2 bg-zinc-900 hover:bg-accent-red text-white px-5 py-2.5 text-xs font-bold tracking-widest uppercase rounded-sm disabled:opacity-40"
                            >
                                {pending ? (
                                    <>
                                        <Loader2 size={14} className="animate-spin" />
                                        {skipPayment
                                            ? "Generating…"
                                            : "Preparing checkout…"}
                                    </>
                                ) : skipPayment ? (
                                    <>
                                        <Sparkles size={14} />
                                        Generate certificates
                                    </>
                                ) : (
                                    <>
                                        <CreditCard size={14} />
                                        Pay &amp; request certificates
                                    </>
                                )}
                            </button>
                            {skipPayment && !pending && (
                                <p className="text-[11px] text-zinc-500 text-right max-w-xs">
                                    Payment is temporarily disabled — certificates
                                    will generate immediately.
                                </p>
                            )}
                            {error && (
                                <p className="text-xs text-red-600 inline-flex items-center gap-1">
                                    <AlertCircle size={12} /> {error}
                                </p>
                            )}
                            {disabled && (
                                <p className="text-[11px] text-zinc-500 max-w-sm text-right">
                                    Upload your signature in{" "}
                                    <Link
                                        href="/portal/dojo/settings#signature"
                                        className="underline font-semibold"
                                    >
                                        Settings
                                    </Link>{" "}
                                    to enable orders.
                                </p>
                            )}
                        </div>
                    </footer>
                </>
            )}
        </section>
    );
}
