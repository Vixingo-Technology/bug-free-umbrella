"use client";

import { useTransition, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import Link from "next/link";
import {
    Calendar,
    CheckCircle2,
    Circle,
    Clock,
    CreditCard,
    Download,
    FileText,
    MapPin,
    RefreshCw,
    Shield,
    Loader2,
    XCircle,
    X,
} from "lucide-react";
import TiltCard from "./tilt-card";
import { startMembershipPaymentAction } from "@/app/portal/joining/actions";

type JoinStage = "FEE_UNPAID" | "AWAITING_APPROVAL" | "PAST_BELT_UNPAID" | "JOINED";

type Feedback =
    | { kind: "success"; joinStage: JoinStage | null; authenticated: boolean }
    | { kind: "failed"; reason: string }
    | null;

type Member = {
    fullName: string;
    email: string | null;
    phone: string | null;
    memberNumber: string | null;
    joinStage: JoinStage;
    requestedRank: string | null;
    assignedRank: string | null;
    pastBeltFeeBDT: number | null;
    dojo: {
        id: string;
        name: string;
        city: string | null;
        address: string | null;
        latitude: number | null;
        longitude: number | null;
    } | null;
};

const STEPS: { key: JoinStage; label: string; desc: string }[] = [
    { key: "FEE_UNPAID",        label: "Membership fee", desc: "Pay the JKA annual membership fee to begin." },
    { key: "AWAITING_APPROVAL", label: "Visit your dojo", desc: "Take the joining slip and required documents to your dojo." },
    { key: "JOINED",            label: "Joined",          desc: "Full portal access unlocked." },
];

function stepStatus(current: JoinStage, step: JoinStage): "done" | "current" | "upcoming" {
    // PAST_BELT_UNPAID no longer surfaces in the joining UI; legacy rows in
    // that stage are treated as still awaiting-approval so the stepper works.
    const order: JoinStage[] = ["FEE_UNPAID", "AWAITING_APPROVAL", "JOINED"];
    const normalized: JoinStage = current === "PAST_BELT_UNPAID" ? "AWAITING_APPROVAL" : current;
    const c = order.indexOf(normalized);
    const s = order.indexOf(step);
    if (s < c) return "done";
    if (s === c) return "current";
    return "upcoming";
}

export default function JoiningClient({
    member,
    membershipFeeBDT,
    postPaymentStatus = null,
    postPaymentReason = null,
    authenticated = true,
}: {
    member: Member | null;
    membershipFeeBDT: number;
    postPaymentStatus?: "success" | "failed" | null;
    postPaymentReason?: string | null;
    authenticated?: boolean;
}) {
    const [payingMembership, startMembership] = useTransition();

    const feedback: Feedback =
        postPaymentStatus === "success"
            ? { kind: "success", joinStage: member?.joinStage ?? null, authenticated }
            : postPaymentStatus === "failed"
                ? {
                      kind: "failed",
                      reason:
                          postPaymentReason ??
                          "The payment gateway declined the transaction.",
                  }
                : null;

    const [popup, setPopup] = useState<Feedback>(feedback);

    function closePopup() {
        setPopup(null);
        if (typeof window === "undefined") return;
        const url = new URL(window.location.href);
        ["status", "reason", "orderId", "dev"].forEach((k) =>
            url.searchParams.delete(k),
        );
        // Full navigation (not replaceState) so the layout re-renders WITH
        // the auth cookie attached — SSLCommerz's cross-site redirect chain
        // can drop SameSite=Lax cookies on the first hop, which leaves the
        // portal sidebar hidden until we do a real GET.
        window.location.replace(url.pathname + (url.search ? url.search : ""));
    }

    // Post-payment fallback: we couldn't resolve the buyer at all (no session
    // and no usable order). The webhook has already run server-side, so we
    // just acknowledge and prompt login.
    if (!member) {
        return (
            <div className="min-h-screen bg-zinc-50 flex items-center justify-center px-4 py-12">
                <JoiningPopup popup={popup} onClose={() => setPopup(null)} standalone />
                {!popup && (
                    <div className="w-full max-w-md bg-white rounded-2xl shadow-xl border border-zinc-100 p-8 text-center">
                        <h1 className="text-lg font-bold text-zinc-900">
                            Sign in to continue
                        </h1>
                        <p className="text-sm text-zinc-500 mt-2 leading-relaxed">
                            Sign in again to see your updated joining status.
                        </p>
                        <Link
                            href="/login"
                            className="mt-6 inline-flex items-center gap-2 bg-accent-red hover:bg-zinc-900 text-white font-bold tracking-widest uppercase text-xs px-5 py-3 rounded-xl transition-colors"
                        >
                            Sign in
                        </Link>
                    </div>
                )}
            </div>
        );
    }

    return (
        <div className="space-y-6 max-w-4xl">
            <div>
                <h1 className="text-2xl sm:text-3xl font-bold text-zinc-900">
                    Complete your <span className="text-accent-red">joining</span>
                </h1>
                <p className="text-zinc-500 mt-1 text-sm">
                    A few more steps and you&apos;ll have full access to your membership.
                </p>
            </div>

            <JoiningPopup popup={popup} onClose={closePopup} />

            {/* Contextual alert */}
            {member.joinStage === "AWAITING_APPROVAL" && (
                <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex items-start gap-3 p-4 rounded-xl border border-amber-300 bg-amber-50"
                >
                    <Clock size={18} className="flex-shrink-0 mt-0.5 text-amber-700" />
                    <div className="flex-1 min-w-0">
                        <p className="text-sm font-bold text-amber-800">
                            Please visit your Dojo with the required documents to access all the features.
                        </p>
                        <p className="text-xs text-amber-700 mt-0.5 opacity-80">
                            Your dojo will confirm your rank and accept your join request.
                            {member.dojo?.name ? ` Your dojo: ${member.dojo.name}.` : ""}
                        </p>
                    </div>
                </motion.div>
            )}

            {/* Stepper */}
            <TiltCard className="p-6">
                <ol className="space-y-4">
                    {STEPS.map((step, i) => {
                        const status = stepStatus(member.joinStage, step.key);
                        const Icon =
                            status === "done" ? CheckCircle2 :
                            status === "current" ? Clock : Circle;
                        const color =
                            status === "done" ? "text-emerald-600" :
                            status === "current" ? "text-accent-red" : "text-zinc-300";
                        return (
                            <li key={step.key} className="flex gap-4">
                                <div className="flex flex-col items-center">
                                    <Icon size={22} className={color} />
                                    {i < STEPS.length - 1 && (
                                        <div className={`w-px flex-1 my-1 ${status === "done" ? "bg-emerald-200" : "bg-zinc-100"}`} />
                                    )}
                                </div>
                                <div className="pb-4 flex-1">
                                    <p className={`text-sm font-bold ${status === "upcoming" ? "text-zinc-400" : "text-zinc-900"}`}>
                                        {i + 1}. {step.label}
                                    </p>
                                    <p className={`text-xs mt-0.5 ${status === "upcoming" ? "text-zinc-400" : "text-zinc-500"}`}>
                                        {step.desc}
                                    </p>
                                </div>
                            </li>
                        );
                    })}
                </ol>
            </TiltCard>

            {/* Actions for the current step */}
            {member.joinStage === "FEE_UNPAID" && (
                <MembershipFeeCard
                    membershipFeeBDT={membershipFeeBDT}
                    paying={payingMembership}
                    onPay={() =>
                        startMembership(async () => {
                            await startMembershipPaymentAction();
                        })
                    }
                />
            )}

            {member.joinStage === "AWAITING_APPROVAL" && (
                <TiltCard className="p-6">
                    <div className="flex items-start gap-3">
                        <FileText size={20} className="text-blue-600 mt-1" />
                        <div className="flex-1">
                            <p className="text-sm font-bold text-zinc-900">
                                Download your joining slip
                            </p>
                            <p className="text-xs text-zinc-500 mt-1">
                                Print this PDF and bring it, along with your NID / birth certificate
                                {member.dojo?.name ? ` and any documents your dojo (${member.dojo.name}) requests` : ""},
                                to your dojo. Your instructor will confirm your rank and finalize your enrollment.
                            </p>
                            <div className="mt-4 flex flex-wrap gap-3">
                                <a
                                    href="/portal/joining/pdf"
                                    className="inline-flex items-center gap-2 bg-accent-red hover:bg-zinc-900 text-white font-bold tracking-widest uppercase text-xs px-5 py-3 rounded-xl transition-colors"
                                >
                                    <Download size={14} />
                                    Download PDF
                                </a>
                                {member.dojo && (
                                    <Link
                                        href={`/branches/${member.dojo.id}`}
                                        className="inline-flex items-center gap-2 border border-zinc-200 hover:border-accent-red/30 text-zinc-700 font-bold tracking-widest uppercase text-xs px-5 py-3 rounded-xl transition-colors"
                                    >
                                        <MapPin size={14} />
                                        View Dojo
                                    </Link>
                                )}
                            </div>
                        </div>
                    </div>
                </TiltCard>
            )}

        </div>
    );
}

function successCopy(popup: { joinStage: JoinStage | null; authenticated: boolean }) {
    if (!popup.authenticated) {
        return {
            eyebrow: "Payment successful",
            heading: "Thank you!",
            body: "Your payment was received. Sign in again to see your updated joining status.",
        };
    }
    if (popup.joinStage === "JOINED") {
        return {
            eyebrow: "Payment successful",
            heading: "You've joined JKA Bangladesh!",
            body: "Your past-belt fee is confirmed and full portal access is now unlocked.",
        };
    }
    if (popup.joinStage === "AWAITING_APPROVAL") {
        return {
            eyebrow: "Payment successful",
            heading: "Thank you!",
            body: "Your membership fee is confirmed. Download your joining slip and visit your dojo to continue.",
        };
    }
    return {
        eyebrow: "Payment successful",
        heading: "Thank you!",
        body: "Your fee is confirmed. See the next step below.",
    };
}

function JoiningPopup({
    popup,
    onClose,
    standalone = false,
}: {
    popup: Feedback;
    onClose: () => void;
    standalone?: boolean;
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
                            (() => {
                                const copy = successCopy(popup);
                                return (
                                    <div className="p-8 text-center">
                                        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100 text-emerald-600 mb-4">
                                            <CheckCircle2 size={36} />
                                        </div>
                                        <p className="text-[11px] uppercase tracking-[0.35em] text-emerald-600 mb-2">
                                            {copy.eyebrow}
                                        </p>
                                        <h2 className="text-2xl font-bold text-zinc-900">
                                            {copy.heading}
                                        </h2>
                                        <p className="mt-2 text-sm text-zinc-500">{copy.body}</p>
                                        {standalone ? (
                                            <Link
                                                href="/login"
                                                className="mt-6 w-full inline-flex items-center justify-center bg-zinc-900 hover:bg-accent-red text-white font-bold text-sm py-3 rounded-xl transition-colors"
                                            >
                                                Sign in
                                            </Link>
                                        ) : (
                                            <button
                                                type="button"
                                                onClick={onClose}
                                                className="mt-6 w-full inline-flex items-center justify-center bg-zinc-900 hover:bg-accent-red text-white font-bold text-sm py-3 rounded-xl transition-colors"
                                            >
                                                Done
                                            </button>
                                        )}
                                    </div>
                                );
                            })()
                        ) : (
                            <div className="p-8 text-center">
                                <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-red-100 text-red-600 mb-4">
                                    <XCircle size={36} />
                                </div>
                                <p className="text-[11px] uppercase tracking-[0.35em] text-red-600 mb-2">
                                    Payment failed
                                </p>
                                <h2 className="text-2xl font-bold text-zinc-900">
                                    Payment did not go through
                                </h2>
                                <p className="mt-2 text-sm text-zinc-500">{popup.reason}</p>
                                {standalone ? (
                                    <Link
                                        href="/login"
                                        className="mt-6 w-full inline-flex items-center justify-center bg-zinc-900 hover:bg-accent-red text-white font-bold text-sm py-3 rounded-xl transition-colors"
                                    >
                                        Sign in
                                    </Link>
                                ) : (
                                    <button
                                        type="button"
                                        onClick={onClose}
                                        className="mt-6 w-full inline-flex items-center justify-center bg-zinc-900 hover:bg-accent-red text-white font-bold text-sm py-3 rounded-xl transition-colors"
                                    >
                                        Try again
                                    </button>
                                )}
                            </div>
                        )}
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    );
}

function SecurityFooter() {
    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="flex items-center justify-center gap-2 text-xs text-zinc-400"
        >
            <Shield size={13} />
            Secured by SSLCommerz · bKash · Nagad · Cards
        </motion.div>
    );
}

function MembershipFeeCard({
    membershipFeeBDT,
    paying,
    onPay,
}: {
    membershipFeeBDT: number;
    paying: boolean;
    onPay: () => void;
}) {
    const validUntil = new Date();
    validUntil.setFullYear(validUntil.getFullYear() + 1);

    return (
        <div className="space-y-6 max-w-lg">
            <TiltCard delay={0.1} className="overflow-hidden">
                <div className="px-6 py-5 border-b border-zinc-100">
                    <h2 className="text-sm font-bold text-zinc-900 flex items-center gap-2">
                        <RefreshCw size={15} className="text-accent-red" />
                        Membership Summary
                    </h2>
                </div>

                <div className="px-6 py-5 space-y-4">
                    <div className="flex justify-between items-center text-sm">
                        <span className="text-zinc-500">Annual Membership Fee</span>
                        <span className="font-bold text-zinc-900">
                            ৳{membershipFeeBDT.toLocaleString()}
                        </span>
                    </div>

                    <div className="flex justify-between items-center text-sm">
                        <span className="text-zinc-500 flex items-center gap-1.5">
                            <Calendar size={13} /> Valid Until
                        </span>
                        <span className="font-semibold text-zinc-900">
                            {validUntil.toLocaleDateString("en-GB", {
                                day: "numeric",
                                month: "long",
                                year: "numeric",
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
                    <form action={onPay}>
                        <button
                            type="submit"
                            disabled={paying}
                            className="w-full flex items-center justify-center gap-2.5 bg-zinc-900 hover:bg-accent-red text-white font-bold text-sm py-3.5 rounded-xl transition-colors disabled:opacity-60 shadow-sm"
                        >
                            {paying ? (
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
                    </form>
                </div>
            </TiltCard>

            <SecurityFooter />
        </div>
    );
}

