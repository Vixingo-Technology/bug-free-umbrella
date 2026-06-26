"use client";

import { useCallback, useState, useTransition } from "react";
import { Save, RotateCcw, Loader2, Check, AlertCircle } from "lucide-react";
import {
    type CertificateLayout,
    type FieldKey,
    type TextSpec,
    type ImageSpec,
    FIELD_KEYS,
    FIELD_LABELS,
    FIELD_SAMPLES,
    DEFAULT_LAYOUT,
} from "@/lib/certificates/layout";
import { saveCertificateLayoutAction } from "@/app/portal/admin/certificate-layout/actions";

type Props = {
    initialLayout: CertificateLayout;
    pageWidth: number; // PDF points
    pageHeight: number; // PDF points
    templateUrl: string;
};

// Display scale: 1 PDF point = N CSS px in the editor canvas. Picked so the
// whole template fits on a typical laptop screen.
const SCALE = 1.4;

export default function CertificateLayoutEditor({
    initialLayout,
    pageWidth,
    pageHeight,
    templateUrl,
}: Props) {
    const [layout, setLayout] = useState<CertificateLayout>(initialLayout);
    const [selected, setSelected] = useState<FieldKey>("memberName");
    const [pending, startTransition] = useTransition();
    const [error, setError] = useState<string | null>(null);
    const [savedAt, setSavedAt] = useState<number | null>(null);

    const cw = pageWidth * SCALE;
    const ch = pageHeight * SCALE;

    const update = useCallback(
        <K extends FieldKey>(key: K, patch: Partial<CertificateLayout[K]>) => {
            setLayout((prev) => ({
                ...prev,
                [key]: { ...prev[key], ...patch },
            }));
            setSavedAt(null);
        },
        [],
    );

    const onSave = () => {
        setError(null);
        startTransition(async () => {
            const res = await saveCertificateLayoutAction(layout);
            if ("error" in res) {
                setError(res.error);
            } else {
                setSavedAt(Date.now());
            }
        });
    };

    const onReset = () => {
        if (!confirm("Reset all positions to defaults?")) return;
        setLayout(DEFAULT_LAYOUT);
        setSavedAt(null);
    };

    return (
        <div className="flex flex-col h-screen">
            {/* Toolbar */}
            <div className="flex items-center justify-between bg-white border-b border-zinc-200 px-6 py-3">
                <div>
                    <h1 className="text-sm font-bold tracking-widest uppercase text-zinc-900">
                        Certificate Layout Editor
                    </h1>
                    <p className="text-[11px] text-zinc-500 mt-0.5">
                        Drag any element on the template, or tune values in the
                        side panel. Save writes to{" "}
                        <code className="font-mono text-zinc-700">
                            lib/certificates/layout.json
                        </code>
                        .
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    {error && (
                        <span className="inline-flex items-center gap-1 text-xs text-red-600">
                            <AlertCircle size={12} /> {error}
                        </span>
                    )}
                    {savedAt && !error && (
                        <span className="inline-flex items-center gap-1 text-xs text-emerald-600">
                            <Check size={12} /> Saved
                        </span>
                    )}
                    <button
                        type="button"
                        onClick={onReset}
                        className="inline-flex items-center gap-1.5 bg-white border border-zinc-200 text-zinc-600 hover:border-accent-red hover:text-accent-red px-3 py-2 text-[10px] font-bold tracking-widest uppercase rounded-sm"
                    >
                        <RotateCcw size={11} />
                        Reset
                    </button>
                    <button
                        type="button"
                        onClick={onSave}
                        disabled={pending}
                        className="inline-flex items-center gap-1.5 bg-zinc-900 hover:bg-accent-red text-white px-4 py-2 text-[10px] font-bold tracking-widest uppercase rounded-sm disabled:opacity-50"
                    >
                        {pending ? (
                            <Loader2 size={12} className="animate-spin" />
                        ) : (
                            <Save size={12} />
                        )}
                        Save
                    </button>
                </div>
            </div>

            <div className="flex-1 flex overflow-hidden">
                {/* Canvas */}
                <div className="flex-1 overflow-auto bg-zinc-200 p-8 flex items-start justify-center">
                    <div
                        className="relative bg-white shadow-xl"
                        style={{ width: cw, height: ch }}
                    >
                        {/* Template as background — pointer-events:none so the
                            overlay boxes catch the drag, not the PDF viewer. */}
                        <iframe
                            src={`${templateUrl}#toolbar=0&navpanes=0&view=Fit`}
                            className="absolute inset-0 w-full h-full pointer-events-none"
                            title="Certificate template"
                        />
                        {FIELD_KEYS.map((key) => (
                            <FieldBox
                                key={key}
                                fieldKey={key}
                                spec={layout[key]}
                                selected={selected === key}
                                onSelect={() => setSelected(key)}
                                onChange={(patch) => update(key, patch as never)}
                            />
                        ))}
                    </div>
                </div>

                {/* Side panel */}
                <div className="w-[320px] bg-white border-l border-zinc-200 flex flex-col overflow-hidden">
                    <div className="border-b border-zinc-200 overflow-y-auto">
                        {FIELD_KEYS.map((key) => (
                            <button
                                key={key}
                                type="button"
                                onClick={() => setSelected(key)}
                                className={`w-full text-left px-4 py-2 text-xs border-l-2 ${
                                    selected === key
                                        ? "bg-accent-red/5 border-accent-red text-zinc-900 font-bold"
                                        : "border-transparent text-zinc-600 hover:bg-zinc-50"
                                }`}
                            >
                                {FIELD_LABELS[key]}
                            </button>
                        ))}
                    </div>
                    <div className="flex-1 overflow-y-auto p-4">
                        <FieldInputs
                            fieldKey={selected}
                            spec={layout[selected]}
                            onChange={(patch) =>
                                update(selected, patch as never)
                            }
                        />
                    </div>
                </div>
            </div>
        </div>
    );
}

// ─────────────────────────────────────────────
// Field box on the canvas (draggable)
// ─────────────────────────────────────────────

type FieldBoxProps = {
    fieldKey: FieldKey;
    spec: TextSpec | ImageSpec;
    selected: boolean;
    onSelect: () => void;
    onChange: (patch: Partial<TextSpec> | Partial<ImageSpec>) => void;
};

function FieldBox({
    fieldKey,
    spec,
    selected,
    onSelect,
    onChange,
}: FieldBoxProps) {
    // Compute the visible box in screen px from the layout spec.
    const { left, top, width, height } = boxRect(fieldKey, spec);

    // Drag handlers — track the offset between mouse and box origin so the
    // box doesn't jump when you click slightly off-center.
    const onMouseDown = (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        onSelect();
        const startX = e.clientX;
        const startY = e.clientY;
        const startSpec = { ...spec };

        const onMove = (ev: MouseEvent) => {
            const dxPx = ev.clientX - startX;
            const dyPx = ev.clientY - startY;
            const dxPt = dxPx / SCALE;
            const dyPt = dyPx / SCALE;

            if (startSpec.kind === "text") {
                onChange({
                    cx: round1(startSpec.cx + dxPt),
                    y: round1(startSpec.y + dyPt),
                });
            } else {
                onChange({
                    x: round1(startSpec.x + dxPt),
                    y: round1(startSpec.y + dyPt),
                });
            }
        };
        const onUp = () => {
            window.removeEventListener("mousemove", onMove);
            window.removeEventListener("mouseup", onUp);
        };
        window.addEventListener("mousemove", onMove);
        window.addEventListener("mouseup", onUp);
    };

    const sample = FIELD_SAMPLES[fieldKey];
    const isText = spec.kind === "text";

    return (
        <div
            onMouseDown={onMouseDown}
            onClick={(e) => {
                e.stopPropagation();
                onSelect();
            }}
            className={`absolute cursor-move select-none flex items-center justify-center text-[10px] font-bold uppercase tracking-wider ${
                selected
                    ? "outline outline-2 outline-accent-red bg-accent-red/10 text-accent-red"
                    : "outline outline-1 outline-zinc-400/60 bg-white/40 text-zinc-700 hover:bg-zinc-100/70"
            }`}
            style={{
                left,
                top,
                width,
                height,
                minWidth: 24,
                minHeight: 16,
            }}
            title={`${FIELD_LABELS[fieldKey]} — drag to move`}
        >
            <span className="truncate px-1 pointer-events-none">
                {isText ? sample : fieldKey}
            </span>
        </div>
    );
}

function boxRect(
    fieldKey: FieldKey,
    spec: TextSpec | ImageSpec,
): { left: number; top: number; width: number; height: number } {
    if (spec.kind === "text") {
        // Estimate the editor handle width from the sample text length, so
        // the box visually approximates what the rendered text will occupy.
        // The renderer measures real glyph widths — this is just for the UI.
        const chars = FIELD_SAMPLES[fieldKey].length;
        const widthPt = spec.maxWidth ?? spec.size * 0.55 * Math.max(4, chars);
        const heightPt = spec.size * 1.2;
        // `y` is the baseline; box sits with its bottom edge near it.
        const topPt = spec.y - heightPt * 0.85;
        const leftPt = spec.cx - widthPt / 2;
        return {
            left: leftPt * SCALE,
            top: topPt * SCALE,
            width: widthPt * SCALE,
            height: heightPt * SCALE,
        };
    }
    // Image: y is top edge. When centered, x is centre, otherwise left edge.
    const leftPt = spec.centered ? spec.x - spec.w / 2 : spec.x;
    return {
        left: leftPt * SCALE,
        top: spec.y * SCALE,
        width: spec.w * SCALE,
        height: spec.h * SCALE,
    };
}

function round1(n: number): number {
    return Math.round(n * 10) / 10;
}

// ─────────────────────────────────────────────
// Side-panel inputs for the selected field
// ─────────────────────────────────────────────

type InputsProps = {
    fieldKey: FieldKey;
    spec: TextSpec | ImageSpec;
    onChange: (patch: Partial<TextSpec> | Partial<ImageSpec>) => void;
};

function FieldInputs({ fieldKey, spec, onChange }: InputsProps) {
    return (
        <div className="space-y-4">
            <div>
                <p className="text-[10px] tracking-widest uppercase font-bold text-zinc-500 mb-1">
                    Field
                </p>
                <p className="text-sm font-semibold text-zinc-900">
                    {FIELD_LABELS[fieldKey]}
                </p>
            </div>

            {spec.kind === "text" ? (
                <>
                    <NumberRow
                        label="Center X"
                        value={spec.cx}
                        onChange={(v) => onChange({ cx: v })}
                    />
                    <NumberRow
                        label="Baseline Y"
                        value={spec.y}
                        onChange={(v) => onChange({ y: v })}
                    />
                    <NumberRow
                        label="Font size"
                        value={spec.size}
                        step={0.5}
                        min={1}
                        onChange={(v) => onChange({ size: v })}
                    />
                    <NumberRow
                        label="Max width"
                        value={spec.maxWidth ?? 0}
                        onChange={(v) =>
                            onChange({
                                maxWidth: v > 0 ? v : undefined,
                            } as Partial<TextSpec>)
                        }
                        hint="0 = unlimited"
                    />
                </>
            ) : (
                <>
                    <NumberRow
                        label={spec.centered ? "Center X" : "Left X"}
                        value={spec.x}
                        onChange={(v) => onChange({ x: v })}
                    />
                    <NumberRow
                        label="Top Y"
                        value={spec.y}
                        onChange={(v) => onChange({ y: v })}
                    />
                    <NumberRow
                        label="Max width"
                        value={spec.w}
                        min={1}
                        onChange={(v) => onChange({ w: v })}
                    />
                    <NumberRow
                        label="Max height"
                        value={spec.h}
                        min={1}
                        onChange={(v) => onChange({ h: v })}
                    />
                    <label className="flex items-center gap-2 text-xs text-zinc-700">
                        <input
                            type="checkbox"
                            checked={!!spec.centered}
                            onChange={(e) =>
                                onChange({ centered: e.target.checked })
                            }
                        />
                        Centered (X is the centre, not the left edge)
                    </label>
                </>
            )}

            <p className="text-[10px] text-zinc-400 pt-4 border-t border-zinc-100">
                All values are in PDF points. Page is 595 × 789 pt.
            </p>
        </div>
    );
}

function NumberRow({
    label,
    value,
    onChange,
    step = 1,
    min,
    hint,
}: {
    label: string;
    value: number;
    onChange: (v: number) => void;
    step?: number;
    min?: number;
    hint?: string;
}) {
    return (
        <div>
            <label className="flex items-center justify-between text-[10px] tracking-widest uppercase font-bold text-zinc-500 mb-1">
                <span>{label}</span>
                {hint && (
                    <span className="text-[9px] normal-case tracking-normal font-normal text-zinc-400">
                        {hint}
                    </span>
                )}
            </label>
            <div className="flex items-center gap-1">
                <button
                    type="button"
                    onClick={() => onChange(round1(value - step))}
                    className="w-7 h-8 bg-zinc-100 hover:bg-zinc-200 text-zinc-700 text-xs font-bold rounded-sm"
                >
                    −
                </button>
                <input
                    type="number"
                    value={value}
                    step={step}
                    min={min}
                    onChange={(e) => onChange(Number(e.target.value))}
                    className="flex-1 bg-white border border-zinc-200 rounded-sm px-2 py-1.5 text-sm font-mono text-zinc-900 focus:outline-none focus:border-accent-red"
                />
                <button
                    type="button"
                    onClick={() => onChange(round1(value + step))}
                    className="w-7 h-8 bg-zinc-100 hover:bg-zinc-200 text-zinc-700 text-xs font-bold rounded-sm"
                >
                    +
                </button>
            </div>
        </div>
    );
}

