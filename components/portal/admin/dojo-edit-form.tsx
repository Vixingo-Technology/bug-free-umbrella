"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
    ArrowLeft,
    Building2,
    CheckCircle2,
    AlertCircle,
} from "lucide-react";
import {
    updateDojoAction,
    updateDojoLockedFeaturesAction,
} from "@/app/actions/admin-dojos";
import { validatePhone } from "@/lib/validation/phone";
import {
    FEATURE_KEYS,
    FEATURE_LABEL,
    type FeatureKey,
} from "@/lib/dojo/feature-locks";

export type DojoEditInitial = {
    id: string;
    name: string;
    address: string | null;
    city: string | null;
    phone: string | null;
    email: string | null;
    latitude: number | null;
    longitude: number | null;
    isActive: boolean;
    lockedFeatures: string[];
    studentMilestone: number;
    owner: {
        id: string;
        fullName: string;
        email: string;
    } | null;
};

export type DojoOwnerCandidate = {
    id: string;
    fullName: string;
    email: string;
    roleId: string;
};

export default function DojoEditForm({
    dojo,
}: {
    dojo: DojoEditInitial;
    users?: DojoOwnerCandidate[];
}) {
    const router = useRouter();
    const [isPending, startTransition] = useTransition();
    const [toast, setToast] = useState<
        { kind: "ok" | "err"; msg: string } | null
    >(null);

    const [form, setForm] = useState({
        name: dojo.name,
        address: dojo.address ?? "",
        city: dojo.city ?? "",
        phone: dojo.phone ?? "",
        email: dojo.email ?? "",
        latitude: dojo.latitude != null ? String(dojo.latitude) : "",
        longitude: dojo.longitude != null ? String(dojo.longitude) : "",
        isActive: dojo.isActive,
        studentMilestone: String(dojo.studentMilestone),
    });

    const [locked, setLocked] = useState<Set<FeatureKey>>(
        () =>
            new Set(
                dojo.lockedFeatures.filter((v): v is FeatureKey =>
                    (FEATURE_KEYS as readonly string[]).includes(v),
                ),
            ),
    );

    function flash(kind: "ok" | "err", msg: string) {
        setToast({ kind, msg });
        setTimeout(() => setToast(null), 4000);
    }

    function toggleFeature(key: FeatureKey) {
        setLocked((prev) => {
            const next = new Set(prev);
            if (next.has(key)) next.delete(key);
            else next.add(key);
            return next;
        });
    }

    function submit(e: React.FormEvent) {
        e.preventDefault();
        if (form.phone && form.phone.trim()) {
            const phoneError = validatePhone(form.phone);
            if (phoneError) {
                flash("err", phoneError);
                return;
            }
        }
        const fd = new FormData();
        fd.set("id", dojo.id);
        Object.entries(form).forEach(([k, v]) => {
            if (k === "isActive") {
                if (v) fd.set(k, "true");
            } else {
                fd.set(k, String(v ?? ""));
            }
        });
        const nextLocked = Array.from(locked);
        const prevLocked = new Set(dojo.lockedFeatures);
        const locksChanged =
            nextLocked.length !== prevLocked.size ||
            nextLocked.some((k) => !prevLocked.has(k));

        startTransition(async () => {
            const res = await updateDojoAction(fd);
            if (!res.ok) {
                flash("err", res.error);
                return;
            }
            if (locksChanged) {
                const lockFd = new FormData();
                lockFd.set("id", dojo.id);
                nextLocked.forEach((k) => lockFd.append("feature", k));
                const lockRes = await updateDojoLockedFeaturesAction(lockFd);
                if (!lockRes.ok) {
                    flash("err", lockRes.error);
                    return;
                }
            }
            flash("ok", "Dojo updated.");
            router.push("/portal/admin/dojos");
            router.refresh();
        });
    }

    return (
        <div className="max-w-3xl mx-auto">
            <Link
                href="/portal/admin/dojos"
                className="inline-flex items-center gap-1.5 text-xs font-bold tracking-widest uppercase text-zinc-500 hover:text-zinc-900 transition-colors mb-4"
            >
                <ArrowLeft size={12} /> Back to dojos
            </Link>

            <div className="bg-white border border-zinc-100 rounded-2xl shadow-sm overflow-hidden">
                <div className="px-6 py-5 border-b border-zinc-100 flex items-center gap-3">
                    <div className="p-2 bg-accent-red/10 rounded-xl">
                        <Building2 size={18} className="text-accent-red" />
                    </div>
                    <div>
                        <h1 className="text-lg font-bold text-zinc-900">
                            Edit dojo
                        </h1>
                        <p className="text-xs text-zinc-500">{dojo.name}</p>
                    </div>
                </div>

                <form onSubmit={submit} className="p-6 space-y-4">
                    <Field label="Dojo name" required>
                        <input
                            type="text"
                            value={form.name}
                            onChange={(e) =>
                                setForm({ ...form, name: e.target.value })
                            }
                            required
                            className={inputCls}
                        />
                    </Field>

                    <Field label="Address">
                        <textarea
                            value={form.address}
                            onChange={(e) =>
                                setForm({ ...form, address: e.target.value })
                            }
                            rows={2}
                            className={inputCls}
                        />
                    </Field>

                    <div className="grid grid-cols-2 gap-4">
                        <Field label="City">
                            <input
                                type="text"
                                value={form.city}
                                onChange={(e) =>
                                    setForm({ ...form, city: e.target.value })
                                }
                                className={inputCls}
                            />
                        </Field>
                        <Field label="Phone">
                            <input
                                type="tel"
                                inputMode="numeric"
                                pattern="\d{11}"
                                maxLength={11}
                                title="Phone number must be exactly 11 digits."
                                placeholder="01XXXXXXXXX"
                                value={form.phone}
                                onChange={(e) =>
                                    setForm({
                                        ...form,
                                        phone: e.target.value
                                            .replace(/\D/g, "")
                                            .slice(0, 11),
                                    })
                                }
                                className={inputCls}
                            />
                        </Field>
                    </div>

                    <Field label="Email">
                        <input
                            type="email"
                            value={form.email}
                            onChange={(e) =>
                                setForm({ ...form, email: e.target.value })
                            }
                            className={inputCls}
                        />
                    </Field>

                    <div className="grid grid-cols-2 gap-4">
                        <Field label="Latitude">
                            <input
                                type="text"
                                inputMode="decimal"
                                value={form.latitude}
                                onChange={(e) =>
                                    setForm({
                                        ...form,
                                        latitude: e.target.value,
                                    })
                                }
                                placeholder="23.7808"
                                className={inputCls}
                            />
                        </Field>
                        <Field label="Longitude">
                            <input
                                type="text"
                                inputMode="decimal"
                                value={form.longitude}
                                onChange={(e) =>
                                    setForm({
                                        ...form,
                                        longitude: e.target.value,
                                    })
                                }
                                placeholder="90.4093"
                                className={inputCls}
                            />
                        </Field>
                    </div>

                    <label className="flex items-center gap-3 cursor-pointer">
                        <input
                            type="checkbox"
                            checked={form.isActive}
                            onChange={(e) =>
                                setForm({
                                    ...form,
                                    isActive: e.target.checked,
                                })
                            }
                            className="w-4 h-4 rounded text-accent-red focus:ring-accent-red"
                        />
                        <span className="text-sm font-medium text-zinc-700">
                            Dojo is active (visible on /branches)
                        </span>
                    </label>

                    <div className="pt-2 border-t border-zinc-100">
                        <Field label="Minimum students to unlock certificate features">
                            <input
                                type="number"
                                inputMode="numeric"
                                min={0}
                                step={1}
                                value={form.studentMilestone}
                                onChange={(e) =>
                                    setForm({
                                        ...form,
                                        studentMilestone: e.target.value
                                            .replace(/\D/g, "")
                                            .slice(0, 5),
                                    })
                                }
                                placeholder="0"
                                className={inputCls}
                            />
                            <p className="mt-1.5 text-xs text-zinc-500">
                                Active-student count this dojo must reach before
                                certificates, announcements, transfers, and
                                staff invites auto-unlock. Defaults to 0
                                (features open immediately).
                            </p>
                        </Field>
                    </div>

                    <div className="pt-2 border-t border-zinc-100">
                        <p className="text-sm font-semibold text-zinc-900 mb-1">
                            Locked features
                        </p>
                        <p className="text-xs text-zinc-500 mb-3">
                            Checking a feature locks its page for this dojo.
                            Dojos below the active-student milestone above
                            already auto-lock certificates, announcements,
                            transfers, and staff invites.
                        </p>
                        <div className="grid grid-cols-2 gap-2">
                            {FEATURE_KEYS.map((key) => {
                                const isLocked = locked.has(key);
                                return (
                                    <label
                                        key={key}
                                        className={`flex items-center gap-2 px-3 py-2 border rounded-lg cursor-pointer transition-colors ${
                                            isLocked
                                                ? "border-accent-red/40 bg-accent-red/5"
                                                : "border-zinc-200 hover:border-zinc-300"
                                        }`}
                                    >
                                        <input
                                            type="checkbox"
                                            checked={isLocked}
                                            onChange={() =>
                                                toggleFeature(key)
                                            }
                                            className="w-4 h-4 rounded text-accent-red focus:ring-accent-red"
                                        />
                                        <span className="text-xs font-medium text-zinc-700">
                                            {FEATURE_LABEL[key]}
                                        </span>
                                    </label>
                                );
                            })}
                        </div>
                    </div>

                    <div className="flex items-center gap-3 pt-4 border-t border-zinc-100">
                        <Link
                            href="/portal/admin/dojos"
                            className="flex-1 text-center px-4 py-2.5 text-sm font-semibold text-zinc-700 hover:bg-zinc-100 rounded-xl transition-colors"
                        >
                            Cancel
                        </Link>
                        <button
                            type="submit"
                            disabled={isPending}
                            className="flex-1 px-4 py-2.5 text-sm font-semibold text-white bg-accent-red hover:bg-accent-red/90 disabled:opacity-50 rounded-xl transition-colors"
                        >
                            {isPending ? "Saving…" : "Save changes"}
                        </button>
                    </div>
                </form>
            </div>

            {toast && (
                <div
                    className={`fixed bottom-6 right-6 z-50 flex items-center gap-2 px-4 py-3 rounded-xl shadow-lg text-sm font-medium ${
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
                </div>
            )}
        </div>
    );
}

const inputCls =
    "w-full px-3 py-2.5 text-sm bg-zinc-50 border border-zinc-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-accent-red/30 focus:border-accent-red focus:bg-white";

function Field({
    label,
    children,
    required,
}: {
    label: string;
    children: React.ReactNode;
    required?: boolean;
}) {
    return (
        <div>
            <label className="block text-[10px] font-bold tracking-widest uppercase text-zinc-500 mb-1.5">
                {label}
                {required && <span className="text-accent-red ml-1">*</span>}
            </label>
            {children}
        </div>
    );
}
