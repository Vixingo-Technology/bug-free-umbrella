"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
    Loader2,
    CalendarPlus,
    Save,
    Plus,
    X,
    Layers,
    Bookmark,
    Download,
    Trash2,
    Percent,
} from "lucide-react";
import { createEventAction, updateEventAction } from "@/app/actions/events";
import {
    saveDivisionPresetAction,
    deleteDivisionPresetAction,
} from "@/app/actions/division-presets";
import {
    makeCustomDivisionCode,
    type CustomDivision,
    type DivisionFee,
    type DivisionGender,
    type TournamentEventType,
} from "@/lib/tournaments/divisions";

const CATEGORIES = [
    { value: "SEMINAR", label: "Seminar" },
    { value: "TRAINING_CAMP", label: "Training Camp" },
    { value: "TOURNAMENT", label: "Tournament" },
] as const;

export type BeltRankOption = { id: string; name: string };

export type DivisionPresetOption = {
    id: string;
    name: string;
    description: string | null;
    divisions: CustomDivision[];
};

export type EventFormInitialValues = {
    id: string;
    title: string;
    description: string | null;
    location: string | null;
    eventDate: string;
    category: string;
    maxCapacity: number | null;
    memberDiscountPercent: number;
    multiDivisionDiscountPercent: number;
    eventMinAge: number | null;
    eventMinRankId: string | null;
    eventTicketPriceBdt: string | null;
    isPublished: boolean;
    attachmentUrl: string | null;
    attachmentType: "IMAGE" | "PDF" | null;
    divisions: CustomDivision[];
    registrationDeadline: string | null;
    weighInDate: string | null;
    rulesUrl: string | null;
};

// Local draft — mirrors CustomDivision but keeps numeric fields as strings
// while the admin is editing so inputs can be left blank.
type FeeDraft = {
    id: string;
    name: string;
    amountBdt: string;
    required: boolean;
    // Per-fee JKA member discount percentage (0-100). Empty string when
    // the admin has cleared the input; treated as 0 on save.
    memberDiscountPercent: string;
};

type DivisionDraft = {
    code: string;
    label: string;
    // Kept hidden in the current UI; new divisions default to KATA so older
    // consumers that look at eventType keep working.
    eventType: TournamentEventType;
    gender: DivisionGender;
    isTeam: boolean;
    minAge: string;
    minRankId: string;
    fees: FeeDraft[];
};

function makeFeeId(): string {
    return Math.random().toString(36).slice(2, 10);
}

function toDraft(d: CustomDivision): DivisionDraft {
    const fees: FeeDraft[] =
        d.fees && d.fees.length > 0
            ? d.fees.map((f) => ({
                  id: f.id || makeFeeId(),
                  name: f.name,
                  amountBdt: String(f.amountBdt),
                  required: f.required,
                  memberDiscountPercent:
                      f.memberDiscountPercent > 0
                          ? String(f.memberDiscountPercent)
                          : "",
              }))
            : d.priceBdt !== null && d.priceBdt > 0
              ? [
                    {
                        id: makeFeeId(),
                        name: "Entry fee",
                        amountBdt: String(d.priceBdt),
                        required: true,
                        memberDiscountPercent: "",
                    },
                ]
              : [];
    return {
        code: d.code,
        label: d.label,
        eventType: d.eventType,
        gender: d.gender,
        isTeam: d.isTeam,
        minAge: d.minAge !== null ? String(d.minAge) : "",
        minRankId: d.minRankId ?? "",
        fees,
    };
}

function draftToDivision(d: DivisionDraft): CustomDivision {
    const minAge = d.minAge.trim() ? Number.parseInt(d.minAge, 10) : NaN;
    const fees: DivisionFee[] = d.fees
        .filter((f) => f.name.trim())
        .map((f) => {
            const pct = f.memberDiscountPercent.trim()
                ? Number.parseInt(f.memberDiscountPercent, 10)
                : NaN;
            const memberDiscountPercent = Number.isFinite(pct)
                ? Math.max(0, Math.min(100, pct))
                : 0;
            return {
                id: f.id,
                name: f.name.trim(),
                amountBdt: Number.parseFloat(f.amountBdt) || 0,
                required: f.required,
                memberDiscountPercent,
            };
        });
    const priceBdt = fees
        .filter((f) => f.required)
        .reduce((s, f) => s + (Number.isFinite(f.amountBdt) ? f.amountBdt : 0), 0);
    return {
        code: d.code,
        label: d.label.trim(),
        eventType: d.eventType,
        gender: d.gender,
        isTeam: d.isTeam,
        minAge: Number.isFinite(minAge) ? minAge : null,
        minRankId: d.minRankId || null,
        priceBdt: fees.length > 0 ? Math.round(priceBdt * 100) / 100 : null,
        fees,
    };
}

export default function EventForm({
    eyebrow = "New event",
    submitLabel = "Publish event",
    redirectAfter,
    beltRanks = [],
    presets = [],
    initial,
}: {
    eyebrow?: string;
    submitLabel?: string;
    redirectAfter?: string;
    beltRanks?: BeltRankOption[];
    presets?: DivisionPresetOption[];
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
    const [presetOpen, setPresetOpen] = useState(false);
    const [presetName, setPresetName] = useState("");
    const [presetMsg, setPresetMsg] = useState<string | null>(null);
    const [presetBusy, startPresetTransition] = useTransition();
    const router = useRouter();

    const presetLookup = useMemo(() => {
        const map = new Map<string, DivisionPresetOption>();
        for (const p of presets) map.set(p.id, p);
        return map;
    }, [presets]);

    function addDivision() {
        setDivisions((prev) => [
            ...prev,
            {
                code: makeCustomDivisionCode(
                    `Division ${prev.length + 1}`,
                    "KATA",
                ),
                label: "",
                eventType: "KATA",
                gender: "ANY",
                isTeam: false,
                minAge: "",
                minRankId: "",
                fees: [
                    {
                        id: makeFeeId(),
                        name: "Entry fee",
                        amountBdt: "",
                        required: true,
                        memberDiscountPercent: "",
                    },
                ],
            },
        ]);
    }

    function updateDivision(index: number, patch: Partial<DivisionDraft>) {
        setDivisions((prev) =>
            prev.map((d, i) => {
                if (i !== index) return d;
                const next = { ...d, ...patch };
                if (patch.label !== undefined && next.label.trim()) {
                    next.code = makeCustomDivisionCode(next.label, next.eventType);
                }
                return next;
            }),
        );
    }

    function removeDivision(index: number) {
        setDivisions((prev) => prev.filter((_, i) => i !== index));
    }

    function addFee(index: number) {
        setDivisions((prev) =>
            prev.map((d, i) =>
                i === index
                    ? {
                          ...d,
                          fees: [
                              ...d.fees,
                              {
                                  id: makeFeeId(),
                                  name: "",
                                  amountBdt: "",
                                  required: false,
                                  memberDiscountPercent: "",
                              },
                          ],
                      }
                    : d,
            ),
        );
    }

    function updateFee(
        divisionIndex: number,
        feeIndex: number,
        patch: Partial<FeeDraft>,
    ) {
        setDivisions((prev) =>
            prev.map((d, i) => {
                if (i !== divisionIndex) return d;
                return {
                    ...d,
                    fees: d.fees.map((f, fi) =>
                        fi === feeIndex ? { ...f, ...patch } : f,
                    ),
                };
            }),
        );
    }

    function removeFee(divisionIndex: number, feeIndex: number) {
        setDivisions((prev) =>
            prev.map((d, i) => {
                if (i !== divisionIndex) return d;
                return {
                    ...d,
                    fees: d.fees.filter((_, fi) => fi !== feeIndex),
                };
            }),
        );
    }

    function importPreset(presetId: string, mode: "replace" | "append") {
        const p = presetLookup.get(presetId);
        if (!p) return;
        const drafts = p.divisions.map((d) => {
            const draft = toDraft(d);
            // Re-key fee ids on import so re-saving as a preset doesn't
            // collide with the source rows.
            draft.fees = draft.fees.map((f) => ({ ...f, id: makeFeeId() }));
            return draft;
        });
        setDivisions((prev) => (mode === "replace" ? drafts : [...prev, ...drafts]));
        setPresetMsg(`Imported "${p.name}".`);
    }

    async function savePreset() {
        setPresetMsg(null);
        if (!presetName.trim()) {
            setPresetMsg("Give the preset a name first.");
            return;
        }
        const payload = divisions
            .filter((d) => d.label.trim())
            .map(draftToDivision);
        if (payload.length === 0) {
            setPresetMsg("Add at least one division before saving.");
            return;
        }
        const fd = new FormData();
        fd.set("name", presetName.trim());
        fd.set("divisions", JSON.stringify(payload));
        startPresetTransition(async () => {
            const res = await saveDivisionPresetAction(fd);
            if (!res.ok) {
                setPresetMsg(res.error);
                return;
            }
            setPresetMsg(`Preset "${presetName.trim()}" saved.`);
            setPresetName("");
            router.refresh();
        });
    }

    function deletePreset(presetId: string, name: string) {
        if (
            !window.confirm(
                `Delete preset "${name}"? This can't be undone.`,
            )
        ) {
            return;
        }
        const fd = new FormData();
        fd.set("id", presetId);
        startPresetTransition(async () => {
            const res = await deleteDivisionPresetAction(fd);
            if (!res.ok) {
                setPresetMsg(res.error);
                return;
            }
            setPresetMsg(`Preset "${name}" deleted.`);
            router.refresh();
        });
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

            {/* ── Event-level entry gates + ticket ─────────────────── */}
            <div className="mt-5 border-t border-zinc-200 pt-4">
                <p className="text-[10px] tracking-widest uppercase font-bold text-zinc-400 mb-3">
                    Event entry
                </p>
                <p className="text-[11px] text-zinc-500 mb-3">
                    These gates apply to the event overall, before the
                    participant picks any division. Leave any field blank to
                    skip that gate.
                </p>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <Field label="Minimum age">
                        <input
                            name="eventMinAge"
                            type="number"
                            min={1}
                            max={100}
                            defaultValue={initial?.eventMinAge ?? ""}
                            placeholder="Any age"
                            className={inputCx}
                        />
                    </Field>
                    <Field label="Minimum belt rank">
                        <select
                            name="eventMinRankId"
                            defaultValue={initial?.eventMinRankId ?? ""}
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
                    <Field label="Ticket price (BDT)">
                        <input
                            name="eventTicketPrice"
                            type="number"
                            min={0}
                            step="0.01"
                            defaultValue={initial?.eventTicketPriceBdt ?? ""}
                            placeholder="0 (free)"
                            className={inputCx}
                        />
                    </Field>
                </div>
            </div>

            {/* ── Divisions ─────────────────────────────────────────── */}
            <div className="mt-5 border-t border-zinc-200 pt-4">
                <div className="flex items-center justify-between gap-3 mb-3">
                    <p className="text-[10px] tracking-widest uppercase font-bold text-zinc-400 inline-flex items-center gap-1.5">
                        <Layers size={11} />
                        Divisions
                    </p>
                    <button
                        type="button"
                        onClick={() => setPresetOpen((v) => !v)}
                        className="text-[10px] tracking-widest uppercase font-bold text-accent-red hover:underline inline-flex items-center gap-1"
                    >
                        <Bookmark size={11} />
                        Presets
                    </button>
                </div>
                <p className="text-[11px] text-zinc-500 mb-3">
                    Add every division participants can enter. Each division
                    has its own gates and one or more fees; fees can be
                    required (always paid) or optional (participant opts in).
                </p>

                {presetOpen && (
                    <div className="mb-4 border border-zinc-200 rounded-sm p-3 bg-zinc-50/60">
                        <div className="flex items-center justify-between mb-2">
                            <span className="text-[10px] tracking-widest uppercase font-bold text-zinc-500">
                                Division presets
                            </span>
                            <button
                                type="button"
                                onClick={() => setPresetOpen(false)}
                                className="text-zinc-400 hover:text-accent-red"
                                aria-label="Close presets panel"
                            >
                                <X size={14} />
                            </button>
                        </div>
                        {presets.length === 0 ? (
                            <p className="text-[11px] text-zinc-500 mb-3">
                                No presets yet. Save the current division
                                block to reuse it on future events.
                            </p>
                        ) : (
                            <ul className="space-y-2 mb-3">
                                {presets.map((p) => (
                                    <li
                                        key={p.id}
                                        className="flex flex-wrap items-center justify-between gap-2 border border-zinc-200 rounded-sm px-3 py-2 bg-white"
                                    >
                                        <div className="min-w-0">
                                            <p className="text-sm font-semibold text-zinc-900 truncate">
                                                {p.name}
                                            </p>
                                            <p className="text-[11px] text-zinc-500">
                                                {p.divisions.length} division
                                                {p.divisions.length === 1
                                                    ? ""
                                                    : "s"}
                                            </p>
                                        </div>
                                        <div className="flex items-center gap-1">
                                            <button
                                                type="button"
                                                onClick={() =>
                                                    importPreset(p.id, "replace")
                                                }
                                                disabled={presetBusy}
                                                className="inline-flex items-center gap-1 text-[10px] tracking-widest uppercase font-bold text-zinc-700 hover:text-accent-red px-2 py-1 border border-zinc-200 rounded-sm"
                                            >
                                                <Download size={10} />
                                                Replace
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() =>
                                                    importPreset(p.id, "append")
                                                }
                                                disabled={presetBusy}
                                                className="inline-flex items-center gap-1 text-[10px] tracking-widest uppercase font-bold text-zinc-700 hover:text-accent-red px-2 py-1 border border-zinc-200 rounded-sm"
                                            >
                                                <Plus size={10} />
                                                Append
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() =>
                                                    deletePreset(p.id, p.name)
                                                }
                                                disabled={presetBusy}
                                                className="inline-flex items-center gap-1 text-[10px] tracking-widest uppercase font-bold text-zinc-400 hover:text-red-600 px-2 py-1"
                                                aria-label={`Delete preset ${p.name}`}
                                            >
                                                <Trash2 size={11} />
                                            </button>
                                        </div>
                                    </li>
                                ))}
                            </ul>
                        )}
                        <div className="flex gap-2">
                            <input
                                type="text"
                                value={presetName}
                                onChange={(e) => setPresetName(e.target.value)}
                                placeholder="New preset name"
                                className={inputCx}
                            />
                            <button
                                type="button"
                                onClick={savePreset}
                                disabled={presetBusy}
                                className="inline-flex items-center gap-1.5 bg-zinc-900 text-white px-3 py-2 text-[10px] font-bold tracking-widest uppercase hover:bg-zinc-800 rounded-sm disabled:opacity-40 whitespace-nowrap"
                            >
                                {presetBusy ? (
                                    <Loader2 size={11} className="animate-spin" />
                                ) : (
                                    <Bookmark size={11} />
                                )}
                                Save preset
                            </button>
                        </div>
                        {presetMsg && (
                            <p className="text-[11px] text-zinc-600 mt-2">
                                {presetMsg}
                            </p>
                        )}
                    </div>
                )}

                {divisions.length === 0 && (
                    <p className="text-[11px] text-zinc-500 bg-zinc-50 border border-zinc-200 rounded-sm px-3 py-2 mb-3">
                        No divisions yet — participants will register for the
                        event ticket only. Add divisions if you want per-
                        entry categories, extra fees, or age/rank gates.
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
                            onAddFee={() => addFee(i)}
                            onUpdateFee={(fi, patch) => updateFee(i, fi, patch)}
                            onRemoveFee={(fi) => removeFee(i, fi)}
                        />
                    ))}
                </div>

                <div className="flex flex-wrap gap-2 mt-3">
                    <button
                        type="button"
                        onClick={addDivision}
                        className="inline-flex items-center gap-1.5 bg-zinc-900 text-white px-3 py-2 text-[10px] font-bold tracking-widest uppercase hover:bg-zinc-800 rounded-sm"
                    >
                        <Plus size={11} /> Add division
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
                <input
                    type="hidden"
                    name="weighInDate"
                    defaultValue={initial?.weighInDate ?? ""}
                />
            </div>

            {/* ── Discounts ─────────────────────────────────────────── */}
            <div className="mt-5 border-t border-zinc-200 pt-4">
                <p className="text-[10px] tracking-widest uppercase font-bold text-zinc-400 mb-3">
                    Discounts
                </p>
                <p className="text-[11px] text-zinc-500 mb-3">
                    JKA-member discounts are set per fee — use the{" "}
                    <Percent size={10} className="inline align-baseline" />{" "}
                    control beside each fee above to pick which fees get a
                    member discount.
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <Field label="Multi-division discount (%)">
                        <input
                            name="multiDivisionDiscountPercent"
                            type="number"
                            min={0}
                            max={100}
                            step="1"
                            defaultValue={
                                initial?.multiDivisionDiscountPercent ?? 0
                            }
                            placeholder="0"
                            className={inputCx}
                        />
                        <p className="text-[11px] text-zinc-500 mt-1.5">
                            Applied to the sum of a participant&apos;s
                            division fees when they pick 2 or more
                            divisions. Leave 0 to skip.
                        </p>
                    </Field>
                </div>
                <input
                    type="hidden"
                    name="memberDiscountPercent"
                    value="0"
                />
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
    onAddFee,
    onUpdateFee,
    onRemoveFee,
}: {
    draft: DivisionDraft;
    beltRanks: BeltRankOption[];
    onChange: (patch: Partial<DivisionDraft>) => void;
    onRemove: () => void;
    onAddFee: () => void;
    onUpdateFee: (feeIndex: number, patch: Partial<FeeDraft>) => void;
    onRemoveFee: (feeIndex: number) => void;
}) {
    return (
        <div className="border border-zinc-200 rounded-sm p-3 bg-zinc-50/50">
            <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] tracking-widest uppercase font-bold text-accent-red">
                    Division
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
                        placeholder="e.g. Junior individual"
                        className={inputCx}
                    />
                </Field>
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
            </div>

            <div className="mt-4 border-t border-zinc-200/70 pt-3">
                <div className="flex items-center justify-between mb-2">
                    <span className="text-[10px] tracking-widest uppercase font-bold text-zinc-500">
                        Fees
                    </span>
                    <button
                        type="button"
                        onClick={onAddFee}
                        className="inline-flex items-center gap-1 text-[10px] tracking-widest uppercase font-bold text-accent-red hover:underline"
                    >
                        <Plus size={10} /> Add fee
                    </button>
                </div>
                {draft.fees.length === 0 ? (
                    <p className="text-[11px] text-zinc-500 bg-white border border-dashed border-zinc-200 rounded-sm px-3 py-2">
                        No fees — this division is free to enter.
                    </p>
                ) : (
                    <ul className="space-y-2">
                        {draft.fees.map((f, fi) => {
                            const discountOn =
                                f.memberDiscountPercent.trim() !== "" &&
                                Number.parseInt(f.memberDiscountPercent, 10) > 0;
                            return (
                                <li
                                    key={f.id}
                                    className="bg-white border border-zinc-200 rounded-sm p-2"
                                >
                                    <div className="grid grid-cols-1 md:grid-cols-[1fr_120px_130px_28px_28px] gap-2 items-end">
                                        <Field label="Fee name">
                                            <input
                                                type="text"
                                                value={f.name}
                                                onChange={(e) =>
                                                    onUpdateFee(fi, {
                                                        name: e.target.value,
                                                    })
                                                }
                                                placeholder="e.g. Entry fee"
                                                className={inputCx}
                                            />
                                        </Field>
                                        <Field label="Amount (BDT)">
                                            <input
                                                type="number"
                                                min={0}
                                                step="0.01"
                                                value={f.amountBdt}
                                                onChange={(e) =>
                                                    onUpdateFee(fi, {
                                                        amountBdt: e.target.value,
                                                    })
                                                }
                                                placeholder="0"
                                                className={inputCx}
                                            />
                                        </Field>
                                        <div>
                                            <span className="text-[10px] tracking-widest uppercase font-bold text-zinc-500 block mb-1">
                                                Type
                                            </span>
                                            <select
                                                value={f.required ? "required" : "optional"}
                                                onChange={(e) =>
                                                    onUpdateFee(fi, {
                                                        required:
                                                            e.target.value === "required",
                                                    })
                                                }
                                                className={inputCx}
                                            >
                                                <option value="required">Required</option>
                                                <option value="optional">Optional</option>
                                            </select>
                                        </div>
                                        <button
                                            type="button"
                                            onClick={() =>
                                                onUpdateFee(fi, {
                                                    memberDiscountPercent: discountOn
                                                        ? ""
                                                        : "10",
                                                })
                                            }
                                            aria-label={
                                                discountOn
                                                    ? "Remove member discount"
                                                    : "Add member discount"
                                            }
                                            title={
                                                discountOn
                                                    ? "Member discount on — click to remove"
                                                    : "Add JKA member discount"
                                            }
                                            className={`h-9 w-9 inline-flex items-center justify-center rounded-sm border mb-0.5 justify-self-end transition-colors ${
                                                discountOn
                                                    ? "border-emerald-300 bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
                                                    : "border-zinc-200 bg-zinc-50 text-zinc-400 hover:text-accent-red hover:border-zinc-300"
                                            }`}
                                        >
                                            <Percent size={14} />
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => onRemoveFee(fi)}
                                            aria-label="Remove fee"
                                            className="text-zinc-400 hover:text-accent-red mb-2 justify-self-end"
                                        >
                                            <X size={14} />
                                        </button>
                                    </div>
                                    {discountOn && (
                                        <div className="mt-2 flex items-center gap-2 border-t border-dashed border-zinc-200 pt-2">
                                            <Percent
                                                size={11}
                                                className="text-emerald-700"
                                            />
                                            <span className="text-[10px] tracking-widest uppercase font-bold text-emerald-700">
                                                JKA member discount
                                            </span>
                                            <input
                                                type="number"
                                                min={1}
                                                max={100}
                                                step="1"
                                                value={f.memberDiscountPercent}
                                                onChange={(e) =>
                                                    onUpdateFee(fi, {
                                                        memberDiscountPercent:
                                                            e.target.value,
                                                    })
                                                }
                                                placeholder="10"
                                                className="w-20 bg-zinc-50 border border-zinc-200 text-zinc-900 px-2 py-1 focus:outline-none focus:border-accent-red text-sm rounded-sm"
                                            />
                                            <span className="text-[11px] text-zinc-500">
                                                % off this fee for signed-in JKA
                                                members.
                                            </span>
                                        </div>
                                    )}
                                </li>
                            );
                        })}
                    </ul>
                )}
            </div>
        </div>
    );
}
