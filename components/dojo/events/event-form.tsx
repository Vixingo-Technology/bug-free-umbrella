"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, CalendarPlus, Save, Plus, X, Layers } from "lucide-react";
import { createEventAction, updateEventAction } from "@/app/actions/events";
import {
    makeCustomDivisionCode,
    type CustomDivision,
    type DivisionGender,
    type TournamentEventType,
} from "@/lib/tournaments/divisions";

const CATEGORIES = [
    { value: "SEMINAR", label: "Seminar" },
    { value: "TRAINING_CAMP", label: "Training Camp" },
    { value: "TOURNAMENT", label: "Tournament" },
] as const;

export type BeltRankOption = { id: string; name: string };

export type EventFormInitialValues = {
    id: string;
    title: string;
    description: string | null;
    location: string | null;
    eventDate: string;
    category: string;
    maxCapacity: number | null;
    memberDiscountPercent: number;
    isPublished: boolean;
    attachmentUrl: string | null;
    attachmentType: "IMAGE" | "PDF" | null;
    divisions: CustomDivision[];
    multiDivisionBundlePriceBdt: string | null;
    registrationDeadline: string | null;
    weighInDate: string | null;
    rulesUrl: string | null;
};

// Local draft type — mirrors CustomDivision but keeps price/age as strings
// while the admin is editing so the input can be left blank.
type DivisionDraft = {
    code: string;
    label: string;
    eventType: TournamentEventType;
    gender: DivisionGender;
    isTeam: boolean;
    minAge: string;
    minRankId: string;
    priceBdt: string;
};

function toDraft(d: CustomDivision): DivisionDraft {
    return {
        code: d.code,
        label: d.label,
        eventType: d.eventType,
        gender: d.gender,
        isTeam: d.isTeam,
        minAge: d.minAge !== null ? String(d.minAge) : "",
        minRankId: d.minRankId ?? "",
        priceBdt: d.priceBdt !== null ? String(d.priceBdt) : "",
    };
}

function draftToDivision(d: DivisionDraft): CustomDivision {
    const minAge = d.minAge.trim() ? Number.parseInt(d.minAge, 10) : NaN;
    const priceBdt = d.priceBdt.trim() ? Number.parseFloat(d.priceBdt) : NaN;
    return {
        code: d.code,
        label: d.label.trim(),
        eventType: d.eventType,
        gender: d.gender,
        isTeam: d.isTeam,
        minAge: Number.isFinite(minAge) ? minAge : null,
        minRankId: d.minRankId || null,
        priceBdt: Number.isFinite(priceBdt) ? priceBdt : null,
    };
}

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
    const [isPublished, setIsPublished] = useState(initial?.isPublished ?? true);
    const [category, setCategory] = useState<string>(
        initial?.category ?? "SEMINAR",
    );
    const [divisions, setDivisions] = useState<DivisionDraft[]>(() =>
        (initial?.divisions ?? []).map(toDraft),
    );
    const [error, setError] = useState<string | null>(null);
    const [isPending, startTransition] = useTransition();
    const router = useRouter();

    const anyKumite = divisions.some((d) => d.eventType === "KUMITE");

    function addDivision(eventType: TournamentEventType) {
        setDivisions((prev) => [
            ...prev,
            {
                code: makeCustomDivisionCode(
                    `Division ${prev.length + 1}`,
                    eventType,
                ),
                label: "",
                eventType,
                gender: "ANY",
                isTeam: false,
                minAge: "",
                minRankId: "",
                priceBdt: "",
            },
        ]);
    }

    function updateDivision(index: number, patch: Partial<DivisionDraft>) {
        setDivisions((prev) =>
            prev.map((d, i) => {
                if (i !== index) return d;
                const next = { ...d, ...patch };
                // Re-derive code from label + type when either changes so
                // reads stay stable across renames until save.
                if (
                    (patch.label !== undefined || patch.eventType !== undefined) &&
                    next.label.trim()
                ) {
                    next.code = makeCustomDivisionCode(
                        next.label,
                        next.eventType,
                    );
                }
                return next;
            }),
        );
    }

    function removeDivision(index: number) {
        setDivisions((prev) => prev.filter((_, i) => i !== index));
    }

    function submit(formData: FormData) {
        setError(null);
        if (initial?.id) formData.set("id", initial.id);
        const payload = divisions
            .filter((d) => d.label.trim())
            .map(draftToDivision);
        formData.set("customDivisions", JSON.stringify(payload));
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
                setDivisions([]);
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
                    className={inputCx}
                />
            </Field>

            <div className="grid grid-cols-2 gap-3 mt-3">
                <Field label="Category">
                    <select
                        name="category"
                        value={category}
                        onChange={(e) => setCategory(e.target.value)}
                        className={inputCx}
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
                        className={inputCx}
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
                        className={inputCx}
                    />
                </Field>
            </div>

            <div className="mt-3">
                <Field label="Description (optional)">
                    <textarea
                        name="description"
                        rows={3}
                        defaultValue={initial?.description ?? ""}
                        className={inputCx}
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
                        className={inputCx}
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

            {/* ── Divisions ─────────────────────────────────────────── */}
            <div className="mt-5 border-t border-zinc-200 pt-4">
                <p className="text-[10px] tracking-widest uppercase font-bold text-zinc-400 mb-3 inline-flex items-center gap-1.5">
                    <Layers size={11} />
                    Divisions
                </p>
                <p className="text-[11px] text-zinc-500 mb-3">
                    Add every division participants can enter. Each division
                    has its own price; the entrant pays the sum of the
                    divisions they select. Leave price empty (or 0) for a
                    free entry.
                </p>

                {divisions.length === 0 && (
                    <p className="text-[11px] text-amber-700 bg-amber-50 border border-amber-200 rounded-sm px-3 py-2 mb-3">
                        Add at least one division so participants have
                        something to register for.
                    </p>
                )}

                <div className="space-y-3">
                    {divisions.map((d, i) => (
                        <DivisionRow
                            key={i}
                            draft={d}
                            beltRanks={beltRanks}
                            onChange={(patch) => updateDivision(i, patch)}
                            onRemove={() => removeDivision(i)}
                        />
                    ))}
                </div>

                <div className="flex flex-wrap gap-2 mt-3">
                    <button
                        type="button"
                        onClick={() => addDivision("KATA")}
                        className="inline-flex items-center gap-1.5 bg-zinc-900 text-white px-3 py-2 text-[10px] font-bold tracking-widest uppercase hover:bg-zinc-800 rounded-sm"
                    >
                        <Plus size={11} /> Add Kata division
                    </button>
                    <button
                        type="button"
                        onClick={() => addDivision("KUMITE")}
                        className="inline-flex items-center gap-1.5 bg-zinc-900 text-white px-3 py-2 text-[10px] font-bold tracking-widest uppercase hover:bg-zinc-800 rounded-sm"
                    >
                        <Plus size={11} /> Add Kumite division
                    </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-4">
                    <Field label="Registration deadline (optional)">
                        <input
                            name="registrationDeadline"
                            type="datetime-local"
                            defaultValue={initial?.registrationDeadline ?? ""}
                            className={inputCx}
                        />
                    </Field>
                    {anyKumite && (
                        <Field label="Weigh-in date (optional)">
                            <input
                                name="weighInDate"
                                type="datetime-local"
                                defaultValue={initial?.weighInDate ?? ""}
                                className={inputCx}
                            />
                        </Field>
                    )}
                </div>

                <div className="mt-3">
                    <Field label="Rules / info URL (optional)">
                        <input
                            name="rulesUrl"
                            type="url"
                            defaultValue={initial?.rulesUrl ?? ""}
                            placeholder="https://…"
                            className={inputCx}
                        />
                    </Field>
                </div>
            </div>

            {/* ── Multi-division bundle price ───────────────────────── */}
            <div className="mt-5 border-t border-zinc-200 pt-4">
                <Field label="Multi-division bundle total (BDT · optional)">
                    <input
                        name="multiDivisionBundlePriceBdt"
                        type="number"
                        min={0}
                        step="0.01"
                        defaultValue={initial?.multiDivisionBundlePriceBdt ?? ""}
                        placeholder="e.g. 800"
                        className={inputCx}
                    />
                    <p className="text-[11px] text-zinc-500 mt-1.5">
                        If a participant picks 2 or more divisions, they pay
                        this bundle total instead of the sum of division
                        prices. Leave blank to always charge the sum.
                    </p>
                </Field>
            </div>

            {/* ── Member discount ─────────────────────────────────── */}
            <div className="mt-5 border-t border-zinc-200 pt-4">
                <Field label="JKA member discount (%)">
                    <input
                        name="memberDiscountPercent"
                        type="number"
                        min={0}
                        max={100}
                        step="1"
                        defaultValue={initial?.memberDiscountPercent ?? 0}
                        placeholder="0"
                        className={inputCx}
                    />
                    <p className="text-[11px] text-zinc-500 mt-1.5">
                        Applied to each division's price when a signed-in JKA
                        member with an active membership registers. Leave 0
                        for no discount.
                    </p>
                </Field>
            </div>

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

const inputCx =
    "w-full bg-zinc-50 border border-zinc-200 text-zinc-900 px-3 py-2 focus:outline-none focus:border-accent-red text-sm transition-colors rounded-sm";

function Field({
    label,
    children,
}: {
    label: string;
    children: React.ReactNode;
}) {
    return (
        <label className="block">
            <span className="text-[10px] tracking-widest uppercase font-bold text-zinc-500 block mb-1">
                {label}
            </span>
            {children}
        </label>
    );
}

function DivisionRow({
    draft,
    beltRanks,
    onChange,
    onRemove,
}: {
    draft: DivisionDraft;
    beltRanks: BeltRankOption[];
    onChange: (patch: Partial<DivisionDraft>) => void;
    onRemove: () => void;
}) {
    return (
        <div className="border border-zinc-200 rounded-sm p-3 bg-zinc-50/50">
            <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] tracking-widest uppercase font-bold text-accent-red">
                    {draft.eventType === "KATA" ? "Kata" : "Kumite"} ·{" "}
                    {draft.gender === "MALE"
                        ? "Male"
                        : draft.gender === "FEMALE"
                          ? "Female"
                          : "Any gender"}{" "}
                    division
                </span>
                <button
                    type="button"
                    onClick={onRemove}
                    aria-label="Remove division"
                    className="text-zinc-400 hover:text-accent-red"
                >
                    <X size={14} />
                </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <Field label="Division name">
                    <input
                        type="text"
                        value={draft.label}
                        onChange={(e) => onChange({ label: e.target.value })}
                        required
                        placeholder="e.g. Individual kata — Junior"
                        className={inputCx}
                    />
                </Field>
                <Field label="Type">
                    <select
                        value={draft.eventType}
                        onChange={(e) =>
                            onChange({
                                eventType: e.target.value as TournamentEventType,
                            })
                        }
                        className={inputCx}
                    >
                        <option value="KATA">Kata (form)</option>
                        <option value="KUMITE">Kumite (sparring)</option>
                    </select>
                </Field>
                <Field label="Gender">
                    <select
                        value={draft.gender}
                        onChange={(e) =>
                            onChange({
                                gender: e.target.value as DivisionGender,
                            })
                        }
                        className={inputCx}
                    >
                        <option value="ANY">Any (open)</option>
                        <option value="MALE">Male only</option>
                        <option value="FEMALE">Female only</option>
                    </select>
                </Field>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mt-3">
                <Field label="Minimum age (optional)">
                    <input
                        type="number"
                        min={1}
                        max={100}
                        value={draft.minAge}
                        onChange={(e) => onChange({ minAge: e.target.value })}
                        placeholder="Any age"
                        className={inputCx}
                    />
                </Field>
                <Field label="Minimum belt rank (optional)">
                    <select
                        value={draft.minRankId}
                        onChange={(e) => onChange({ minRankId: e.target.value })}
                        className={inputCx}
                    >
                        <option value="">Any rank</option>
                        {beltRanks.map((r) => (
                            <option key={r.id} value={r.id}>
                                {r.name}
                            </option>
                        ))}
                    </select>
                </Field>
                <Field label="Price (BDT)">
                    <input
                        type="number"
                        min={0}
                        step="0.01"
                        value={draft.priceBdt}
                        onChange={(e) => onChange({ priceBdt: e.target.value })}
                        placeholder="0 (free)"
                        className={inputCx}
                    />
                </Field>
            </div>

            <label className="inline-flex items-center gap-2 mt-3 cursor-pointer select-none">
                <input
                    type="checkbox"
                    checked={draft.isTeam}
                    onChange={(e) => onChange({ isTeam: e.target.checked })}
                    className="h-4 w-4 accent-red-600"
                />
                <span className="text-xs text-zinc-700">
                    Team division (participants must name teammates)
                </span>
            </label>
        </div>
    );
}
