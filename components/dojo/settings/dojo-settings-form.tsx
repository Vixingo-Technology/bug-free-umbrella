"use client";

import dynamic from "next/dynamic";
import { useMemo, useState, useTransition } from "react";
import { AlertCircle, CheckCircle2, Loader2, Save, X } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { saveDojoSettingsAction } from "@/app/portal/dojo/settings/actions";

const DojoLocationPicker = dynamic(
    () => import("@/components/dojo-location-picker"),
    {
        ssr: false,
        loading: () => (
            <div className="w-full h-80 rounded-sm border border-zinc-200 bg-zinc-50 flex items-center justify-center text-xs tracking-widest uppercase font-bold text-zinc-400">
                Loading map…
            </div>
        ),
    }
);

const LocationMiniMap = dynamic(
    () => import("@/components/dojo/settings/location-mini-map"),
    {
        ssr: false,
        loading: () => (
            <div className="w-full h-40 rounded-sm border border-zinc-200 bg-zinc-50 flex items-center justify-center text-[10px] tracking-widest uppercase font-bold text-zinc-400">
                Loading map…
            </div>
        ),
    }
);

type Values = {
    name: string;
    shortName: string;
    phone: string;
    email: string;
    address: string;
    latitude: string;
    longitude: string;
};

type Props = {
    initial: Values;
};

const FIELD_LABELS: Record<keyof Values, string> = {
    name: "Dojo name",
    shortName: "Short name",
    phone: "Phone",
    email: "Public email",
    address: "Address",
    latitude: "Latitude",
    longitude: "Longitude",
};

export default function DojoSettingsForm({ initial }: Props) {
    const [values, setValues] = useState<Values>(initial);
    const [error, setError] = useState<string | null>(null);
    const [toast, setToast] = useState<
        { kind: "ok" | "err"; msg: string } | null
    >(null);
    const [confirmOpen, setConfirmOpen] = useState(false);
    const [pending, startTransition] = useTransition();

    const rawDiff = useMemo(() => {
        const rows: { key: keyof Values; label: string; from: string; to: string }[] = [];
        (Object.keys(initial) as (keyof Values)[]).forEach((k) => {
            if (initial[k] !== values[k]) {
                rows.push({
                    key: k,
                    label: FIELD_LABELS[k],
                    from: initial[k] || "—",
                    to: values[k] || "—",
                });
            }
        });
        return rows;
    }, [initial, values]);

    const isDirty = rawDiff.length > 0;

    const diff = useMemo(
        () => rawDiff.filter((r) => r.key !== "latitude" && r.key !== "longitude"),
        [rawDiff]
    );

    const mapChanged =
        initial.latitude !== values.latitude ||
        initial.longitude !== values.longitude;

    const newLatLng = useMemo<[number, number] | null>(() => {
        const lat = parseFloat(values.latitude);
        const lng = parseFloat(values.longitude);
        return Number.isFinite(lat) && Number.isFinite(lng) ? [lat, lng] : null;
    }, [values.latitude, values.longitude]);

    function update<K extends keyof Values>(key: K, val: Values[K]) {
        setValues((v) => ({ ...v, [key]: val }));
        setError(null);
    }

    function handlePickerChange(lat: string, lng: string) {
        setValues((v) => ({ ...v, latitude: lat, longitude: lng }));
        setError(null);
    }

    function openConfirm() {
        setError(null);
        if (!isDirty) return;

        const lat = values.latitude.trim() === "" ? null : parseFloat(values.latitude);
        const lng = values.longitude.trim() === "" ? null : parseFloat(values.longitude);
        if (lat !== null && !Number.isFinite(lat)) {
            setError("Latitude must be a number.");
            return;
        }
        if (lng !== null && !Number.isFinite(lng)) {
            setError("Longitude must be a number.");
            return;
        }
        if (!values.name.trim()) {
            setError("Dojo name is required.");
            return;
        }
        if (values.shortName.trim().length > 24) {
            setError("Short name must be 24 characters or fewer.");
            return;
        }
        const phoneDigits = values.phone.replace(/\D/g, "");
        if (values.phone.trim() && phoneDigits.length !== 11) {
            setError("Phone number must be 11 digits.");
            return;
        }
        setConfirmOpen(true);
    }

    function confirmSave() {
        const lat = values.latitude.trim() === "" ? null : parseFloat(values.latitude);
        const lng = values.longitude.trim() === "" ? null : parseFloat(values.longitude);

        startTransition(async () => {
            const res = await saveDojoSettingsAction({
                name: values.name.trim(),
                shortName: values.shortName.trim() || null,
                phone: values.phone.trim() || null,
                email: values.email.trim() || null,
                address: values.address.trim() || null,
                latitude: lat,
                longitude: lng,
            });
            if ("error" in res) {
                setError(res.error);
                setConfirmOpen(false);
                setToast({ kind: "err", msg: res.error });
                setTimeout(() => setToast(null), 4000);
                return;
            }
            setConfirmOpen(false);
            setToast({ kind: "ok", msg: "Your Dojo Settings has been updated." });
            setTimeout(() => setToast(null), 4000);
        });
    }

    return (
        <>
            <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-6 mb-10">
                <div>
                    <p className="text-[10px] tracking-[0.4em] uppercase text-accent-red font-bold mb-3">
                        Manager
                    </p>
                    <h1 className="font-karate text-3xl md:text-4xl font-bold text-zinc-900 uppercase tracking-wider leading-[1.15]">
                        Dojo settings
                    </h1>
                    <p className="text-zinc-600 mt-3 max-w-2xl leading-relaxed">
                        Editing the public profile of {initial.name}.
                    </p>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                    <button
                        type="button"
                        onClick={openConfirm}
                        disabled={!isDirty || pending}
                        className="inline-flex items-center gap-2 bg-accent-red text-white px-4 py-2.5 text-xs font-bold tracking-widest uppercase hover:bg-accent-red/90 transition-colors rounded-sm disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                        {pending ? (
                            <Loader2 size={14} className="animate-spin" />
                        ) : (
                            <Save size={14} />
                        )}
                        Save changes
                    </button>
                </div>
            </div>

            {error && (
                <div className="mb-6 flex items-center gap-2 rounded-sm border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
                    <AlertCircle size={14} /> {error}
                </div>
            )}

            <div className="grid lg:grid-cols-2 gap-6">
                {/* Public profile */}
                <Card title="Public profile">
                    <Field
                        label="Dojo name"
                        value={values.name}
                        onChange={(v) => update("name", v)}
                    />
                    <Field
                        label="Short name"
                        value={values.shortName}
                        onChange={(v) => update("shortName", v.slice(0, 24))}
                        hint='Shown above "Dojo Console" in the portal sidebar. Max 24 characters.'
                    />
                    <Field
                        label="Phone"
                        value={values.phone}
                        onChange={(v) => update("phone", v)}
                        hint="Must be 11 digits (e.g. 017XXXXXXXX)."
                        error={
                            values.phone.trim() &&
                            values.phone.replace(/\D/g, "").length !== 11
                                ? "Phone must be 11 digits."
                                : null
                        }
                    />
                    <Field
                        label="Public email"
                        value={values.email}
                        onChange={(v) => update("email", v)}
                    />
                </Card>

                {/* Location */}
                <Card title="Location">
                    <div className="space-y-4">
                        <div>
                            <label className="block text-[10px] tracking-widest uppercase font-bold text-zinc-500 mb-2">
                                Address
                            </label>
                            <input
                                type="text"
                                value={values.address}
                                onChange={(e) => update("address", e.target.value)}
                                className="w-full bg-zinc-50 border border-zinc-200 text-zinc-900 px-3 py-2 focus:outline-none focus:border-accent-red text-sm transition-colors rounded-sm"
                            />
                        </div>
                        <DojoLocationPicker
                            latitude={values.latitude}
                            longitude={values.longitude}
                            onChange={handlePickerChange}
                        />
                    </div>
                </Card>
            </div>

            {/* Confirm dialog */}
            <AnimatePresence>
                {confirmOpen && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
                        onClick={() => !pending && setConfirmOpen(false)}
                    >
                        <motion.div
                            initial={{ scale: 0.95, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.95, opacity: 0 }}
                            onClick={(e) => e.stopPropagation()}
                            className="w-full max-w-lg bg-white rounded-sm shadow-xl border border-zinc-200"
                        >
                            <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-200">
                                <h3 className="text-xs tracking-widest uppercase font-bold text-zinc-900">
                                    Confirm changes
                                </h3>
                                <button
                                    type="button"
                                    onClick={() => setConfirmOpen(false)}
                                    disabled={pending}
                                    className="text-zinc-400 hover:text-zinc-700 disabled:opacity-40"
                                >
                                    <X size={16} />
                                </button>
                            </div>
                            <div className="p-5 space-y-3 max-h-[60vh] overflow-y-auto">
                                <p className="text-sm text-zinc-600">
                                    Review the changes below before saving.
                                </p>
                                {diff.length > 0 && (
                                <ul className="divide-y divide-zinc-200 border border-zinc-200 rounded-sm">
                                    {diff.map((row) => (
                                        <li key={row.key} className="px-3 py-2 text-xs">
                                            <p className="font-bold uppercase tracking-widest text-zinc-500 text-[10px] mb-1">
                                                {row.label}
                                            </p>
                                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                                <div>
                                                    <p className="text-[10px] uppercase text-zinc-400 mb-0.5">
                                                        From
                                                    </p>
                                                    <p className="text-zinc-600 line-through break-words">
                                                        {row.from}
                                                    </p>
                                                </div>
                                                <div>
                                                    <p className="text-[10px] uppercase text-zinc-400 mb-0.5">
                                                        To
                                                    </p>
                                                    <p className="text-zinc-900 font-semibold break-words">
                                                        {row.to}
                                                    </p>
                                                </div>
                                            </div>
                                        </li>
                                    ))}
                                </ul>
                                )}
                                {mapChanged && newLatLng && (
                                    <div>
                                        <p className="text-[10px] uppercase tracking-widest font-bold text-zinc-500 mb-2">
                                            New location preview
                                        </p>
                                        <LocationMiniMap
                                            latitude={newLatLng[0]}
                                            longitude={newLatLng[1]}
                                        />
                                    </div>
                                )}
                            </div>
                            <div className="flex items-center justify-end gap-2 px-5 py-4 border-t border-zinc-200 bg-zinc-50">
                                <button
                                    type="button"
                                    onClick={() => setConfirmOpen(false)}
                                    disabled={pending}
                                    className="inline-flex items-center gap-2 px-4 py-2 text-xs font-bold tracking-widest uppercase text-zinc-700 hover:text-zinc-900 disabled:opacity-40 rounded-sm"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="button"
                                    onClick={confirmSave}
                                    disabled={pending}
                                    className="inline-flex items-center gap-2 bg-accent-red text-white px-4 py-2 text-xs font-bold tracking-widest uppercase hover:bg-accent-red/90 disabled:opacity-40 rounded-sm"
                                >
                                    {pending ? (
                                        <Loader2 size={12} className="animate-spin" />
                                    ) : (
                                        <Save size={12} />
                                    )}
                                    Confirm & save
                                </button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Toast */}
            <AnimatePresence>
                {toast && (
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 20 }}
                        className={`fixed bottom-6 right-6 z-50 flex items-center gap-2 px-4 py-3 rounded-sm shadow-lg text-sm font-medium ${
                            toast.kind === "ok"
                                ? "bg-emerald-600 text-white"
                                : "bg-red-600 text-white"
                        }`}
                    >
                        {toast.kind === "ok" ? (
                            <CheckCircle2 size={16} />
                        ) : (
                            <AlertCircle size={16} />
                        )}
                        {toast.msg}
                    </motion.div>
                )}
            </AnimatePresence>
        </>
    );
}

function Card({
    title,
    children,
}: {
    title: string;
    children: React.ReactNode;
}) {
    return (
        <div className="bg-white border border-zinc-200 rounded-sm shadow-sm">
            <div className="px-5 py-4 border-b border-zinc-200">
                <h3 className="text-xs tracking-widest uppercase font-bold text-zinc-500">
                    {title}
                </h3>
            </div>
            <div className="p-5 space-y-4">{children}</div>
        </div>
    );
}

function Field({
    label,
    value,
    onChange,
    hint,
    error,
}: {
    label: string;
    value: string;
    onChange: (v: string) => void;
    hint?: string;
    error?: string | null;
}) {
    const hasError = Boolean(error);
    return (
        <div>
            <label className="block text-[10px] tracking-widest uppercase font-bold text-zinc-500 mb-2">
                {label}
            </label>
            <input
                type="text"
                value={value}
                onChange={(e) => onChange(e.target.value)}
                className={`w-full bg-zinc-50 border text-zinc-900 px-3 py-2 focus:outline-none text-sm transition-colors rounded-sm ${
                    hasError
                        ? "border-red-400 focus:border-red-500"
                        : "border-zinc-200 focus:border-accent-red"
                }`}
            />
            {hasError ? (
                <p className="mt-1 text-[11px] text-red-600">{error}</p>
            ) : hint ? (
                <p className="mt-1 text-[11px] text-zinc-500">{hint}</p>
            ) : null}
        </div>
    );
}
