"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, CalendarPlus, Save, Trophy } from "lucide-react";
import { createEventAction, updateEventAction } from "@/app/actions/events";
import {
    ALL_DIVISIONS,
    divisionsFor,
    type TournamentEventType,
} from "@/lib/tournaments/divisions";

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

const AGE_BAND_LABEL: Record<string, string> = {
    U14: "U14 (12 – <14)",
    CADET: "Cadet (14 – <16)",
    JUNIOR: "Junior (16 – <18)",
    CADET_JUNIOR: "Cadet & Junior (14 – <18)",
    U21: "U21 (18 – <21)",
    SENIOR: "Senior (16+ / 18+)",
};

export type BeltRankOption = { id: string; name: string };

export type EventFormInitialValues = {
    id: string;
    title: string;
    description: string | null;
    location: string | null;
    eventDate: string;
    category: string;
    maxCapacity: number | null;
    isPremium: boolean;
    ticketPrice: string | null;
    memberDiscountPercent: number;
    participantType: string;
    minAge: number | null;
    minRankId: string | null;
    isPublished: boolean;
    attachmentUrl: string | null;
    attachmentType: "IMAGE" | "PDF" | null;
    tournament?: TournamentInitialValues | null;
};

export type TournamentInitialValues = {
    eventType: TournamentEventType;
    enabledDivisions: string[];
    registrationDeadline: string | null; // datetime-local string
    weighInDate: string | null;
    rulesUrl: string | null;
};

export default function EventForm({
    eyebrow = "New event",
    submitLabel = "Publish event",
    redirectAfter,
    beltRanks = [],
    initial,
}: {
    eyebrow?: string;
    submitLabel?: string;
    redirectAfter?: string;
    beltRanks?: BeltRankOption[];
    initial?: EventFormInitialValues;
}) {
    const isEdit = !!initial;
    const [isPremium, setIsPremium] = useState(initial?.isPremium ?? false);
    const [isPublished, setIsPublished] = useState(initial?.isPublished ?? true);
    const [category, setCategory] = useState<string>(
        initial?.category ?? "OTHER",
    );
    const [tournamentType, setTournamentType] = useState<TournamentEventType>(
        initial?.tournament?.eventType ?? "KATA",
    );
    const [enabledDivisions, setEnabledDivisions] = useState<Set<string>>(
        () => new Set(initial?.tournament?.enabledDivisions ?? []),
    );
    const [error, setError] = useState<string | null>(null);
    const [isPending, startTransition] = useTransition();
    const router = useRouter();

    const isTournament = category === "TOURNAMENT";

    const divisions = useMemo(
        () => divisionsFor(tournamentType),
        [tournamentType],
    );
    const divisionsByBand = useMemo(() => {
        const groups = new Map<string, typeof ALL_DIVISIONS>();
        for (const d of divisions) {
            const key = d.ageBand;
            const arr = groups.get(key) ?? [];
            arr.push(d);
            groups.set(key, [...arr]);
        }
        return groups;
    }, [divisions]);

    function toggleDivision(code: string) {
        setEnabledDivisions((prev) => {
            const next = new Set(prev);
            if (next.has(code)) next.delete(code);
            else next.add(code);
            return next;
        });
    }

    function selectAllInBand(codes: readonly string[], on: boolean) {
        setEnabledDivisions((prev) => {
            const next = new Set(prev);
            for (const c of codes) {
                if (on) next.add(c);
                else next.delete(c);
            }
            return next;
        });
    }

    function submit(formData: FormData) {
        setError(null);
        if (initial?.id) formData.set("id", initial.id);
        startTransition(async () => {
            const res = isEdit
                ? await updateEventAction(formData)
                : await createEventAction(formData);
            if (!res.ok) {
                setError(res.error);
                return;
            }
            if (!isEdit) {
                const form = document.getElementById(
                    "event-form",
                ) as HTMLFormElement | null;
                form?.reset();
                setIsPremium(false);
            }
            if (redirectAfter) {
                router.push(redirectAfter);
                router.refresh();
            }
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
                    defaultValue={initial?.title ?? ""}
                    placeholder="e.g. Summer kata seminar"
                    className="w-full bg-zinc-50 border border-zinc-200 text-zinc-900 px-3 py-2 focus:outline-none focus:border-accent-red text-sm transition-colors rounded-sm"
                />
            </Field>

            <div className="grid grid-cols-2 gap-3 mt-3">
                <Field label="Category">
                    <select
                        name="category"
                        value={category}
                        onChange={(e) => setCategory(e.target.value)}
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
                        defaultValue={initial?.eventDate ?? ""}
                        className="w-full bg-zinc-50 border border-zinc-200 text-zinc-900 px-3 py-2 focus:outline-none focus:border-accent-red text-sm transition-colors rounded-sm"
                    />
                </Field>
            </div>

            <div className="mt-3">
                <Field label="Location">
                    <input
                        name="location"
                        type="text"
                        defaultValue={initial?.location ?? ""}
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
                        defaultValue={initial?.description ?? ""}
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
                        defaultValue={initial?.maxCapacity ?? ""}
                        className="w-full bg-zinc-50 border border-zinc-200 text-zinc-900 px-3 py-2 focus:outline-none focus:border-accent-red text-sm transition-colors rounded-sm"
                    />
                </Field>
            </div>

            {isEdit && (
                <div className="mt-3">
                    <label className="flex items-center gap-2.5 cursor-pointer select-none">
                        <input
                            type="checkbox"
                            checked={isPublished}
                            onChange={(e) => setIsPublished(e.target.checked)}
                            className="h-4 w-4 accent-red-600"
                        />
                        <span className="text-sm text-zinc-700 font-semibold">
                            Published (visible on landing page)
                        </span>
                    </label>
                    <input
                        type="hidden"
                        name="isPublished"
                        value={isPublished ? "true" : "false"}
                    />
                </div>
            )}

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
                    <div className="mt-3 space-y-3">
                        <Field label="Ticket price (BDT)">
                            <input
                                name="ticketPrice"
                                type="number"
                                min={1}
                                step="0.01"
                                required
                                defaultValue={initial?.ticketPrice ?? ""}
                                placeholder="e.g. 500"
                                className="w-full bg-zinc-50 border border-zinc-200 text-zinc-900 px-3 py-2 focus:outline-none focus:border-accent-red text-sm transition-colors rounded-sm"
                            />
                        </Field>
                        <Field label="JKA member discount (%)">
                            <input
                                name="memberDiscountPercent"
                                type="number"
                                min={0}
                                max={100}
                                step="1"
                                defaultValue={initial?.memberDiscountPercent ?? 0}
                                placeholder="0"
                                className="w-full bg-zinc-50 border border-zinc-200 text-zinc-900 px-3 py-2 focus:outline-none focus:border-accent-red text-sm transition-colors rounded-sm"
                            />
                            <p className="text-[11px] text-zinc-500 mt-1.5">
                                Signed-in members with an active membership pay this % less on the ticket. Leave 0 for no discount.
                            </p>
                        </Field>
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
                        defaultValue={initial?.participantType ?? "PUBLIC"}
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
                            defaultValue={initial?.minAge ?? ""}
                            placeholder="Any age"
                            className="w-full bg-zinc-50 border border-zinc-200 text-zinc-900 px-3 py-2 focus:outline-none focus:border-accent-red text-sm transition-colors rounded-sm"
                        />
                    </Field>
                    <Field label="Minimum belt rank">
                        <select
                            name="minRankId"
                            defaultValue={initial?.minRankId ?? ""}
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

            {isTournament && (
                <div className="mt-5 border-t border-zinc-200 pt-4">
                    <p className="text-[10px] tracking-widest uppercase font-bold text-zinc-400 mb-3 inline-flex items-center gap-1.5">
                        <Trophy size={11} />
                        Tournament setup
                    </p>

                    <Field label="Competition type">
                        <div className="grid grid-cols-2 gap-2">
                            {(["KATA", "KUMITE"] as const).map((t) => (
                                <label
                                    key={t}
                                    className={`flex items-center gap-2 px-3 py-2 border cursor-pointer select-none rounded-sm text-sm ${
                                        tournamentType === t
                                            ? "border-accent-red bg-accent-red/5 text-accent-red font-semibold"
                                            : "border-zinc-200 bg-zinc-50 text-zinc-700"
                                    }`}
                                >
                                    <input
                                        type="radio"
                                        name="tournamentType"
                                        value={t}
                                        checked={tournamentType === t}
                                        onChange={() => setTournamentType(t)}
                                        className="h-4 w-4 accent-red-600"
                                    />
                                    {t === "KATA" ? "Kata (form)" : "Kumite (sparring)"}
                                </label>
                            ))}
                        </div>
                    </Field>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-3">
                        <Field label="Registration deadline (optional)">
                            <input
                                name="registrationDeadline"
                                type="datetime-local"
                                defaultValue={initial?.tournament?.registrationDeadline ?? ""}
                                className="w-full bg-zinc-50 border border-zinc-200 text-zinc-900 px-3 py-2 focus:outline-none focus:border-accent-red text-sm transition-colors rounded-sm"
                            />
                        </Field>
                        {tournamentType === "KUMITE" && (
                            <Field label="Weigh-in date (optional)">
                                <input
                                    name="weighInDate"
                                    type="datetime-local"
                                    defaultValue={initial?.tournament?.weighInDate ?? ""}
                                    className="w-full bg-zinc-50 border border-zinc-200 text-zinc-900 px-3 py-2 focus:outline-none focus:border-accent-red text-sm transition-colors rounded-sm"
                                />
                            </Field>
                        )}
                    </div>

                    <div className="mt-3">
                        <Field label="Rules / info URL (optional)">
                            <input
                                name="rulesUrl"
                                type="url"
                                defaultValue={initial?.tournament?.rulesUrl ?? ""}
                                placeholder="https://…"
                                className="w-full bg-zinc-50 border border-zinc-200 text-zinc-900 px-3 py-2 focus:outline-none focus:border-accent-red text-sm transition-colors rounded-sm"
                            />
                        </Field>
                    </div>

                    <div className="mt-4">
                        <div className="flex items-center justify-between mb-2">
                            <span className="text-[10px] tracking-widest uppercase font-bold text-zinc-500">
                                Divisions ({enabledDivisions.size} selected)
                            </span>
                            <div className="flex items-center gap-2">
                                <button
                                    type="button"
                                    onClick={() =>
                                        setEnabledDivisions(
                                            new Set(divisions.map((d) => d.code)),
                                        )
                                    }
                                    className="text-[10px] tracking-widest uppercase font-bold text-accent-red hover:underline"
                                >
                                    Enable all
                                </button>
                                <span className="text-zinc-300">·</span>
                                <button
                                    type="button"
                                    onClick={() => setEnabledDivisions(new Set())}
                                    className="text-[10px] tracking-widest uppercase font-bold text-zinc-500 hover:underline"
                                >
                                    Clear
                                </button>
                            </div>
                        </div>
                        <div className="space-y-3">
                            {Array.from(divisionsByBand.entries()).map(
                                ([band, list]) => {
                                    const codes = list.map((d) => d.code);
                                    const allOn = codes.every((c) =>
                                        enabledDivisions.has(c),
                                    );
                                    return (
                                        <div
                                            key={band}
                                            className="border border-zinc-200 rounded-sm bg-zinc-50/50"
                                        >
                                            <div className="flex items-center justify-between px-3 py-2 border-b border-zinc-200 bg-white">
                                                <p className="text-[10px] tracking-widest uppercase font-bold text-zinc-600">
                                                    {AGE_BAND_LABEL[band] ?? band}
                                                </p>
                                                <button
                                                    type="button"
                                                    onClick={() =>
                                                        selectAllInBand(codes, !allOn)
                                                    }
                                                    className="text-[10px] tracking-widest uppercase font-bold text-accent-red hover:underline"
                                                >
                                                    {allOn ? "Deselect" : "Select all"}
                                                </button>
                                            </div>
                                            <ul className="p-2 grid grid-cols-1 sm:grid-cols-2 gap-1">
                                                {list.map((d) => {
                                                    const checked =
                                                        enabledDivisions.has(d.code);
                                                    return (
                                                        <li key={d.code}>
                                                            <label className="flex items-start gap-2 px-2 py-1.5 hover:bg-white rounded-sm cursor-pointer">
                                                                <input
                                                                    type="checkbox"
                                                                    checked={checked}
                                                                    onChange={() =>
                                                                        toggleDivision(
                                                                            d.code,
                                                                        )
                                                                    }
                                                                    className="h-4 w-4 accent-red-600 mt-0.5 shrink-0"
                                                                />
                                                                <span className="text-xs text-zinc-700 leading-tight">
                                                                    {d.label}
                                                                </span>
                                                            </label>
                                                        </li>
                                                    );
                                                })}
                                            </ul>
                                        </div>
                                    );
                                },
                            )}
                        </div>
                        <input
                            type="hidden"
                            name="enabledDivisions"
                            value={Array.from(enabledDivisions).join(",")}
                        />
                        {enabledDivisions.size === 0 && (
                            <p className="text-[11px] text-amber-700 bg-amber-50 border border-amber-200 rounded-sm px-3 py-2 mt-3">
                                Pick at least one division so entrants have
                                something to register for.
                            </p>
                        )}
                    </div>
                </div>
            )}

            <div className="mt-3">
                <Field
                    label={
                        isEdit && initial?.attachmentUrl
                            ? "Replace attachment (optional · PDF or image)"
                            : "Attachment (optional · PDF or image)"
                    }
                >
                    <input
                        name="attachment"
                        type="file"
                        accept="application/pdf,image/jpeg,image/png,image/webp,image/heic,image/avif"
                        className="w-full text-xs text-zinc-600 file:mr-3 file:py-2 file:px-3 file:rounded-sm file:border file:border-zinc-200 file:bg-zinc-50 file:text-zinc-700 file:text-[10px] file:font-bold file:uppercase file:tracking-widest hover:file:bg-zinc-100 cursor-pointer"
                    />
                    {isEdit && initial?.attachmentUrl && (
                        <p className="text-[11px] text-zinc-500 mt-1.5">
                            Current attachment:{" "}
                            <a
                                href={initial.attachmentUrl}
                                target="_blank"
                                rel="noreferrer"
                                className="underline text-accent-red"
                            >
                                view
                            </a>
                            . Leave empty to keep it.
                        </p>
                    )}
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
                ) : isEdit ? (
                    <Save size={14} />
                ) : (
                    <CalendarPlus size={14} />
                )}
                {isEdit ? "Save changes" : submitLabel}
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
