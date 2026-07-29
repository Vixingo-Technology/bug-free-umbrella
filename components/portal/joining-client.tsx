"use client";

import { useTransition } from "react";
import { motion } from "motion/react";
import Link from "next/link";
import {
    AlertTriangle,
    CheckCircle2,
    Circle,
    Clock,
    CreditCard,
    Download,
    FileText,
    MapPin,
    Shield,
    Loader2,
} from "lucide-react";
import TiltCard from "./tilt-card";
import {
    startMembershipPaymentAction,
    startPastBeltPaymentAction,
} from "@/app/portal/joining/actions";

type JoinStage = "FEE_UNPAID" | "AWAITING_APPROVAL" | "PAST_BELT_UNPAID" | "JOINED";

type Member = {
    fullName: string;
    email: string | null;
    phone: string | null;
    memberNumber: string | null;
    joinStage: JoinStage;
    requestedRank: string | null;
    assignedRank: string | null;
    pastBeltFeeBDT: number | null;
    dojo: { id: string; name: string; city: string | null; address: string | null } | null;
};

const STEPS: { key: JoinStage; label: string; desc: string }[] = [
    { key: "FEE_UNPAID",        label: "Membership fee", desc: "Pay the JKA annual membership fee to begin." },
    { key: "AWAITING_APPROVAL", label: "Visit your dojo", desc: "Take the joining slip and required documents to your dojo." },
    { key: "PAST_BELT_UNPAID",  label: "Past-belt fee",   desc: "Pay for any belts already achieved before joining." },
    { key: "JOINED",            label: "Joined",          desc: "Full portal access unlocked." },
];

function stepStatus(current: JoinStage, step: JoinStage): "done" | "current" | "upcoming" {
    const order: JoinStage[] = ["FEE_UNPAID", "AWAITING_APPROVAL", "PAST_BELT_UNPAID", "JOINED"];
    const c = order.indexOf(current);
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
}: {
    member: Member | null;
    membershipFeeBDT: number;
    postPaymentStatus?: "success" | "failed" | null;
    postPaymentReason?: string | null;
}) {
    const [payingMembership, startMembership] = useTransition();
    const [payingPastBelt, startPastBelt] = useTransition();

    // Post-payment fallback: shown when the user came back from SSLCommerz
    // without a valid session (cross-site redirect cookie loss). The webhook
    // has already run server-side, so we just acknowledge and prompt login.
    if (!member) {
        const isSuccess = postPaymentStatus === "success";
        return (
            <div className="min-h-screen bg-zinc-50 flex items-center justify-center px-4 py-12">
                <div className="w-full max-w-md bg-white rounded-2xl shadow-xl border border-zinc-100 p-8 text-center">
                    <div className={`mx-auto w-14 h-14 rounded-2xl border flex items-center justify-center mb-4 ${
                        isSuccess ? "bg-emerald-50 border-emerald-200" : "bg-red-50 border-red-200"
                    }`}>
                        {isSuccess
                            ? <CheckCircle2 size={26} className="text-emerald-600" />
                            : <AlertTriangle size={26} className="text-red-600" />}
                    </div>
                    <h1 className="text-lg font-bold text-zinc-900">
                        {isSuccess ? "Payment received" : "Payment could not be completed"}
                    </h1>
                    <p className="text-sm text-zinc-500 mt-2 leading-relaxed">
                        {isSuccess
                            ? "Your payment was successful. Please sign in again to see your updated joining status."
                            : (postPaymentReason ?? "Please sign in and try again.")}
                    </p>
                    <Link
                        href="/login"
                        className="mt-6 inline-flex items-center gap-2 bg-accent-red hover:bg-zinc-900 text-white font-bold tracking-widest uppercase text-xs px-5 py-3 rounded-xl transition-colors"
                    >
                        Sign in
                    </Link>
                </div>
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

            {/* Post-payment banner */}
            {postPaymentStatus === "success" && (
                <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex items-start gap-3 p-4 rounded-xl border border-emerald-300 bg-emerald-50"
                >
                    <CheckCircle2 size={18} className="flex-shrink-0 mt-0.5 text-emerald-700" />
                    <div className="flex-1 min-w-0">
                        <p className="text-sm font-bold text-emerald-800">Payment received.</p>
                        <p className="text-xs text-emerald-700 mt-0.5 opacity-80">
                            {member.joinStage === "JOINED"
                                ? "You've joined JKA Bangladesh — full portal access is unlocked."
                                : "Your fee is confirmed. See the next step below."}
                        </p>
                    </div>
                </motion.div>
            )}
            {postPaymentStatus === "failed" && (
                <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex items-start gap-3 p-4 rounded-xl border border-red-300 bg-red-50"
                >
                    <AlertTriangle size={18} className="flex-shrink-0 mt-0.5 text-red-700" />
                    <div className="flex-1 min-w-0">
                        <p className="text-sm font-bold text-red-800">Payment could not be completed.</p>
                        <p className="text-xs text-red-700 mt-0.5 opacity-80">
                            {postPaymentReason ?? "Please try again."}
                        </p>
                    </div>
                </motion.div>
            )}

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

            {member.joinStage === "PAST_BELT_UNPAID" && (
                <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex items-start gap-3 p-4 rounded-xl border border-blue-300 bg-blue-50"
                >
                    <Shield size={18} className="flex-shrink-0 mt-0.5 text-blue-700" />
                    <div className="flex-1 min-w-0">
                        <p className="text-sm font-bold text-blue-800">
                            Your dojo accepted your join request — rank confirmed as{" "}
                            <span className="underline">{member.assignedRank ?? "White Belt"}</span>.
                        </p>
                        <p className="text-xs text-blue-700 mt-0.5 opacity-80">
                            Finish by paying the catch-up fee for the belts you already hold.
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
                <TiltCard className="p-6">
                    <div className="flex items-start gap-3">
                        <CreditCard size={20} className="text-accent-red mt-1" />
                        <div className="flex-1">
                            <p className="text-sm font-bold text-zinc-900">
                                Pay JKA membership fee — ৳{membershipFeeBDT.toLocaleString()}
                            </p>
                            <p className="text-xs text-zinc-500 mt-1">
                                One-year membership. You&apos;ll be redirected to secure payment.
                            </p>
                            <form
                                action={() => startMembership(async () => { await startMembershipPaymentAction(); })}
                                className="mt-4"
                            >
                                <button
                                    type="submit"
                                    disabled={payingMembership}
                                    className="inline-flex items-center gap-2 bg-accent-red hover:bg-zinc-900 text-white font-bold tracking-widest uppercase text-xs px-5 py-3 rounded-xl transition-colors disabled:opacity-60"
                                >
                                    {payingMembership ? <Loader2 size={14} className="animate-spin" /> : <CreditCard size={14} />}
                                    Pay Now
                                </button>
                            </form>
                        </div>
                    </div>
                </TiltCard>
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
                                        href={`/dojos/${member.dojo.id}`}
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

            {member.joinStage === "PAST_BELT_UNPAID" && (
                <TiltCard className="p-6">
                    <div className="flex items-start gap-3">
                        <CreditCard size={20} className="text-accent-red mt-1" />
                        <div className="flex-1">
                            <p className="text-sm font-bold text-zinc-900">
                                Pay past-belt fee — ৳{Number(member.pastBeltFeeBDT ?? 0).toLocaleString()}
                            </p>
                            <p className="text-xs text-zinc-500 mt-1">
                                Requested rank: <span className="font-semibold">{member.requestedRank ?? "White Belt"}</span>
                                {" · "}Confirmed by your dojo: <span className="font-semibold">{member.assignedRank ?? "White Belt"}</span>.
                            </p>
                            <form
                                action={() => startPastBelt(async () => { await startPastBeltPaymentAction(); })}
                                className="mt-4"
                            >
                                <button
                                    type="submit"
                                    disabled={payingPastBelt}
                                    className="inline-flex items-center gap-2 bg-accent-red hover:bg-zinc-900 text-white font-bold tracking-widest uppercase text-xs px-5 py-3 rounded-xl transition-colors disabled:opacity-60"
                                >
                                    {payingPastBelt ? <Loader2 size={14} className="animate-spin" /> : <CreditCard size={14} />}
                                    Pay Now
                                </button>
                            </form>
                        </div>
                    </div>
                </TiltCard>
            )}
        </div>
    );
}
