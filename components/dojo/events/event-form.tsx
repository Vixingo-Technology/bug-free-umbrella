"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, CalendarPlus } from "lucide-react";
import { createEventAction } from "@/app/actions/events";

const CATEGORIES = [
    { value: "BELT_TEST", label: "Belt Test" },
    { value: "TOURNAMENT", label: "Tournament" },
    { value: "SEMINAR", label: "Seminar" },
    { value: "TRAINING_CAMP", label: "Training Camp" },
    { value: "OTHER", label: "Other" },
] as const;

const PARTICIPANT_TYPES = [
    { value: "PUBLIC", label: "Public — anyone can register" },
    { value: "STUDENTS", label: "Students only" },
    { value: "INSTRUCTORS", label: "Teachers only" },
    { value: "PARENTS", label: "Parents only" },
    { value: "DOJO_MEMBERS", label: "Dojo members only" },
] as const;

export type BeltRankOption = { id: string; name: string };

export default function EventForm({
    eyebrow = "New event",
    submitLabel = "Publish event",
    redirectAfter,
    beltRanks = [],
}: {
    eyebrow?: string;
    submitLabel?: string;
    redirectAfter?: string;
    beltRanks?: BeltRankOption[];
}) {
    const [isPremium, setIsPremium] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [isPending, startTransition] = useTransition();
    const router = useRouter();

    function submit(formData: FormData) {
        setError(null);
        startTransition(async () => {
            const res = await createEventAction(formData);
            if (!res.ok) {
                setError(res.error);
                return;
            }
            const form = document.getElementById(
                "event-form",
            ) as HTMLFormElement | null;
            form?.reset();
            setIsPremium(false);
            if (redirectAfter) router.push(redirectAfter);
        });
    }

    return (
        <form
            id="event-form"
            action={submit}
            className="bg-white border border-zinc-200 rounded-sm shadow-sm p-5"
        >
            <h3 className="text-xs tracking-widest uppercase font-bold text-zinc-500 mb-4">
                {eyebrow}
            </h3>

            <Field label="Title">
                <input
                    name="title"
                    required
                    type="text"
                    placeholder="e.g. Summer kata seminar"
                    className="w-full bg-zinc-50 border border-zinc-200 text-zinc-900 px-3 py-2 focus:outline-none focus:border-accent-red text-sm transition-colors rounded-sm"
                />
            </Field>

            <div className="grid grid-cols-2 gap-3 mt-3">
                <Field label="Category">
                    <select
                        name="category"
                        defaultValue="OTHER"
                        className="w-full bg-zinc-50 border border-zinc-200 text-zinc-900 px-3 py-2 focus:outline-none focus:border-accent-red text-sm transition-colors rounded-sm"
                    >
                        {CATEGORIES.map((c) => (
                            <option key={c.value} value={c.value}>
                                {c.label}
                            </option>
                        ))}
                    </select>
                </Field>
                <Field label="Date & time">
                    <input
                        name="eventDate"
                        required
                        type="datetime-local"
                        className="w-full bg-zinc-50 border border-zinc-200 text-zinc-900 px-3 py-2 focus:outline-none focus:border-accent-red text-sm transition-colors rounded-sm"
                    />
                </Field>
            </div>

            <div className="mt-3">
                <Field label="Location">
                    <input
                        name="location"
                        type="text"
                        placeholder="e.g. Main floor"
                        className="w-full bg-zinc-50 border border-zinc-200 text-zinc-900 px-3 py-2 focus:outline-none focus:border-accent-red text-sm transition-colors rounded-sm"
                    />
                </Field>
            </div>

            <div className="mt-3">
                <Field label="Description (optional)">
                    <textarea
                        name="description"
                        rows={3}
                        className="w-full bg-zinc-50 border border-zinc-200 text-zinc-900 px-3 py-2 focus:outline-none focus:border-accent-red text-sm transition-colors rounded-sm"
                    />
                </Field>
            </div>

            <div className="mt-3">
                <Field label="Max capacity (optional)">
                    <input
                        name="maxCapacity"
                        type="number"
                        min={0}
                        className="w-full bg-zinc-50 border border-zinc-200 text-zinc-900 px-3 py-2 focus:outline-none focus:border-accent-red text-sm transition-colors rounded-sm"
                    />
                </Field>
            </div>

            {/* ── Ticketing ─────────────────────────────────────────── */}
            <div className="mt-5 border-t border-zinc-200 pt-4">
                <p className="text-[10px] tracking-widest uppercase font-bold text-zinc-400 mb-3">
                    Ticketing
                </p>
                <label className="flex items-center gap-2.5 cursor-pointer select-none">
                    <input
                        type="checkbox"
                        checked={isPremium}
                        onChange={(e) => setIsPremium(e.target.checked)}
                        className="h-4 w-4 accent-red-600"
                    />
                    <span className="text-sm text-zinc-700 font-semibold">
                        Premium event (paid entry)
                    </span>
                </label>
                <input
                    type="hidden"
                    name="isPremium"
                    value={isPremium ? "true" : "false"}
                />
                {isPremium && (
                    <div className="mt-3">
                        <Field label="Ticket price (BDT)">
                            <input
                                name="ticketPrice"
                                type="number"
                                min={1}
                                step="0.01"
                                required
                                placeholder="e.g. 500"
                                className="w-full bg-zinc-50 border border-zinc-200 text-zinc-900 px-3 py-2 focus:outline-none focus:border-accent-red text-sm transition-colors rounded-sm"
                            />
                        </Field>
                        <p className="text-[11px] text-zinc-500 mt-1.5">
                            Participants pay via SSLCommerz before their
                            participation card is issued.
                        </p>
                    </div>
                )}
            </div>

            {/* ── Participation requirements ────────────────────────── */}
            <div className="mt-5 border-t border-zinc-200 pt-4">
                <p className="text-[10px] tracking-widest uppercase font-bold text-zinc-400 mb-3">
                    Participation requirements (optional)
                </p>
                <Field label="Who can register">
                    <select
                        name="participantType"
                        defaultValue="PUBLIC"
                        className="w-full bg-zinc-50 border border-zinc-200 text-zinc-900 px-3 py-2 focus:outline-none focus:border-accent-red text-sm transition-colors rounded-sm"
                    >
                        {PARTICIPANT_TYPES.map((t) => (
                            <option key={t.value} value={t.value}>
                                {t.label}
                            </option>
                        ))}
                    </select>
                </Field>
                <div className="grid grid-cols-2 gap-3 mt-3">
                    <Field label="Minimum age">
                        <input
                            name="minAge"
                            type="number"
                            min={1}
                            max={100}
                            placeholder="Any age"
                            className="w-full bg-zinc-50 border border-zinc-200 text-zinc-900 px-3 py-2 focus:outline-none focus:border-accent-red text-sm transition-colors rounded-sm"
                        />
                    </Field>
                    <Field label="Minimum belt rank">
                        <select
                            name="minRankId"
                            defaultValue=""
                            className="w-full bg-zinc-50 border border-zinc-200 text-zinc-900 px-3 py-2 focus:outline-none focus:border-accent-red text-sm transition-colors rounded-sm"
                        >
                            <option value="">Any rank</option>
                            {beltRanks.map((r) => (
                                <option key={r.id} value={r.id}>
                                    {r.name}
                                </option>
                            ))}
                        </select>
                    </Field>
                </div>
            </div>

            <div className="mt-3">
                <Field label="Attachment (optional · PDF or image)">
                    <input
                        name="attachment"
                        type="file"
                        accept="application/pdf,image/jpeg,image/png,image/webp,image/heic,image/avif"
                        className="w-full text-xs text-zinc-600 file:mr-3 file:py-2 file:px-3 file:rounded-sm file:border file:border-zinc-200 file:bg-zinc-50 file:text-zinc-700 file:text-[10px] file:font-bold file:uppercase file:tracking-widest hover:file:bg-zinc-100 cursor-pointer"
                    />
                </Field>
            </div>

            {error && <p className="text-xs text-red-600 mt-3">{error}</p>}

            <button
                type="submit"
                disabled={isPending}
                className="w-full inline-flex items-center justify-center gap-2 bg-accent-red text-white px-4 py-2.5 text-xs font-bold tracking-widest uppercase hover:bg-accent-red/90 disabled:opacity-40 transition-colors rounded-sm mt-4"
            >
                {isPending ? (
                    <Loader2 size={14} className="animate-spin" />
                ) : (
                    <CalendarPlus size={14} />
                )}
                {submitLabel}
            </button>
        </form>
    );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
    return (
        <label className="block">
            <span className="text-[10px] tracking-widest uppercase font-bold text-zinc-500 block mb-1">
                {label}
            </span>
            {children}
        </label>
    );
}
