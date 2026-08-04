"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { useTransition } from "react";
import { Loader2 } from "lucide-react";

const MONTHS = [
    { value: "", label: "Any month" },
    { value: "1", label: "Jan" },
    { value: "2", label: "Feb" },
    { value: "3", label: "Mar" },
    { value: "4", label: "Apr" },
    { value: "5", label: "May" },
    { value: "6", label: "Jun" },
    { value: "7", label: "Jul" },
    { value: "8", label: "Aug" },
    { value: "9", label: "Sep" },
    { value: "10", label: "Oct" },
    { value: "11", label: "Nov" },
    { value: "12", label: "Dec" },
];

const TYPES = [
    { value: "", label: "All posts" },
    { value: "ANNOUNCEMENT", label: "Announcements" },
    { value: "EVENT", label: "Events" },
];

const CATEGORIES = [
    { value: "", label: "Any category" },
    { value: "SEMINAR", label: "Seminar" },
    { value: "TRAINING_CAMP", label: "Training Camp" },
    { value: "TOURNAMENT", label: "Tournament" },
];

export default function ArchiveFilters({ years }: { years: number[] }) {
    const router = useRouter();
    const pathname = usePathname();
    const params = useSearchParams();
    const [isPending, startTransition] = useTransition();

    const current = {
        year: params.get("year") ?? "",
        month: params.get("month") ?? "",
        type: params.get("type") ?? "",
        category: params.get("category") ?? "",
    };

    function update(name: string, value: string) {
        const next = new URLSearchParams(params.toString());
        if (value) next.set(name, value);
        else next.delete(name);
        next.delete("page"); // reset to first page on filter change
        startTransition(() => {
            router.push(`${pathname}?${next.toString()}`);
        });
    }

    function reset() {
        startTransition(() => router.push(pathname));
    }

    const hasFilters = !!(current.year || current.month || current.type || current.category);

    return (
        <div className="bg-white border border-zinc-200 rounded-sm shadow-sm p-4 mb-8">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <Select
                    label="Type"
                    name="type"
                    value={current.type}
                    options={TYPES}
                    onChange={(v) => update("type", v)}
                />
                <Select
                    label="Category"
                    name="category"
                    value={current.category}
                    options={CATEGORIES}
                    onChange={(v) => update("category", v)}
                />
                <Select
                    label="Year"
                    name="year"
                    value={current.year}
                    options={[
                        { value: "", label: "Any year" },
                        ...years.map((y) => ({
                            value: String(y),
                            label: String(y),
                        })),
                    ]}
                    onChange={(v) => update("year", v)}
                />
                <Select
                    label="Month"
                    name="month"
                    value={current.month}
                    options={MONTHS}
                    onChange={(v) => update("month", v)}
                />
            </div>
            <div className="flex items-center justify-between mt-4">
                <div className="text-[10px] tracking-widest uppercase font-bold text-zinc-400 flex items-center gap-2">
                    {isPending && <Loader2 size={12} className="animate-spin" />}
                    {hasFilters ? "Filtered" : "Showing all"}
                </div>
                {hasFilters && (
                    <button
                        type="button"
                        onClick={reset}
                        className="text-[10px] tracking-widest uppercase font-bold text-accent-red hover:underline"
                    >
                        Clear filters
                    </button>
                )}
            </div>
        </div>
    );
}

function Select({
    label,
    name,
    value,
    options,
    onChange,
}: {
    label: string;
    name: string;
    value: string;
    options: { value: string; label: string }[];
    onChange: (v: string) => void;
}) {
    return (
        <label className="block">
            <span className="text-[10px] tracking-widest uppercase font-bold text-zinc-500 block mb-1">
                {label}
            </span>
            <select
                name={name}
                value={value}
                onChange={(e) => onChange(e.target.value)}
                className="w-full bg-zinc-50 border border-zinc-200 text-zinc-900 px-3 py-2 focus:outline-none focus:border-accent-red text-sm transition-colors rounded-sm"
            >
                {options.map((o) => (
                    <option key={o.value} value={o.value}>
                        {o.label}
                    </option>
                ))}
            </select>
        </label>
    );
}
