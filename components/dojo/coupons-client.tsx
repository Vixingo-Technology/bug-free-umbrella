"use client";

import { useState, useTransition } from "react";
import { Copy, Loader2, Plus, Ticket, XCircle } from "lucide-react";
import {
    createServiceCouponAction,
    deactivateCouponAction,
} from "@/app/portal/dojo/coupons/actions";

type Service = { id: string; name: string; feeBDT: number };

type Coupon = {
    id: string;
    code: string;
    discountPercent: number;
    serviceId: string | null;
    usageLimit: number;
    usedCount: number;
    expiresAt: string | null;
    isActive: boolean;
    notes: string | null;
    createdAt: string;
    service: { name: string } | null;
};

export default function DojoCouponsClient({
    services,
    coupons,
}: {
    services: Service[];
    coupons: Coupon[];
}) {
    const [showForm, setShowForm] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [isPending, startTransition] = useTransition();

    const [discountPercent, setDiscountPercent] = useState("100");
    const [serviceId, setServiceId] = useState<string>("");
    const [usageLimit, setUsageLimit] = useState("1");
    const [expiresAt, setExpiresAt] = useState("");
    const [notes, setNotes] = useState("");

    function submit() {
        setError(null);
        const disc = Number(discountPercent);
        if (!(disc >= 1 && disc <= 100)) {
            setError("Discount must be 1–100%.");
            return;
        }
        startTransition(async () => {
            const res = await createServiceCouponAction({
                discountPercent: disc,
                serviceId: serviceId || null,
                usageLimit: Number(usageLimit) || 1,
                expiresAt: expiresAt || null,
                notes: notes.trim() || undefined,
            });
            if (res && "error" in res && res.error) {
                setError(res.error);
                return;
            }
            setShowForm(false);
            setDiscountPercent("100");
            setServiceId("");
            setUsageLimit("1");
            setExpiresAt("");
            setNotes("");
        });
    }

    function toggle(id: string) {
        startTransition(async () => {
            await deactivateCouponAction(id);
        });
    }

    function copy(code: string) {
        navigator.clipboard?.writeText(code);
    }

    return (
        <div className="space-y-6">
            <div className="flex justify-end">
                <button
                    onClick={() => setShowForm((s) => !s)}
                    className="inline-flex items-center gap-2 bg-zinc-900 hover:bg-accent-red text-white text-xs font-bold uppercase tracking-widest px-4 py-2.5 rounded-xl transition"
                >
                    <Plus size={14} /> New coupon
                </button>
            </div>

            {showForm && (
                <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm space-y-4">
                    <h2 className="text-sm font-bold text-zinc-900">Create coupon</h2>

                    <div className="grid gap-4 sm:grid-cols-2">
                        <div>
                            <label className="text-xs font-semibold text-zinc-700 mb-1.5 block">
                                Discount (%)
                            </label>
                            <input
                                type="number"
                                min={1}
                                max={100}
                                value={discountPercent}
                                onChange={(e) => setDiscountPercent(e.target.value)}
                                className="w-full rounded-xl border border-zinc-200 text-sm px-3 py-2.5 focus:border-accent-red focus:ring-1 focus:ring-accent-red/30"
                            />
                            <p className="text-[11px] text-zinc-500 mt-1">Set 100 to fully cover the fee.</p>
                        </div>
                        <div>
                            <label className="text-xs font-semibold text-zinc-700 mb-1.5 block">
                                Service (optional)
                            </label>
                            <select
                                value={serviceId}
                                onChange={(e) => setServiceId(e.target.value)}
                                className="w-full rounded-xl border border-zinc-200 text-sm px-3 py-2.5 focus:border-accent-red focus:ring-1 focus:ring-accent-red/30"
                            >
                                <option value="">Any service</option>
                                {services.map((s) => (
                                    <option key={s.id} value={s.id}>
                                        {s.name} (৳{s.feeBDT.toLocaleString()})
                                    </option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label className="text-xs font-semibold text-zinc-700 mb-1.5 block">
                                Usage limit
                            </label>
                            <input
                                type="number"
                                min={1}
                                value={usageLimit}
                                onChange={(e) => setUsageLimit(e.target.value)}
                                className="w-full rounded-xl border border-zinc-200 text-sm px-3 py-2.5 focus:border-accent-red focus:ring-1 focus:ring-accent-red/30"
                            />
                        </div>
                        <div>
                            <label className="text-xs font-semibold text-zinc-700 mb-1.5 block">
                                Expires (optional)
                            </label>
                            <input
                                type="date"
                                value={expiresAt}
                                onChange={(e) => setExpiresAt(e.target.value)}
                                className="w-full rounded-xl border border-zinc-200 text-sm px-3 py-2.5 focus:border-accent-red focus:ring-1 focus:ring-accent-red/30"
                            />
                        </div>
                    </div>

                    <div>
                        <label className="text-xs font-semibold text-zinc-700 mb-1.5 block">
                            Internal notes (optional)
                        </label>
                        <input
                            value={notes}
                            onChange={(e) => setNotes(e.target.value)}
                            placeholder="Who this coupon is for, why, etc."
                            className="w-full rounded-xl border border-zinc-200 text-sm px-3 py-2.5 focus:border-accent-red focus:ring-1 focus:ring-accent-red/30"
                        />
                    </div>

                    {error && (
                        <div className="flex items-center gap-2 p-3 rounded-xl border border-red-200 bg-red-50 text-xs text-red-700">
                            <XCircle size={14} />
                            {error}
                        </div>
                    )}

                    <div className="flex gap-2">
                        <button
                            onClick={submit}
                            disabled={isPending}
                            className="inline-flex items-center gap-2 bg-zinc-900 hover:bg-accent-red text-white text-xs font-bold uppercase tracking-widest px-4 py-2.5 rounded-xl transition disabled:opacity-60"
                        >
                            {isPending ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
                            Create
                        </button>
                        <button
                            onClick={() => setShowForm(false)}
                            className="text-xs text-zinc-500 hover:text-zinc-900 px-3"
                        >
                            Cancel
                        </button>
                    </div>
                </div>
            )}

            <div className="rounded-2xl border border-zinc-200 bg-white overflow-hidden">
                {coupons.length === 0 ? (
                    <div className="p-12 text-center text-sm text-zinc-500">
                        <Ticket className="mx-auto mb-3 text-zinc-300" size={32} />
                        You haven't issued any coupons yet.
                    </div>
                ) : (
                    <table className="w-full text-sm">
                        <thead className="bg-zinc-50 text-[11px] uppercase tracking-widest text-zinc-500">
                            <tr>
                                <th className="text-left px-4 py-3">Code</th>
                                <th className="text-left px-4 py-3">Discount</th>
                                <th className="text-left px-4 py-3">Service</th>
                                <th className="text-left px-4 py-3">Uses</th>
                                <th className="text-left px-4 py-3">Expires</th>
                                <th className="text-left px-4 py-3">Status</th>
                                <th className="text-right px-4 py-3"></th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-zinc-100">
                            {coupons.map((c) => (
                                <tr key={c.id}>
                                    <td className="px-4 py-3">
                                        <button
                                            onClick={() => copy(c.code)}
                                            className="inline-flex items-center gap-2 font-mono text-xs bg-zinc-100 hover:bg-zinc-200 px-2.5 py-1 rounded"
                                            title="Copy"
                                        >
                                            {c.code} <Copy size={11} />
                                        </button>
                                    </td>
                                    <td className="px-4 py-3 font-semibold">{c.discountPercent}%</td>
                                    <td className="px-4 py-3 text-zinc-600">
                                        {c.service?.name ?? "Any service"}
                                    </td>
                                    <td className="px-4 py-3 text-zinc-600">
                                        {c.usedCount} / {c.usageLimit}
                                    </td>
                                    <td className="px-4 py-3 text-zinc-600">
                                        {c.expiresAt ? new Date(c.expiresAt).toLocaleDateString() : "Never"}
                                    </td>
                                    <td className="px-4 py-3">
                                        <span
                                            className={`inline-flex px-2 py-0.5 rounded-full text-[11px] font-semibold ${
                                                c.isActive
                                                    ? "bg-emerald-100 text-emerald-800"
                                                    : "bg-zinc-100 text-zinc-500"
                                            }`}
                                        >
                                            {c.isActive ? "Active" : "Inactive"}
                                        </span>
                                    </td>
                                    <td className="px-4 py-3 text-right">
                                        <button
                                            onClick={() => toggle(c.id)}
                                            disabled={isPending}
                                            className="text-xs text-zinc-500 hover:text-zinc-900 disabled:opacity-50"
                                        >
                                            {c.isActive ? "Deactivate" : "Reactivate"}
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>
        </div>
    );
}
