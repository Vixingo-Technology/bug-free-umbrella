"use client";

import { motion } from "motion/react";
import Image from "next/image";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState, useTransition } from "react";
import {
    ArrowLeft,
    ArrowRight,
    CheckCircle2,
    Clock,
    CreditCard,
    Loader2,
    Lock,
    Wallet,
} from "lucide-react";
import Logo from "@/assets/jka_logo.svg";
import {
    commitDojoEnlistment,
    initiateDojoEnlistmentPayment,
    markDojoEnlistmentPaid,
    type DojoEnlistmentInput,
} from "@/app/actions/enlist-dojo";

const DRAFT_KEY = "jka.enlistDojo.draft";

type DraftShape = {
    dojoName: string;
    shortName?: string;
    email: string;
    phone: string;
    contactName: string;
    contactRank?: string;
    contactDob?: string;
    division?: string;
    district?: string;
    city?: string;
    area?: string;
    houseRoad?: string;
    address: string;
    latitude: string;
    longitude: string;
};

const methods = [
    {
        id: "sslcommerz",
        label: "SSLCommerz",
        sub: "Card / Mobile banking / Net banking",
        icon: CreditCard,
    },
    { id: "bkash", label: "bKash", sub: "Mobile wallet", icon: Wallet },
    { id: "nagad", label: "Nagad", sub: "Mobile wallet", icon: Wallet },
];

export default function EnlistDojoPaymentClient({
    enlistmentFeeBDT,
}: {
    enlistmentFeeBDT: number;
}) {
    return (
        <Suspense fallback={null}>
            <PaymentContent enlistmentFeeBDT={enlistmentFeeBDT} />
        </Suspense>
    );
}

function PaymentContent({ enlistmentFeeBDT }: { enlistmentFeeBDT: number }) {
    const router = useRouter();
    const params = useSearchParams();
    const email = params.get("email") ?? "";
    const existingApplicationId = params.get("applicationId");

    const [method, setMethod] = useState("sslcommerz");
    const [error, setError] = useState<string | null>(null);
    const [isPending, startTransition] = useTransition();
    const [payLaterPending, startPayLaterTransition] = useTransition();

    const feeLabel = enlistmentFeeBDT.toLocaleString("en-IN");

    function readDraft(): DraftShape | null {
        try {
            const raw = sessionStorage.getItem(DRAFT_KEY);
            if (raw) return JSON.parse(raw) as DraftShape;
        } catch {
            /* ignore */
        }
        return null;
    }

    function draftToInput(draft: DraftShape): DojoEnlistmentInput {
        return {
            dojoName: draft.dojoName,
            shortName: draft.shortName ?? "",
            email: draft.email,
            phone: draft.phone,
            contactName: draft.contactName,
            contactRank: draft.contactRank ?? "",
            contactDob: draft.contactDob ?? "",
            division: draft.division ?? "",
            address: draft.address,
            latitude: draft.latitude,
            longitude: draft.longitude,
            interiorUrls: [],
        };
    }

    function handlePay() {
        setError(null);
        startTransition(async () => {
            let applicationId = existingApplicationId;
            if (!applicationId) {
                const draft = readDraft();
                if (!draft) {
                    setError(
                        "Your enlistment draft was lost. Please restart from the beginning."
                    );
                    return;
                }
                const commit = await commitDojoEnlistment(
                    draftToInput(draft),
                    { paidNow: false }
                );
                if (commit?.error || !commit?.applicationId) {
                    router.push(
                        `/enlist-dojo/failed?reason=${encodeURIComponent(
                            commit?.error ??
                                "We couldn't save your enlistment before payment."
                        )}`
                    );
                    return;
                }
                applicationId = commit.applicationId;
            }

            const init = await initiateDojoEnlistmentPayment(applicationId!);
            if (init?.error) {
                router.push(
                    `/enlist-dojo/failed?applicationId=${encodeURIComponent(
                        applicationId!
                    )}&reason=${encodeURIComponent(init.error)}`
                );
                return;
            }

            try {
                sessionStorage.removeItem(DRAFT_KEY);
            } catch {
                /* ignore */
            }

            if (init?.redirectUrl) {
                window.location.href = init.redirectUrl;
                return;
            }

            if (init?.devPaid) {
                router.push(
                    `/enlist-dojo/success?applicationId=${encodeURIComponent(
                        applicationId!
                    )}`
                );
                return;
            }

            const paid = await markDojoEnlistmentPaid(applicationId!);
            if (paid?.error) {
                router.push(
                    `/enlist-dojo/failed?applicationId=${encodeURIComponent(
                        applicationId!
                    )}&reason=${encodeURIComponent(paid.error)}`
                );
                return;
            }
            router.push(
                `/enlist-dojo/success?applicationId=${encodeURIComponent(
                    applicationId!
                )}`
            );
        });
    }

    function handlePayLater() {
        setError(null);
        startPayLaterTransition(async () => {
            if (existingApplicationId) {
                router.push("/portal?enlistment=pay_later");
                return;
            }
            const draft = readDraft();
            if (!draft) {
                setError(
                    "Your enlistment draft was lost. Please restart from the beginning."
                );
                return;
            }
            const input = draftToInput(draft);
            const commit = await commitDojoEnlistment(input, {
                paidNow: false,
            });
            if (commit?.error || !commit?.applicationId) {
                setError(
                    commit?.error ??
                        "We couldn't save your enlistment. Please try again."
                );
                return;
            }
            try {
                sessionStorage.removeItem(DRAFT_KEY);
            } catch {
                /* ignore */
            }
            router.push("/portal?enlistment=pay_later");
        });
    }

    return (
        <div className="min-h-screen bg-bg-charcoal relative overflow-hidden py-12 flex items-center justify-center">
            <div className="absolute top-[-20%] left-[-10%] w-[80%] h-[80%] rounded-full bg-accent-gold/5 blur-[120px] pointer-events-none" />
            <div className="absolute bottom-[-20%] right-[-10%] w-[60%] h-[60%] rounded-full bg-accent-red/5 blur-[100px] pointer-events-none" />

            <div className="w-full max-w-2xl mx-auto px-6 relative z-10">
                <Link
                    href={
                        existingApplicationId
                            ? "/portal"
                            : `/enlist-dojo/set-password?email=${encodeURIComponent(
                                  email
                              )}`
                    }
                    className="inline-flex items-center gap-2 text-xs font-bold tracking-widest uppercase text-zinc-500 hover:text-accent-red transition-colors mb-8 group"
                >
                    <ArrowLeft
                        size={16}
                        className="group-hover:-translate-x-1 transition-transform"
                    />
                    Back
                </Link>

                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5 }}
                    className="glass p-10 rounded-2xl shadow-xl"
                >
                    <div className="flex flex-col items-center text-center mb-10">
                        <Image
                            src={Logo}
                            alt="JKA Bangladesh logo"
                            width={56}
                            height={56}
                        />
                        <div className="flex items-center gap-2 text-accent-red text-xs font-bold tracking-widest uppercase mt-6 mb-3">
                            <CheckCircle2 size={14} />
                            Email verified
                        </div>
                        <h1 className="font-serif text-2xl font-bold text-zinc-900 mb-3">
                            {existingApplicationId
                                ? "Activate your dojo"
                                : "Complete your enlistment"}
                        </h1>
                        <p className="text-zinc-500 text-sm leading-relaxed max-w-md">
                            Settle the one-time enlistment fee to activate your
                            Dojo Dashboard and appear on the public branch
                            locator — or pay later and finish setting things up
                            from your dashboard.
                        </p>
                    </div>

                    <div className="bg-white border border-zinc-200 rounded-sm p-6 mb-8">
                        <div className="flex items-center justify-between mb-4 pb-4 border-b border-zinc-200">
                            <span className="text-xs tracking-widest uppercase font-bold text-zinc-500">
                                Order summary
                            </span>
                            <span className="text-xs text-zinc-500">
                                {email}
                            </span>
                        </div>
                        <div className="flex items-center justify-between text-sm mb-2">
                            <span className="text-zinc-700">
                                Dojo enlistment — one-time
                            </span>
                            <span className="text-zinc-900 font-semibold">
                                ৳ {feeLabel}
                            </span>
                        </div>
                        <div className="flex items-center justify-between text-sm">
                            <span className="text-zinc-500">
                                Processing fee
                            </span>
                            <span className="text-zinc-500">Included</span>
                        </div>
                        <div className="flex items-center justify-between pt-4 mt-4 border-t border-zinc-200">
                            <span className="text-zinc-900 font-bold">
                                Total
                            </span>
                            <span className="font-karate text-2xl font-bold text-zinc-900">
                                ৳ {feeLabel}
                            </span>
                        </div>
                    </div>

                    <div className="mb-8">
                        <p className="text-xs tracking-widest uppercase font-bold text-zinc-500 mb-3">
                            Payment method
                        </p>
                        <div className="grid sm:grid-cols-3 gap-3">
                            {methods.map((m) => {
                                const Icon = m.icon;
                                const active = method === m.id;
                                return (
                                    <button
                                        key={m.id}
                                        type="button"
                                        onClick={() => setMethod(m.id)}
                                        className={`text-left bg-white border rounded-sm p-4 transition-colors ${
                                            active
                                                ? "border-accent-red ring-1 ring-accent-red"
                                                : "border-zinc-200 hover:border-zinc-300"
                                        }`}
                                    >
                                        <Icon
                                            size={18}
                                            className={
                                                active
                                                    ? "text-accent-red"
                                                    : "text-zinc-500"
                                            }
                                        />
                                        <div className="text-sm font-semibold text-zinc-900 mt-2">
                                            {m.label}
                                        </div>
                                        <div className="text-xs text-zinc-500 mt-0.5">
                                            {m.sub}
                                        </div>
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    {error && (
                        <div className="bg-accent-red/10 border border-accent-red/30 text-accent-red text-sm rounded-md p-3 mb-6">
                            {error}
                        </div>
                    )}

                    <button
                        type="button"
                        onClick={handlePay}
                        disabled={isPending || payLaterPending}
                        className="w-full inline-flex items-center justify-center gap-3 bg-accent-red text-white px-6 py-4 text-xs font-bold tracking-widest uppercase hover:bg-accent-red/90 disabled:opacity-60 transition-colors group rounded-sm"
                    >
                        {isPending ? (
                            <>
                                <Loader2
                                    size={14}
                                    className="animate-spin"
                                />
                                Redirecting
                            </>
                        ) : (
                            <>
                                Pay ৳ {feeLabel} & Activate
                                <ArrowRight
                                    size={14}
                                    className="group-hover:translate-x-1 transition-transform"
                                />
                            </>
                        )}
                    </button>

                    <button
                        type="button"
                        onClick={handlePayLater}
                        disabled={isPending || payLaterPending}
                        className="w-full inline-flex items-center justify-center gap-2 mt-3 border border-zinc-300 text-zinc-700 px-6 py-4 text-xs font-bold tracking-widest uppercase hover:border-accent-red hover:text-accent-red disabled:opacity-60 transition-colors rounded-sm"
                    >
                        {payLaterPending ? (
                            <>
                                <Loader2
                                    size={14}
                                    className="animate-spin"
                                />
                                Saving
                            </>
                        ) : (
                            <>
                                <Clock size={14} />
                                Pay later & Continue to Dashboard
                            </>
                        )}
                    </button>

                    <div className="flex items-center justify-center gap-2 text-xs text-zinc-500 mt-6">
                        <Lock size={12} />
                        Secured by SSLCommerz · Payment processed by the gateway
                    </div>
                </motion.div>
            </div>
        </div>
    );
}
