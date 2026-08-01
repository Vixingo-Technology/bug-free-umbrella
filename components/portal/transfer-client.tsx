"use client";

import { useState, useTransition } from "react";
import { motion } from "motion/react";
import {
    ArrowRightLeft,
    AlertTriangle,
    Clock,
    Loader2,
    Building2,
    CreditCard,
    Shield,
    Sparkles,
    Tag,
} from "lucide-react";
import TiltCard from "@/components/portal/tilt-card";
import {
    createTransferRequestAction,
    cancelPendingTransferAction,
    previewTransferCouponAction,
} from "@/app/portal/transfer/actions";

type Dojo = { id: string; name: string };

type TransferStatus = "PENDING_PAYMENT" | "AWAITING_DOJO" | "AWAITING_ADMIN" | "APPROVED" | "DENIED" | "CANCELLED";

type ActiveRequest = {
    id: string;
    status: TransferStatus;
    dojoDecision: "PENDING" | "APPROVED" | "REJECTED";
    reason: string | null;
    dojoNote: string | null;
    adminNote: string | null;
    fromDojo: Dojo;
    toDojo: Dojo;
    createdAt: string;
    paidAt: string | null;
} | null;

type HistoryRow = {
    id: string;
    status: TransferStatus;
    dojoDecision: "PENDING" | "APPROVED" | "REJECTED";
    fromDojo: Dojo;
    toDojo: Dojo;
    createdAt: string;
    adminNote: string | null;
    dojoNote: string | null;
};

interface Props {
    fee: number;
    student: {
        fullName: string;
        membershipStatus: string;
        currentDojo: Dojo | null;
    };
    activeRequest: ActiveRequest;
    history: HistoryRow[];
    availableDojos: Array<{ id: string; name: string; city: string | null }>;
    canRequest: boolean;
}

const STATUS_LABEL: Record<string, string> = {
    PENDING_PAYMENT: "Awaiting payment",
    AWAITING_DOJO: "Awaiting dojo clearance",
    AWAITING_ADMIN: "Awaiting JKA admin",
    APPROVED: "Approved",
    DENIED: "Denied",
    CANCELLED: "Cancelled",
};

const STATUS_TONE: Record<string, string> = {
    PENDING_PAYMENT: "bg-zinc-100 text-zinc-700 border-zinc-200",
    AWAITING_DOJO: "bg-amber-50 text-amber-800 border-amber-200",
    AWAITING_ADMIN: "bg-blue-50 text-blue-800 border-blue-200",
    APPROVED: "bg-emerald-50 text-emerald-800 border-emerald-200",
    DENIED: "bg-red-50 text-red-800 border-red-200",
    CANCELLED: "bg-zinc-100 text-zinc-500 border-zinc-200",
};

function StatusPill({ status }: { status: string }) {
    return (
        <span
            className={`inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-semibold border ${STATUS_TONE[status] ?? "bg-zinc-100"}`}
        >
            {STATUS_LABEL[status] ?? status}
        </span>
    );
}

function Timeline({ req }: { req: NonNullable<ActiveRequest> }) {
    const steps = [
        { label: "Payment", done: req.status !== "PENDING_PAYMENT" },
        {
            label: "Dojo clearance",
            done:
                req.status === "AWAITING_ADMIN" ||
                (req.status as string) === "APPROVED" ||
                (req.status as string) === "DENIED",
            failed: req.dojoDecision === "REJECTED",
        },
        {
            label: "JKA admin",
            done: (req.status as string) === "APPROVED",
            failed: (req.status as string) === "DENIED",
        },
    ];
    return (
        <div className="flex items-center gap-2">
            {steps.map((s, i) => (
                <div key={i} className="flex items-center gap-2 flex-1">
                    <div
                        className={`h-2 rounded-full flex-1 ${
                            s.failed
                                ? "bg-red-400"
                                : s.done
                                    ? "bg-emerald-500"
                                    : "bg-zinc-200"
                        }`}
                        title={s.label}
                    />
                </div>
            ))}
        </div>
    );
}

export default function TransferClient({
    fee,
    student,
    activeRequest,
    history,
    availableDojos,
    canRequest,
}: Props) {
    const [isPending, startTransition] = useTransition();
    const [error, setError] = useState<string | null>(null);
    const [toDojoId, setToDojoId] = useState("");
    const [reason, setReason] = useState("");
    const [couponInput, setCouponInput] = useState("");
    const [couponPreview, setCouponPreview] = useState<{
        id: string;
        code: string;
        discountPercent: number;
        dojoName: string;
        discountAmount: number;
        finalAmount: number;
    } | null>(null);
    const [couponError, setCouponError] = useState<string | null>(null);
    const [checkingCoupon, startCouponCheck] = useTransition();

    const finalFee = couponPreview ? couponPreview.finalAmount : fee;
    const isFree = finalFee <= 0;

    function applyCoupon() {
        setCouponError(null);
        startCouponCheck(async () => {
            const res = await previewTransferCouponAction(couponInput);
            if ("error" in res) {
                setCouponError(res.error ?? "Failed to check coupon.");
                setCouponPreview(null);
            } else {
                setCouponPreview(res.preview);
            }
        });
    }

    function clearCoupon() {
        setCouponPreview(null);
        setCouponInput("");
        setCouponError(null);
    }

    function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        setError(null);
        if (!toDojoId) {
            setError("Please select a target dojo.");
            return;
        }
        startTransition(async () => {
            const res = await createTransferRequestAction({
                toDojoId,
                reason,
                couponCode: couponPreview?.code,
            });
            if (res?.error) setError(res.error);
        });
    }

    function handleCancel(requestId: string) {
        setError(null);
        startTransition(async () => {
            const res = await cancelPendingTransferAction(requestId);
            if (res?.error) setError(res.error ?? null);
        });
    }

    return (
        <div className="space-y-6 max-w-2xl">
            <div>
                <h1 className="text-2xl sm:text-3xl font-bold text-zinc-900 flex items-center gap-2">
                    <ArrowRightLeft size={22} className="text-accent-red" /> Transfer Dojo
                </h1>
                <p className="text-zinc-500 mt-1 text-sm">
                    Move your JKA membership from one dojo to another. A one-time fee of{" "}
                    ৳{fee.toLocaleString()} applies, and your current dojo must give
                    clearance before JKA admin approves the transfer.
                </p>
            </div>

            {error && (
                <div className="flex items-center gap-3 p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm">
                    <AlertTriangle size={16} className="flex-shrink-0" />
                    {error}
                </div>
            )}

            {activeRequest ? (
                <TiltCard delay={0.05} className="overflow-hidden">
                    <div className="px-6 py-5 border-b border-zinc-100 flex items-center justify-between">
                        <h2 className="text-sm font-bold text-zinc-900 flex items-center gap-2">
                            <Clock size={15} className="text-accent-red" /> Active request
                        </h2>
                        <StatusPill status={activeRequest.status} />
                    </div>

                    <div className="px-6 py-5 space-y-4">
                        <div className="flex items-center justify-between text-sm">
                            <span className="text-zinc-500 flex items-center gap-1.5">
                                <Building2 size={13} /> From
                            </span>
                            <span className="font-semibold text-zinc-900">{activeRequest.fromDojo.name}</span>
                        </div>
                        <div className="flex items-center justify-between text-sm">
                            <span className="text-zinc-500 flex items-center gap-1.5">
                                <Building2 size={13} /> To
                            </span>
                            <span className="font-semibold text-zinc-900">{activeRequest.toDojo.name}</span>
                        </div>

                        <Timeline req={activeRequest} />

                        {activeRequest.reason && (
                            <div className="text-xs text-zinc-500 pt-2 border-t border-zinc-100">
                                <span className="font-semibold text-zinc-700">Your reason:</span>{" "}
                                {activeRequest.reason}
                            </div>
                        )}

                        {activeRequest.dojoNote && (
                            <div className={`text-xs pt-2 border-t border-zinc-100 ${
                                activeRequest.dojoDecision === "REJECTED" ? "text-red-700" : "text-zinc-600"
                            }`}>
                                <span className="font-semibold">
                                    {activeRequest.dojoDecision === "REJECTED"
                                        ? "Dojo rejected clearance:"
                                        : "Dojo note:"}
                                </span>{" "}
                                {activeRequest.dojoNote}
                            </div>
                        )}

                        {activeRequest.status === "PENDING_PAYMENT" && (
                            <div className="pt-2 border-t border-zinc-100 flex items-center justify-end">
                                <button
                                    onClick={() => handleCancel(activeRequest.id)}
                                    disabled={isPending}
                                    className="text-xs text-zinc-500 hover:text-red-600 disabled:opacity-60"
                                >
                                    Cancel request
                                </button>
                            </div>
                        )}
                    </div>
                </TiltCard>
            ) : canRequest ? (
                <TiltCard delay={0.05} className="overflow-hidden">
                    <form onSubmit={handleSubmit} className="space-y-5 p-6">
                        <div>
                            <label className="block text-xs font-semibold text-zinc-700 mb-2">
                                Current dojo
                            </label>
                            <div className="text-sm font-medium text-zinc-900">
                                {student.currentDojo?.name ?? "—"}
                            </div>
                        </div>

                        <div>
                            <label
                                htmlFor="toDojo"
                                className="block text-xs font-semibold text-zinc-700 mb-2"
                            >
                                Target dojo
                            </label>
                            <select
                                id="toDojo"
                                value={toDojoId}
                                onChange={(e) => setToDojoId(e.target.value)}
                                className="w-full rounded-xl border border-zinc-200 px-3 py-2.5 text-sm focus:outline-none focus:border-accent-red"
                                required
                            >
                                <option value="">Select a dojo…</option>
                                {availableDojos.map((d) => (
                                    <option key={d.id} value={d.id}>
                                        {d.name}
                                        {d.city ? ` — ${d.city}` : ""}
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div>
                            <label
                                htmlFor="reason"
                                className="block text-xs font-semibold text-zinc-700 mb-2"
                            >
                                Reason (optional)
                            </label>
                            <textarea
                                id="reason"
                                value={reason}
                                onChange={(e) => setReason(e.target.value)}
                                rows={3}
                                className="w-full rounded-xl border border-zinc-200 px-3 py-2 text-sm focus:outline-none focus:border-accent-red"
                                placeholder="Why do you want to transfer?"
                            />
                        </div>

                        <div>
                            <label className="text-xs font-semibold text-zinc-700 mb-1.5 flex items-center gap-1.5">
                                <Tag size={12} /> Coupon from your dojo (optional)
                            </label>
                            {couponPreview ? (
                                <div className="flex items-center justify-between p-3 rounded-xl border border-emerald-200 bg-emerald-50">
                                    <div>
                                        <p className="text-xs font-bold text-emerald-800">
                                            {couponPreview.code} — {couponPreview.discountPercent}% off
                                        </p>
                                        <p className="text-[11px] text-emerald-700">
                                            Issued by {couponPreview.dojoName}
                                        </p>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={clearCoupon}
                                        className="text-emerald-700 hover:text-emerald-900 text-xs font-semibold underline"
                                    >
                                        Remove
                                    </button>
                                </div>
                            ) : (
                                <div className="flex gap-2">
                                    <input
                                        value={couponInput}
                                        onChange={(e) => setCouponInput(e.target.value.toUpperCase())}
                                        placeholder="Enter coupon code"
                                        className="flex-1 rounded-xl border border-zinc-200 focus:border-accent-red focus:ring-1 focus:ring-accent-red/30 text-sm px-3 py-2.5 font-mono uppercase tracking-wider"
                                    />
                                    <button
                                        type="button"
                                        onClick={applyCoupon}
                                        disabled={checkingCoupon || !couponInput.trim()}
                                        className="px-4 py-2.5 rounded-xl border border-zinc-200 hover:border-accent-red/40 text-sm font-semibold text-zinc-800 disabled:opacity-50"
                                    >
                                        {checkingCoupon ? <Loader2 size={14} className="animate-spin" /> : "Apply"}
                                    </button>
                                </div>
                            )}
                            {couponError && (
                                <p className="text-xs text-red-600 mt-1.5">{couponError}</p>
                            )}
                        </div>

                        <div className="rounded-xl border border-zinc-100 bg-zinc-50 p-4 space-y-1.5 text-sm">
                            <div className="flex justify-between text-zinc-700">
                                <span>Transfer fee</span>
                                <span>৳{fee.toLocaleString()}</span>
                            </div>
                            {couponPreview && (
                                <div className="flex justify-between text-emerald-700">
                                    <span>Coupon ({couponPreview.discountPercent}%)</span>
                                    <span>−৳{couponPreview.discountAmount.toLocaleString()}</span>
                                </div>
                            )}
                            <div className="flex justify-between pt-2 border-t border-zinc-200 font-bold text-zinc-900">
                                <span>Total</span>
                                <span>{isFree ? "Free" : `৳${finalFee.toLocaleString()}`}</span>
                            </div>
                        </div>

                        <button
                            type="submit"
                            disabled={isPending}
                            className="w-full flex items-center justify-center gap-2.5 bg-zinc-900 hover:bg-accent-red text-white font-bold text-sm py-3.5 rounded-xl transition-colors disabled:opacity-60 shadow-sm"
                        >
                            {isPending ? (
                                <>
                                    <Loader2 size={16} className="animate-spin" />
                                    Submitting…
                                </>
                            ) : isFree ? (
                                <>
                                    <Sparkles size={16} />
                                    Submit request (free)
                                </>
                            ) : (
                                <>
                                    <CreditCard size={16} />
                                    Continue to payment (৳{finalFee.toLocaleString()})
                                </>
                            )}
                        </button>
                    </form>
                </TiltCard>
            ) : (
                <TiltCard delay={0.05} className="overflow-hidden">
                    <div className="p-6 flex items-start gap-3">
                        <AlertTriangle size={18} className="text-amber-500 flex-shrink-0 mt-0.5" />
                        <div className="text-sm text-zinc-700 space-y-1">
                            <p className="font-semibold text-zinc-900">Transfer not available</p>
                            {!student.currentDojo ? (
                                <p>You are not currently assigned to a dojo. Contact JKA admin.</p>
                            ) : student.membershipStatus !== "ACTIVE" ? (
                                <p>An active JKA membership is required to request a transfer.</p>
                            ) : (
                                <p>You already have an open transfer request.</p>
                            )}
                        </div>
                    </div>
                </TiltCard>
            )}

            {history.length > 0 && (
                <TiltCard delay={0.1} className="overflow-hidden">
                    <div className="px-6 py-5 border-b border-zinc-100">
                        <h2 className="text-sm font-bold text-zinc-900">Past requests</h2>
                    </div>
                    <div className="divide-y divide-zinc-100">
                        {history.map((h) => (
                            <div key={h.id} className="px-6 py-4 flex items-center justify-between text-sm">
                                <div className="min-w-0">
                                    <div className="font-medium text-zinc-900 truncate">
                                        {h.fromDojo.name} → {h.toDojo.name}
                                    </div>
                                    <div className="text-xs text-zinc-500">
                                        {new Date(h.createdAt).toLocaleDateString("en-GB", {
                                            day: "numeric",
                                            month: "long",
                                            year: "numeric",
                                        })}
                                    </div>
                                </div>
                                <StatusPill status={h.status} />
                            </div>
                        ))}
                    </div>
                </TiltCard>
            )}

            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.2 }}
                className="flex items-center justify-center gap-2 text-xs text-zinc-400"
            >
                <Shield size={13} /> Secured by SSLCommerz · bKash · Nagad · Cards
            </motion.div>
        </div>
    );
}
