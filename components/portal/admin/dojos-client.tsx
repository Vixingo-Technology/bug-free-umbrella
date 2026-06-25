"use client";

import { useMemo, useState, useTransition } from "react";
import { motion } from "motion/react";
import {
    Building2, Plus, Search, X, Pencil, Trash2, MapPin, Phone, Mail,
    Users, UserCheck, AlertCircle, CheckCircle2, ChevronDown, Power,
    Calendar, Send, Loader2,
} from "lucide-react";
import {
    createDojoAction,
    updateDojoAction,
    deleteDojoAction,
    assignDojoInstructorAction,
    sendDojoRenewalReminderAction,
} from "@/app/actions/admin-dojos";

type Instructor = { id: string; fullName: string; email: string; role: string };

type Dojo = {
    id: string;
    name: string;
    address: string | null;
    city: string | null;
    latitude: number | null;
    longitude: number | null;
    phone: string | null;
    email: string | null;
    schedule: unknown;
    isActive: boolean;
    annualFee: number | null;
    expiryDate: string | null;
    headInstructorId: string | null;
    headInstructor: { id: string; fullName: string; email: string } | null;
    _count: { members: number };
};

const fmtDate = new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
});

function daysUntil(iso: string | null): number | null {
    if (!iso) return null;
    const t = new Date(iso).getTime();
    if (Number.isNaN(t)) return null;
    return Math.ceil((t - Date.now()) / (1000 * 60 * 60 * 24));
}

export default function DojosAdminClient({
    dojos, instructors,
}: {
    dojos: Dojo[];
    instructors: Instructor[];
}) {
    const [search, setSearch] = useState("");
    const [activeFilter, setActiveFilter] = useState<"ALL" | "ACTIVE" | "INACTIVE">("ALL");
    const [creating, setCreating] = useState(false);
    const [editing, setEditing] = useState<Dojo | null>(null);
    const [toast, setToast] = useState<{ kind: "ok" | "err"; msg: string } | null>(null);

    const filtered = useMemo(() => {
        const q = search.trim().toLowerCase();
        return dojos.filter((d) => {
            if (activeFilter === "ACTIVE" && !d.isActive) return false;
            if (activeFilter === "INACTIVE" && d.isActive) return false;
            if (!q) return true;
            return (
                d.name.toLowerCase().includes(q) ||
                (d.city ?? "").toLowerCase().includes(q) ||
                (d.address ?? "").toLowerCase().includes(q) ||
                (d.headInstructor?.fullName ?? "").toLowerCase().includes(q)
            );
        });
    }, [dojos, search, activeFilter]);

    function flash(kind: "ok" | "err", msg: string) {
        setToast({ kind, msg });
        setTimeout(() => setToast(null), 4000);
    }

    return (
        <div className="max-w-7xl mx-auto">
            <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-6">
                <div>
                    <h1 className="text-2xl font-bold text-zinc-900">Dojos</h1>
                    <p className="text-sm text-zinc-500 mt-1">
                        {filtered.length} of {dojos.length} dojos
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    <a
                        href="/portal/admin/dojos/applications"
                        className="inline-flex items-center gap-2 bg-white hover:bg-zinc-50 text-zinc-700 text-sm font-semibold px-4 py-2.5 rounded-xl shadow-sm border border-zinc-200 transition-all"
                    >
                        Review applications
                    </a>
                    <button
                        onClick={() => setCreating(true)}
                        className="inline-flex items-center gap-2 bg-accent-red hover:bg-accent-red/90 text-white text-sm font-semibold px-4 py-2.5 rounded-xl shadow-sm transition-all"
                    >
                        <Plus size={16} />
                        Add Dojo
                    </button>
                </div>
            </div>

            {/* Filters */}
            <div className="flex flex-col md:flex-row gap-3 mb-6">
                <div className="relative flex-1">
                    <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
                    <input
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        placeholder="Search name, city, instructor…"
                        className="w-full pl-9 pr-3 py-2.5 text-sm bg-white border border-zinc-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-accent-red/30 focus:border-accent-red"
                    />
                </div>
                <div className="relative">
                    <select
                        value={activeFilter}
                        onChange={(e) => setActiveFilter(e.target.value as "ALL" | "ACTIVE" | "INACTIVE")}
                        className="appearance-none pl-3 pr-9 py-2.5 text-sm bg-white border border-zinc-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-accent-red/30 focus:border-accent-red min-w-[170px]"
                    >
                        <option value="ALL">All dojos</option>
                        <option value="ACTIVE">Active</option>
                        <option value="INACTIVE">Inactive</option>
                    </select>
                    <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 pointer-events-none" />
                </div>
            </div>

            {/* Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                {filtered.map((d) => (
                    <DojoCard
                        key={d.id}
                        dojo={d}
                        instructors={instructors}
                        onEdit={() => setEditing(d)}
                        onFlash={flash}
                    />
                ))}
                {filtered.length === 0 && (
                    <div className="col-span-full py-16 text-center text-sm text-zinc-400 bg-white border border-zinc-100 rounded-2xl">
                        No dojos match the current filters.
                    </div>
                )}
            </div>

            {(creating || editing) && (
                <DojoFormModal
                    dojo={editing}
                    instructors={instructors}
                    onClose={() => { setCreating(false); setEditing(null); }}
                    onFlash={flash}
                />
            )}

            {toast && (
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={`fixed bottom-6 right-6 z-50 flex items-center gap-2 px-4 py-3 rounded-xl shadow-lg text-sm font-medium ${
                        toast.kind === "ok" ? "bg-emerald-600 text-white" : "bg-red-600 text-white"
                    }`}
                >
                    {toast.kind === "ok" ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
                    {toast.msg}
                </motion.div>
            )}
        </div>
    );
}

function DojoCard({
    dojo, instructors, onEdit, onFlash,
}: {
    dojo: Dojo;
    instructors: Instructor[];
    onEdit: () => void;
    onFlash: (k: "ok" | "err", m: string) => void;
}) {
    const [isPending, startTransition] = useTransition();
    const [headId, setHeadId] = useState(dojo.headInstructorId ?? "");

    function assign(next: string) {
        const fd = new FormData();
        fd.set("id", dojo.id);
        fd.set("headInstructorId", next);
        startTransition(async () => {
            const res = await assignDojoInstructorAction(fd);
            if (res.ok) {
                setHeadId(next);
                onFlash("ok", next ? "Head instructor assigned." : "Instructor unassigned.");
            } else onFlash("err", res.error);
        });
    }

    function handleDelete() {
        if (!confirm(`Delete "${dojo.name}"? This cannot be undone.`)) return;
        const fd = new FormData();
        fd.set("id", dojo.id);
        startTransition(async () => {
            const res = await deleteDojoAction(fd);
            if (res.ok) onFlash("ok", "Dojo deleted.");
            else onFlash("err", res.error);
        });
    }

    return (
        <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            className={`bg-white border border-zinc-100 rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-all ${isPending ? "opacity-60" : ""}`}
        >
            <div className="p-5">
                <div className="flex items-start justify-between gap-3 mb-4">
                    <div className="flex items-start gap-3 min-w-0">
                        <div className="p-2.5 bg-zinc-900 rounded-xl flex-shrink-0">
                            <Building2 size={18} className="text-white" />
                        </div>
                        <div className="min-w-0">
                            <h3 className="font-bold text-zinc-900 truncate">{dojo.name}</h3>
                            {dojo.city && (
                                <p className="text-xs text-zinc-500 flex items-center gap-1 mt-0.5 truncate">
                                    <MapPin size={11} /> {dojo.city}
                                </p>
                            )}
                        </div>
                    </div>

                    {!dojo.isActive ? (
                        <span className="text-[10px] font-bold tracking-widest uppercase px-2 py-0.5 rounded-full bg-zinc-100 text-zinc-500 border border-zinc-200 flex items-center gap-1">
                            <Power size={9} /> Inactive
                        </span>
                    ) : (
                        <span className="text-[10px] font-bold tracking-widest uppercase px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                            Active
                        </span>
                    )}
                </div>

                <div className="space-y-2 text-sm">
                    {dojo.address && (
                        <p className="text-xs text-zinc-600 flex items-start gap-1.5">
                            <MapPin size={11} className="mt-0.5 flex-shrink-0 text-zinc-400" />
                            <span className="line-clamp-2">{dojo.address}</span>
                        </p>
                    )}
                    {dojo.phone && (
                        <p className="text-xs text-zinc-600 flex items-center gap-1.5">
                            <Phone size={11} className="text-zinc-400" /> {dojo.phone}
                        </p>
                    )}
                    {dojo.email && (
                        <p className="text-xs text-zinc-600 flex items-center gap-1.5 truncate">
                            <Mail size={11} className="text-zinc-400" /> {dojo.email}
                        </p>
                    )}
                    <p className="text-xs text-zinc-600 flex items-center gap-1.5">
                        <Users size={11} className="text-zinc-400" /> {dojo._count.members} members
                    </p>
                </div>

                <ExpiryRow dojo={dojo} onFlash={onFlash} />

                <div className="mt-4 pt-4 border-t border-zinc-100">
                    <p className="text-[10px] font-bold tracking-widest uppercase text-zinc-500 mb-2 flex items-center gap-1">
                        <UserCheck size={10} /> Head Instructor
                    </p>
                    <div className="relative">
                        <select
                            value={headId}
                            onChange={(e) => assign(e.target.value)}
                            disabled={isPending}
                            className="appearance-none w-full pl-3 pr-9 py-2 text-sm bg-zinc-50 border border-zinc-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-accent-red/30 focus:border-accent-red"
                        >
                            <option value="">— Unassigned —</option>
                            {instructors.map((i) => (
                                <option key={i.id} value={i.id}>
                                    {i.fullName} {i.role === "ADMIN" ? "(Admin)" : ""}
                                </option>
                            ))}
                        </select>
                        <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 pointer-events-none" />
                    </div>
                </div>

                <div className="flex items-center gap-2 mt-4">
                    <button
                        onClick={onEdit}
                        className="flex-1 inline-flex items-center justify-center gap-1.5 text-xs font-semibold text-zinc-700 hover:text-zinc-900 hover:bg-zinc-100 px-3 py-2 rounded-lg transition-colors border border-zinc-200"
                    >
                        <Pencil size={12} /> Edit
                    </button>
                    <button
                        onClick={handleDelete}
                        disabled={isPending}
                        className="inline-flex items-center justify-center text-xs font-semibold text-red-600 hover:text-red-800 hover:bg-red-50 px-3 py-2 rounded-lg transition-colors border border-red-100"
                    >
                        <Trash2 size={12} />
                    </button>
                </div>
            </div>
        </motion.div>
    );
}

function DojoFormModal({
    dojo, instructors, onClose, onFlash,
}: {
    dojo: Dojo | null;
    instructors: Instructor[];
    onClose: () => void;
    onFlash: (k: "ok" | "err", m: string) => void;
}) {
    const [isPending, startTransition] = useTransition();
    const isEdit = !!dojo;

    const [form, setForm] = useState({
        name: dojo?.name ?? "",
        address: dojo?.address ?? "",
        city: dojo?.city ?? "",
        phone: dojo?.phone ?? "",
        email: dojo?.email ?? "",
        latitude: dojo?.latitude != null ? String(dojo.latitude) : "",
        longitude: dojo?.longitude != null ? String(dojo.longitude) : "",
        headInstructorId: dojo?.headInstructorId ?? "",
        isActive: dojo?.isActive ?? true,
        schedule: dojo?.schedule
            ? (typeof dojo.schedule === "string" ? dojo.schedule : JSON.stringify(dojo.schedule, null, 2))
            : "",
    });

    function submit(e: React.FormEvent) {
        e.preventDefault();
        const fd = new FormData();
        if (dojo) fd.set("id", dojo.id);
        Object.entries(form).forEach(([k, v]) => {
            if (k === "isActive") {
                if (v) fd.set(k, "true");
            } else {
                fd.set(k, String(v ?? ""));
            }
        });

        startTransition(async () => {
            const res = isEdit ? await updateDojoAction(fd) : await createDojoAction(fd);
            if (res.ok) {
                onFlash("ok", isEdit ? "Dojo updated." : "Dojo created.");
                onClose();
            } else onFlash("err", res.error);
        });
    }

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm overflow-y-auto" onClick={onClose}>
            <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                onClick={(e) => e.stopPropagation()}
                className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden my-8"
            >
                <div className="px-6 py-5 border-b border-zinc-100 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-accent-red/10 rounded-xl">
                            <Building2 size={18} className="text-accent-red" />
                        </div>
                        <h2 className="text-lg font-bold text-zinc-900">
                            {isEdit ? "Edit dojo" : "New dojo"}
                        </h2>
                    </div>
                    <button onClick={onClose} className="p-1.5 rounded-lg text-zinc-400 hover:bg-zinc-100">
                        <X size={16} />
                    </button>
                </div>

                <form onSubmit={submit} className="p-6 space-y-4">
                    <Field label="Dojo name" required>
                        <input
                            type="text"
                            value={form.name}
                            onChange={(e) => setForm({ ...form, name: e.target.value })}
                            required
                            className={inputCls}
                        />
                    </Field>

                    <Field label="Address">
                        <textarea
                            value={form.address}
                            onChange={(e) => setForm({ ...form, address: e.target.value })}
                            rows={2}
                            className={inputCls}
                        />
                    </Field>

                    <div className="grid grid-cols-2 gap-4">
                        <Field label="City">
                            <input
                                type="text"
                                value={form.city}
                                onChange={(e) => setForm({ ...form, city: e.target.value })}
                                className={inputCls}
                            />
                        </Field>
                        <Field label="Phone">
                            <input
                                type="tel"
                                value={form.phone}
                                onChange={(e) => setForm({ ...form, phone: e.target.value })}
                                className={inputCls}
                            />
                        </Field>
                    </div>

                    <Field label="Email">
                        <input
                            type="email"
                            value={form.email}
                            onChange={(e) => setForm({ ...form, email: e.target.value })}
                            className={inputCls}
                        />
                    </Field>

                    <div className="grid grid-cols-2 gap-4">
                        <Field label="Latitude">
                            <input
                                type="number"
                                step="any"
                                value={form.latitude}
                                onChange={(e) => setForm({ ...form, latitude: e.target.value })}
                                placeholder="e.g. 23.8103"
                                className={inputCls}
                            />
                        </Field>
                        <Field label="Longitude">
                            <input
                                type="number"
                                step="any"
                                value={form.longitude}
                                onChange={(e) => setForm({ ...form, longitude: e.target.value })}
                                placeholder="e.g. 90.4125"
                                className={inputCls}
                            />
                        </Field>
                    </div>

                    <Field label="Head instructor">
                        <div className="relative">
                            <select
                                value={form.headInstructorId}
                                onChange={(e) => setForm({ ...form, headInstructorId: e.target.value })}
                                className={`appearance-none ${inputCls} pr-9`}
                            >
                                <option value="">— Unassigned —</option>
                                {instructors.map((i) => (
                                    <option key={i.id} value={i.id}>
                                        {i.fullName} {i.role === "ADMIN" ? "(Admin)" : "(Instructor)"}
                                    </option>
                                ))}
                            </select>
                            <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 pointer-events-none" />
                        </div>
                    </Field>

                    <Field label="Schedule (JSON or freeform)">
                        <textarea
                            value={form.schedule}
                            onChange={(e) => setForm({ ...form, schedule: e.target.value })}
                            rows={4}
                            placeholder={`e.g. { "monday": "6–8pm", "wednesday": "6–8pm" }`}
                            className={`${inputCls} font-mono text-xs`}
                        />
                    </Field>

                    <label className="flex items-center gap-3 cursor-pointer">
                        <input
                            type="checkbox"
                            checked={form.isActive}
                            onChange={(e) => setForm({ ...form, isActive: e.target.checked })}
                            className="w-4 h-4 rounded text-accent-red focus:ring-accent-red"
                        />
                        <span className="text-sm font-medium text-zinc-700">Dojo is active</span>
                    </label>

                    <div className="flex items-center gap-3 pt-2">
                        <button
                            type="button"
                            onClick={onClose}
                            className="flex-1 px-4 py-2.5 text-sm font-semibold text-zinc-700 hover:bg-zinc-100 rounded-xl transition-colors"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={isPending}
                            className="flex-1 px-4 py-2.5 text-sm font-semibold text-white bg-accent-red hover:bg-accent-red/90 disabled:opacity-50 rounded-xl transition-colors"
                        >
                            {isPending ? "Saving…" : isEdit ? "Save changes" : "Create dojo"}
                        </button>
                    </div>
                </form>
            </motion.div>
        </div>
    );
}

const inputCls = "w-full px-3 py-2.5 text-sm bg-zinc-50 border border-zinc-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-accent-red/30 focus:border-accent-red focus:bg-white";

function Field({ label, children, required }: { label: string; children: React.ReactNode; required?: boolean }) {
    return (
        <div>
            <label className="block text-xs font-bold tracking-widest uppercase text-zinc-500 mb-2">
                {label}{required && <span className="text-accent-red ml-1">*</span>}
            </label>
            {children}
        </div>
    );
}

function ExpiryRow({
    dojo,
    onFlash,
}: {
    dojo: Dojo;
    onFlash: (k: "ok" | "err", m: string) => void;
}) {
    const [isPending, startTransition] = useTransition();
    const days = daysUntil(dojo.expiryDate);
    const expiryLabel = dojo.expiryDate
        ? fmtDate.format(new Date(dojo.expiryDate))
        : "Not set";

    let tone: "ok" | "warn" | "danger" | "muted" = "muted";
    let badge = "No expiry";
    if (dojo.expiryDate) {
        if (days !== null && days < 0) {
            tone = "danger";
            badge = `Expired ${Math.abs(days)}d ago`;
        } else if (days !== null && days <= 30) {
            tone = "warn";
            badge = `${days}d left`;
        } else {
            tone = "ok";
            badge = days !== null ? `${days}d left` : "Active";
        }
    }

    const badgeCls =
        tone === "ok"
            ? "bg-emerald-50 text-emerald-700 border-emerald-200"
            : tone === "warn"
              ? "bg-amber-50 text-amber-700 border-amber-200"
              : tone === "danger"
                ? "bg-red-50 text-red-700 border-red-200"
                : "bg-zinc-50 text-zinc-500 border-zinc-200";

    function sendReminder() {
        startTransition(async () => {
            const res = await sendDojoRenewalReminderAction({ dojoId: dojo.id });
            if (res.ok) onFlash("ok", "Renewal reminder sent.");
            else onFlash("err", res.error);
        });
    }

    return (
        <div className="mt-4 pt-4 border-t border-zinc-100">
            <p className="text-[10px] font-bold tracking-widest uppercase text-zinc-500 mb-2 flex items-center gap-1">
                <Calendar size={10} /> Membership expires
            </p>
            <div className="flex items-center justify-between gap-2">
                <div className="min-w-0">
                    <p className="text-sm font-semibold text-zinc-900 truncate">
                        {expiryLabel}
                    </p>
                    <span
                        className={`inline-block mt-1 text-[10px] font-bold tracking-widest uppercase px-2 py-0.5 rounded-full border ${badgeCls}`}
                    >
                        {badge}
                    </span>
                </div>
                <button
                    type="button"
                    onClick={sendReminder}
                    disabled={isPending}
                    className="inline-flex items-center gap-1.5 text-xs font-semibold text-zinc-700 hover:text-accent-red hover:bg-red-50 border border-zinc-200 hover:border-red-200 px-3 py-2 rounded-lg transition-colors disabled:opacity-50 shrink-0"
                    title="Email the dojo owner a renewal reminder"
                >
                    {isPending ? (
                        <Loader2 size={12} className="animate-spin" />
                    ) : (
                        <Send size={12} />
                    )}
                    Send email
                </button>
            </div>
        </div>
    );
}
