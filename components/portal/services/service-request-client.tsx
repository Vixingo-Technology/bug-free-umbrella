"use client";

import { useState, useTransition } from "react";
import { motion, AnimatePresence } from "motion/react";
import Link from "next/link";
import {
    AlertTriangle,
    Award,
    CheckCircle2,
    Clock,
    CreditCard,
    Loader2,
    Sparkles,
    Tag,
    X,
    XCircle,
} from "lucide-react";
import TiltCard from "@/components/portal/tilt-card";
import {
    cancelServiceRequestAction,
    createServiceRequestAction,
    previewServiceCouponAction,
} from "@/app/portal/services/[slug]/actions";
import { BELT_RANKS_ORDERED, formatBeltRank } from "@/lib/constants";

type Status = "PENDING_PAYMENT" | "AWAITING_DOJO" | "AWAITING_ADMIN" | "APPROVED" | "DENIED" | "CANCELLED";

type ActiveRequest = {
    id: string;
    status: Status;
    dojoDecision: "PENDING" | "APPROVED" | "REJECTED";
    reason: string | null;
    dojoNote: string | null;
    adminNote: string | null;
    fee: string;
    discountAmount: string;
    finalAmount: string;
    couponCode: string | null;
    createdAt: string;
    payload: Record<string, unknown> | null;
    service: { name: string };
    order: { id: string } | null;
} | null;

type HistoryRow = {
    id: string;
    status: Status;
    couponCode: string | null;
    createdAt: string;
    adminNote: string | null;
    dojoNote: string | null;
    finalAmount: string;
    service: { name: string };
};

type CouponPreview = {
    id: string;
    code: string;
    discountPercent: number;
    dojoName: string;
    discountAmount: number;
    finalAmount: number;
};

interface Props {
    service: {
        id: string;
        slug: string;
        name: string;
        description: string | null;
        fee: number;
        handler: string;
    };
    student: {
        fullName: string;
        membershipStatus: string;
        currentRank: string | null;
        dojo: { id: string; name: string } | null;
    };
    activeRequest: ActiveRequest;
    history: HistoryRow[];
    canRequest: boolean;
    justCompletedFree: boolean;
    paymentStatus?: "success" | "failed" | null;
    paymentReason?: string | null;
    retryCheckoutUrl?: string | null;
}

const STATUS_LABEL: Record<Status, string> = {
    PENDING_PAYMENT: "Awaiting payment",
    AWAITING_DOJO: "Awaiting dojo review",
    AWAITING_ADMIN: "Awaiting JKA HQ",
    APPROVED: "Approved",
    DENIED: "Denied",
    CANCELLED: "Cancelled",
};

const STATUS_TONE: Record<Status, string> = {
    PENDING_PAYMENT: "bg-zinc-100 text-zinc-700 border-zinc-200",
    AWAITING_DOJO: "bg-amber-50 text-amber-800 border-amber-200",
    AWAITING_ADMIN: "bg-blue-50 text-blue-800 border-blue-200",
    APPROVED: "bg-emerald-50 text-emerald-800 border-emerald-200",
    DENIED: "bg-red-50 text-red-800 border-red-200",
    CANCELLED: "bg-zinc-100 text-zinc-500 border-zinc-200",
};

function StatusPill({ status }: { status: Status }) {
    return (
        <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-semibold border ${STATUS_TONE[status]}`}>
            {STATUS_LABEL[status]}
        </span>
    );
}

export default function ServiceRequestClient({
    service,
    student,
    activeRequest,
    history,
    canRequest,
    justCompletedFree,
    paymentStatus,
    paymentReason,
    retryCheckoutUrl,
}: Props) {
    const [isPending, startTransition] = useTransition();
    const [error, setError] = useState<string | null>(null);

    const [reason, setReason] = useState("");
    const [requestedRank, setRequestedRank] = useState<string>("");

    const [couponInput, setCouponInput] = useState("");
    const [couponPreview, setCouponPreview] = useState<CouponPreview | null>(null);
    const [couponError, setCouponError] = useState<string | null>(null);
    const [checkingCoupon, startCouponCheck] = useTransition();

    const [showFreePopup, setShowFreePopup] = useState(justCompletedFree);
    const [showPaymentPopup, setShowPaymentPopup] = useState(
        paymentStatus === "success" || paymentStatus === "failed",
    );

    const isKyuDan = service.handler === "kyu-dan-conversion";
    const finalAmount = couponPreview ? couponPreview.finalAmount : service.fee;
    const isFree = finalAmount <= 0;

    function applyCoupon() {
        setCouponError(null);
        startCouponCheck(async () => {
            const res = await previewServiceCouponAction({
                serviceSlug: service.slug,
                couponCode: couponInput,
            });
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

    function submit() {
        setError(null);
        if (isKyuDan && !requestedRank) {
            setError("Please pick the rank you're converting to.");
            return;
        }
        const payload: Record<string, unknown> = isKyuDan
            ? { requestedRank, currentRank: student.currentRank }
            : {};
        startTransition(async () => {
            const res = await createServiceRequestAction({
                serviceSlug: service.slug,
                payload,
                reason: reason.trim() || undefined,
                couponCode: couponPreview?.code,
            });
            if (res && "error" in res) setError(res.error);
        });
    }

    function cancel(id: string) {
        setError(null);
        startTransition(async () => {
            const res = await cancelServiceRequestAction(id);
            if (res && "error" in res && res.error) setError(res.error ?? null);
        });
    }

    return (
        <div className="space-y-6 max-w-3xl">
            <div>
                <p className="text-[11px] uppercase tracking-[0.35em] text-accent-red">Service</p>
                <h1 className="text-2xl sm:text-3xl font-bold text-zinc-900 mt-1">{service.name}</h1>
                {service.description && (
                    <p className="text-zinc-500 mt-2 text-sm leading-relaxed max-w-2xl">
                        {service.description}
                    </p>
                )}
            </div>

            <AnimatePresence>
                {showPaymentPopup && paymentStatus && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-950/60 backdrop-blur-sm px-4"
                        onClick={() => setShowPaymentPopup(false)}
                    >
                        <motion.div
                            initial={{ opacity: 0, scale: 0.9, y: 20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            className="relative w-full max-w-md rounded-2xl bg-white shadow-2xl p-8 text-center"
                            onClick={(e) => e.stopPropagation()}
                        >
                            <button
                                onClick={() => setShowPaymentPopup(false)}
                                className="absolute top-3 right-3 p-1.5 rounded-full text-zinc-400 hover:text-zinc-900 hover:bg-zinc-100"
                            >
                                <X size={16} />
                            </button>
                            {paymentStatus === "success" ? (
                                <>
                                    <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100 text-emerald-600 mb-4">
                                        <CheckCircle2 size={32} />
                                    </div>
                                    <p className="text-[11px] uppercase tracking-[0.35em] text-emerald-600 mb-2">
                                        Payment received
                                    </p>
                                    <h2 className="text-2xl font-bold text-zinc-900">Thank you!</h2>
                                    <p className="mt-2 text-sm text-zinc-500">
                                        Your payment for <span className="font-semibold text-zinc-700">{service.name}</span> was successful. Your dojo will review the request next.
                                    </p>
                                    <button
                                        onClick={() => setShowPaymentPopup(false)}
                                        className="mt-6 w-full inline-flex items-center justify-center bg-zinc-900 hover:bg-accent-red text-white font-bold text-sm py-3 rounded-xl transition-colors"
                                    >
                                        Done
                                    </button>
                                </>
                            ) : (
                                <>
                                    <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-red-100 text-red-600 mb-4">
                                        <XCircle size={32} />
                                    </div>
                                    <p className="text-[11px] uppercase tracking-[0.35em] text-red-600 mb-2">
                                        Payment failed
                                    </p>
                                    <h2 className="text-2xl font-bold text-zinc-900">Payment didn't go through</h2>
                                    <p className="mt-2 text-sm text-zinc-500">
                                        {paymentReason?.trim() || "The payment gateway declined the transaction. No amount was charged."}
                                    </p>
                                    {retryCheckoutUrl ? (
                                        <Link
                                            href={retryCheckoutUrl}
                                            className="mt-6 w-full inline-flex items-center justify-center bg-zinc-900 hover:bg-accent-red text-white font-bold text-sm py-3 rounded-xl transition-colors"
                                        >
                                            Try again
                                        </Link>
                                    ) : (
                                        <button
                                            onClick={() => setShowPaymentPopup(false)}
                                            className="mt-6 w-full inline-flex items-center justify-center bg-zinc-900 hover:bg-accent-red text-white font-bold text-sm py-3 rounded-xl transition-colors"
                                        >
                                            Try again
                                        </button>
                                    )}
                                </>
                            )}
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            <AnimatePresence>
                {showFreePopup && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-950/60 backdrop-blur-sm px-4"
                        onClick={() => setShowFreePopup(false)}
                    >
                        <motion.div
                            initial={{ opacity: 0, scale: 0.9, y: 20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            className="relative w-full max-w-md rounded-2xl bg-white shadow-2xl p-8 text-center"
                            onClick={(e) => e.stopPropagation()}
                        >
                            <button
                                onClick={() => setShowFreePopup(false)}
                                className="absolute top-3 right-3 p-1.5 rounded-full text-zinc-400 hover:text-zinc-900 hover:bg-zinc-100"
                            >
                                <X size={16} />
                            </button>
                            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100 text-emerald-600 mb-4">
                                <Sparkles size={32} />
                            </div>
                            <p className="text-[11px] uppercase tracking-[0.35em] text-emerald-600 mb-2">
                                Coupon applied
                            </p>
                            <h2 className="text-2xl font-bold text-zinc-900">Request submitted — free of charge</h2>
                            <p className="mt-2 text-sm text-zinc-500">
                                Your coupon covered the full fee. Your dojo will review the request next.
                            </p>
                            <button
                                onClick={() => setShowFreePopup(false)}
                                className="mt-6 w-full inline-flex items-center justify-center bg-zinc-900 hover:bg-accent-red text-white font-bold text-sm py-3 rounded-xl transition-colors"
                            >
                                Done
                            </button>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {!canRequest && !activeRequest && (
                <div className="flex items-start gap-3 p-4 rounded-xl border border-amber-300 bg-amber-50">
                    <AlertTriangle size={18} className="flex-shrink-0 mt-0.5 text-amber-700" />
                    <div className="flex-1 min-w-0">
                        <p className="text-sm font-bold text-amber-800">Not eligible right now</p>
                        <p className="text-xs text-amber-700 mt-0.5">
                            {student.membershipStatus !== "ACTIVE"
                                ? "Your membership must be active to request a service."
                                : "You are not currently assigned to a dojo — contact JKA HQ."}
                        </p>
                    </div>
                </div>
            )}

            {activeRequest && (
                <TiltCard className="p-6">
                    <div className="flex items-start justify-between gap-3 mb-4">
                        <div>
                            <p className="text-[11px] uppercase tracking-[0.3em] text-zinc-500">Your active request</p>
                            <p className="text-sm font-semibold text-zinc-900 mt-1">
                                Submitted {new Date(activeRequest.createdAt).toLocaleDateString()}
                            </p>
                        </div>
                        <StatusPill status={activeRequest.status} />
                    </div>

                    <div className="grid gap-2 text-sm text-zinc-700 mb-4">
                        <div className="flex justify-between">
                            <span className="text-zinc-500">Fee</span>
                            <span>৳{Number(activeRequest.fee).toLocaleString()}</span>
                        </div>
                        {Number(activeRequest.discountAmount) > 0 && (
                            <div className="flex justify-between">
                                <span className="text-zinc-500">
                                    Discount {activeRequest.couponCode ? `(${activeRequest.couponCode})` : ""}
                                </span>
                                <span className="text-emerald-700">−৳{Number(activeRequest.discountAmount).toLocaleString()}</span>
                            </div>
                        )}
                        <div className="flex justify-between font-semibold border-t border-zinc-100 pt-2">
                            <span>Total paid</span>
                            <span>{Number(activeRequest.finalAmount) === 0 ? "Free" : `৳${Number(activeRequest.finalAmount).toLocaleString()}`}</span>
                        </div>
                    </div>

                    {activeRequest.dojoNote && (
                        <div className="p-3 rounded-lg bg-amber-50 border border-amber-200 text-xs text-amber-900 mb-2">
                            <span className="font-semibold">Dojo note:</span> {activeRequest.dojoNote}
                        </div>
                    )}
                    {activeRequest.adminNote && (
                        <div className="p-3 rounded-lg bg-blue-50 border border-blue-200 text-xs text-blue-900 mb-2">
                            <span className="font-semibold">JKA HQ note:</span> {activeRequest.adminNote}
                        </div>
                    )}

                    {activeRequest.status === "PENDING_PAYMENT" && (
                        <div className="flex gap-2 mt-4">
                            <Link
                                href={activeRequest.order ? `/portal/checkout?orderId=${activeRequest.order.id}` : "/portal/checkout"}
                                className="flex-1 text-center bg-zinc-900 hover:bg-accent-red text-white font-bold text-xs uppercase tracking-widest px-4 py-3 rounded-xl transition"
                            >
                                Continue to payment
                            </Link>
                            <button
                                onClick={() => cancel(activeRequest.id)}
                                disabled={isPending}
                                className="border border-zinc-200 hover:border-red-300 hover:bg-red-50 text-zinc-700 hover:text-red-700 font-bold text-xs uppercase tracking-widest px-4 py-3 rounded-xl transition disabled:opacity-50"
                            >
                                Cancel
                            </button>
                        </div>
                    )}
                </TiltCard>
            )}

            {canRequest && !activeRequest && (
                <TiltCard className="p-6">
                    <h2 className="text-sm font-bold text-zinc-900 flex items-center gap-2 mb-4">
                        <Award size={15} className="text-accent-red" />
                        Submit request
                    </h2>

                    <div className="space-y-4">
                        {isKyuDan && (
                            <div>
                                <label className="text-xs font-semibold text-zinc-700 mb-1.5 block">
                                    Rank you're converting to
                                </label>
                                <p className="text-xs text-zinc-500 mb-2">
                                    Current record: <span className="font-semibold text-zinc-900">{student.currentRank ? formatBeltRank(student.currentRank) : "—"}</span>
                                </p>
                                <select
                                    value={requestedRank}
                                    onChange={(e) => setRequestedRank(e.target.value)}
                                    className="w-full rounded-xl border border-zinc-200 focus:border-accent-red focus:ring-1 focus:ring-accent-red/30 text-sm px-3 py-2.5"
                                >
                                    <option value="">Pick a rank…</option>
                                    {BELT_RANKS_ORDERED.map((r) => (
                                        <option key={r} value={r}>{formatBeltRank(r)}</option>
                                    ))}
                                </select>
                            </div>
                        )}

                        <div>
                            <label className="text-xs font-semibold text-zinc-700 mb-1.5 block">
                                Reason / additional notes (optional)
                            </label>
                            <textarea
                                value={reason}
                                onChange={(e) => setReason(e.target.value)}
                                rows={3}
                                placeholder="Any context that will help your dojo review the request…"
                                className="w-full rounded-xl border border-zinc-200 focus:border-accent-red focus:ring-1 focus:ring-accent-red/30 text-sm px-3 py-2.5 resize-none"
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
                                <span>Service fee</span>
                                <span>৳{service.fee.toLocaleString()}</span>
                            </div>
                            {couponPreview && (
                                <div className="flex justify-between text-emerald-700">
                                    <span>Coupon ({couponPreview.discountPercent}%)</span>
                                    <span>−৳{couponPreview.discountAmount.toLocaleString()}</span>
                                </div>
                            )}
                            <div className="flex justify-between pt-2 border-t border-zinc-200 font-bold text-zinc-900">
                                <span>Total</span>
                                <span>{isFree ? "Free" : `৳${finalAmount.toLocaleString()}`}</span>
                            </div>
                        </div>

                        {error && (
                            <div className="flex items-start gap-2 p-3 rounded-xl border border-red-200 bg-red-50 text-xs text-red-700">
                                <XCircle size={14} className="mt-0.5 flex-shrink-0" />
                                <p>{error}</p>
                            </div>
                        )}

                        <button
                            onClick={submit}
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
                                    Continue to payment · ৳{finalAmount.toLocaleString()}
                                </>
                            )}
                        </button>
                    </div>
                </TiltCard>
            )}

            {history.length > 0 && (
                <TiltCard className="p-6">
                    <h2 className="text-sm font-bold text-zinc-900 flex items-center gap-2 mb-4">
                        <Clock size={15} className="text-zinc-500" />
                        Request history
                    </h2>
                    <ul className="space-y-3">
                        {history.map((h) => (
                            <li key={h.id} className="flex items-start justify-between gap-3 p-3 rounded-xl border border-zinc-100">
                                <div className="min-w-0 flex-1">
                                    <p className="text-sm font-semibold text-zinc-900">
                                        {new Date(h.createdAt).toLocaleDateString()}
                                    </p>
                                    <p className="text-xs text-zinc-500 mt-0.5">
                                        Total {Number(h.finalAmount) === 0 ? "Free" : `৳${Number(h.finalAmount).toLocaleString()}`}
                                        {h.couponCode ? ` · Coupon ${h.couponCode}` : ""}
                                    </p>
                                    {h.adminNote && (
                                        <p className="text-xs text-zinc-600 mt-1">Note: {h.adminNote}</p>
                                    )}
                                </div>
                                <StatusPill status={h.status} />
                            </li>
                        ))}
                    </ul>
                </TiltCard>
            )}

            <p className="text-xs text-zinc-400 text-center">
                Approved by {student.dojo?.name ?? "your dojo"} first, then JKA HQ.
            </p>
        </div>
    );
}
