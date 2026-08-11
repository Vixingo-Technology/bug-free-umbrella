"use client";

import { useTransition, useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import TiltCard from "@/components/portal/tilt-card";
import {
    RefreshCw, Calendar, CheckCircle2, AlertTriangle,
    XCircle, Clock, Loader2, Shield, CreditCard, X,
} from "lucide-react";
import { createRenewalOrderAction } from "@/app/portal/renew/actions";
import { DEFAULT_TIME_ZONE } from "@/lib/format/datetime";

type Feedback =
    | { kind: "success"; expiry: string | null }
    | { kind: "failed"; reason: string }
    | null;

interface Props {
    member: any;
    membershipFeeBDT: number;
    userId: string;
    feedback?: Feedback;
}

function ExpiryBanner({ member }: { member: any }) {
    if (!member) return null;

    const status: string = member.membershipStatus ?? "PENDING";
    const expiry = member.expiryDate ? new Date(member.expiryDate) : null;
    const today = new Date();
    const daysLeft = expiry
        ? Math.ceil((expiry.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
        : null;

    const expiryFormatted = expiry
        ? expiry.toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" ,
 timeZone: DEFAULT_TIME_ZONE,
})
        : null;

    if (status === "ACTIVE" && daysLeft !== null && daysLeft > 30) {
        return (
            <div className="flex items-center gap-3 p-4 rounded-xl bg-emerald-50 border border-emerald-200">
                <CheckCircle2 size={18} className="text-emerald-500 flex-shrink-0" />
                <div>
                    <p className="text-sm font-semibold text-emerald-800">Your membership is active.</p>
                    <p className="text-xs text-emerald-700 mt-0.5">
                        Expires {expiryFormatted} ({daysLeft} days remaining).
                        You can renew early to extend your membership.
                    </p>
                </div>
            </div>
        );
    }

    if (status === "ACTIVE" && daysLeft !== null && daysLeft <= 30) {
        return (
            <div className="flex items-center gap-3 p-4 rounded-xl bg-amber-50 border border-amber-200">
                <AlertTriangle size={18} className="text-amber-500 flex-shrink-0" />
                <div>
                    <p className="text-sm font-semibold text-amber-800">Membership expiring soon.</p>
                    <p className="text-xs text-amber-700 mt-0.5">
                        Expires {expiryFormatted} — {daysLeft} day{daysLeft !== 1 ? "s" : ""} left.
                        Renew now to avoid interruption.
                    </p>
                </div>
            </div>
        );
    }

    if (status === "EXPIRED" || (daysLeft !== null && daysLeft < 0)) {
        return (
            <div className="flex items-center gap-3 p-4 rounded-xl bg-red-50 border border-red-200">
                <XCircle size={18} className="text-red-500 flex-shrink-0" />
                <div>
                    <p className="text-sm font-semibold text-red-800">Your membership has expired.</p>
                    <p className="text-xs text-red-700 mt-0.5">
                        {expiryFormatted ? `Expired on ${expiryFormatted}.` : ""} Renew to restore full access.
                    </p>
                </div>
            </div>
        );
    }

    if (status === "PENDING") {
        return (
            <div className="flex items-center gap-3 p-4 rounded-xl bg-zinc-50 border border-zinc-200">
                <Clock size={18} className="text-zinc-400 flex-shrink-0" />
                <div>
                    <p className="text-sm font-semibold text-zinc-700">Membership pending activation.</p>
                    <p className="text-xs text-zinc-500 mt-0.5">
                        Complete your payment below to activate your membership.
                    </p>
                </div>
            </div>
        );
    }

    return null;
}

export default function RenewClient({ member, membershipFeeBDT, userId, feedback }: Props) {
    const [isPending, startTransition] = useTransition();
    const [error, setError] = useState<string | null>(null);
    const [popup, setPopup] = useState<Feedback>(feedback ?? null);

    useEffect(() => {
        setPopup(feedback ?? null);
    }, [feedback]);

    function closePopup() {
        setPopup(null);
        if (typeof window === "undefined") return;
        const url = new URL(window.location.href);
        ["status", "reason", "orderId", "expiry", "dev"].forEach((k) =>
            url.searchParams.delete(k),
        );
        // Full navigation (not replaceState) so the layout re-renders WITH
        // the auth cookie attached — SSLCommerz's cross-site redirect chain
        // can drop SameSite=Lax cookies on the first hop, which leaves the
        // portal sidebar hidden until we do a real GET.
        window.location.replace(
            url.pathname + (url.search ? url.search : ""),
        );
    }

    function handleRenew() {
        setError(null);
        startTransition(async () => {
            const res = await createRenewalOrderAction();
            if (res?.error) setError(res.error);
        });
    }

    const currentExpiry = member?.expiryDate ? new Date(member.expiryDate) : null;
    const renewedUntil = new Date(
        Math.max(currentExpiry?.getTime() ?? Date.now(), Date.now())
    );
    renewedUntil.setFullYear(renewedUntil.getFullYear() + 1);

    return (
        <div className="space-y-6 max-w-lg">
            <div>
                <h1 className="text-2xl sm:text-3xl font-bold text-zinc-900">Renew Membership</h1>
                <p className="text-zinc-500 mt-1 text-sm">
                    Keep your JKA Bangladesh membership active for another year.
                </p>
            </div>

            <ExpiryBanner member={member} />

            {error && (
                <div className="flex items-center gap-3 p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm">
                    <AlertTriangle size={16} className="flex-shrink-0" />
                    {error}
                </div>
            )}

            {/* Renewal summary card */}
            <TiltCard delay={0.1} className="overflow-hidden">
                <div className="px-6 py-5 border-b border-zinc-100">
                    <h2 className="text-sm font-bold text-zinc-900 flex items-center gap-2">
                        <RefreshCw size={15} className="text-accent-red" />
                        Renewal Summary
                    </h2>
                </div>

                <div className="px-6 py-5 space-y-4">
                    <div className="flex justify-between items-center text-sm">
                        <span className="text-zinc-500">Annual Membership Fee</span>
                        <span className="font-bold text-zinc-900">৳{membershipFeeBDT.toLocaleString()}</span>
                    </div>

                    <div className="flex justify-between items-center text-sm">
                        <span className="text-zinc-500 flex items-center gap-1.5">
                            <Calendar size={13} /> Valid Until
                        </span>
                        <span className="font-semibold text-zinc-900">
                            {renewedUntil.toLocaleDateString("en-GB", {
                                day: "numeric", month: "long", year: "numeric",
                            
                                timeZone: DEFAULT_TIME_ZONE,
                            })}
                        </span>
                    </div>

                    <div className="pt-2 border-t border-zinc-100 flex justify-between items-center">
                        <span className="text-sm font-bold text-zinc-900">Total</span>
                        <span className="text-lg font-bold text-accent-red">
                            ৳{membershipFeeBDT.toLocaleString()}
                        </span>
                    </div>
                </div>

                <div className="px-6 pb-6">
                    <button
                        onClick={handleRenew}
                        disabled={isPending}
                        className="w-full flex items-center justify-center gap-2.5 bg-zinc-900 hover:bg-accent-red text-white font-bold text-sm py-3.5 rounded-xl transition-colors disabled:opacity-60 shadow-sm"
                    >
                        {isPending ? (
                            <>
                                <Loader2 size={16} className="animate-spin" />
                                Preparing checkout…
                            </>
                        ) : (
                            <>
                                <CreditCard size={16} />
                                Proceed to Payment
                            </>
                        )}
                    </button>
                </div>
            </TiltCard>

            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.2 }}
                className="flex items-center justify-center gap-2 text-xs text-zinc-400"
            >
                <Shield size={13} />
                Secured by SSLCommerz · bKash · Nagad · Cards
            </motion.div>

            <RenewalPopup popup={popup} onClose={closePopup} />
        </div>
    );
}

function RenewalPopup({
    popup,
    onClose,
}: {
    popup: Feedback;
    onClose: () => void;
}) {
    return (
        <AnimatePresence>
            {popup && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-950/60 backdrop-blur-sm px-4"
                    onClick={onClose}
                >
                    <motion.div
                        initial={{ opacity: 0, scale: 0.9, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        transition={{ type: "spring", stiffness: 220, damping: 22 }}
                        className="relative w-full max-w-md rounded-2xl bg-white shadow-2xl overflow-hidden"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <button
                            type="button"
                            onClick={onClose}
                            className="absolute top-3 right-3 p-1.5 rounded-full text-zinc-400 hover:text-zinc-900 hover:bg-zinc-100 transition"
                            aria-label="Close"
                        >
                            <X size={16} />
                        </button>
                        {popup.kind === "success" ? (
                            <div className="p-8 text-center">
                                <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100 text-emerald-600 mb-4">
                                    <CheckCircle2 size={36} />
                                </div>
                                <p className="text-[11px] uppercase tracking-[0.35em] text-emerald-600 mb-2">
                                    Payment successful
                                </p>
                                <h2 className="text-2xl font-bold text-zinc-900">
                                    Thank you!
                                </h2>
                                <p className="mt-2 text-sm text-zinc-500">
                                    Your membership has been renewed.
                                </p>
                                {popup.expiry && (
                                    <div className="mt-6 rounded-xl bg-zinc-50 border border-zinc-200 px-4 py-3">
                                        <p className="text-[10px] uppercase tracking-widest text-zinc-500">
                                            Valid until
                                        </p>
                                        <p className="mt-1 text-lg font-bold text-zinc-900">
                                            {new Date(popup.expiry).toLocaleDateString(
                                                "en-GB",
                                                {
                                                    day: "numeric",
                                                    month: "long",
                                                    year: "numeric",
                                                
                                                    timeZone: DEFAULT_TIME_ZONE,
                                                },
                                            )}
                                        </p>
                                    </div>
                                )}
                                <button
                                    type="button"
                                    onClick={onClose}
                                    className="mt-6 w-full inline-flex items-center justify-center bg-zinc-900 hover:bg-accent-red text-white font-bold text-sm py-3 rounded-xl transition-colors"
                                >
                                    Done
                                </button>
                            </div>
                        ) : (
                            <div className="p-8 text-center">
                                <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-red-100 text-red-600 mb-4">
                                    <XCircle size={36} />
                                </div>
                                <p className="text-[11px] uppercase tracking-[0.35em] text-red-600 mb-2">
                                    Renewal failed
                                </p>
                                <h2 className="text-2xl font-bold text-zinc-900">
                                    Payment did not go through
                                </h2>
                                <p className="mt-2 text-sm text-zinc-500">
                                    {popup.reason}
                                </p>
                                <button
                                    type="button"
                                    onClick={onClose}
                                    className="mt-6 w-full inline-flex items-center justify-center bg-zinc-900 hover:bg-accent-red text-white font-bold text-sm py-3 rounded-xl transition-colors"
                                >
                                    Try again
                                </button>
                            </div>
                        )}
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    );
}
