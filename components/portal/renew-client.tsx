"use client";

import { useTransition, useState } from "react";
import { motion } from "motion/react";
import {
    RefreshCw, Calendar, CheckCircle2, AlertTriangle,
    XCircle, Clock, Loader2, Shield, CreditCard,
} from "lucide-react";
import { createRenewalOrderAction } from "@/app/portal/renew/actions";

interface Props {
    member: any;
    membershipFeeBDT: number;
    userId: string;
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
        ? expiry.toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })
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

export default function RenewClient({ member, membershipFeeBDT, userId }: Props) {
    const [isPending, startTransition] = useTransition();
    const [error, setError] = useState<string | null>(null);

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
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="bg-white rounded-2xl border border-zinc-100 shadow-sm overflow-hidden"
            >
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
            </motion.div>

            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.2 }}
                className="flex items-center justify-center gap-2 text-xs text-zinc-400"
            >
                <Shield size={13} />
                Secured by SSLCommerz · bKash · Nagad · Cards
            </motion.div>
        </div>
    );
}
