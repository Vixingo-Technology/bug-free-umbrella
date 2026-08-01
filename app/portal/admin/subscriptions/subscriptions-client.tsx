"use client";

import { useState, useTransition } from "react";
import { CheckCircle2, Loader2, RotateCcw } from "lucide-react";
import {
    DOJO_ENLISTMENT_FEE_BDT,
    DOJO_RENEWAL_FEE_BDT,
    MEMBERSHIP_FEE_BDT,
} from "@/lib/constants";
import { updateSubscriptionFeesAction } from "./actions";

type FeeState = {
    dojoEnlistmentFeeBDT: string;
    dojoRenewalFeeBDT: string;
    membershipFeeBDT: string;
};

type Props = {
    /** Current values from SystemSettings — null means "using the default". */
    stored: {
        dojoEnlistmentFeeBDT: number | null;
        dojoRenewalFeeBDT: number | null;
        membershipFeeBDT: number | null;
        transferFeeBDT: number | null;
        pastBeltFeePerRankBDT: number | null;
    };
};

type FieldKey = keyof FeeState;

const FIELDS: Array<{
    key: FieldKey;
    label: string;
    hint: string;
    unit: string;
    fallback: number;
}> = [
    {
        key: "dojoEnlistmentFeeBDT",
        label: "Dojo Enlistment Fee",
        hint: "One-time fee a new dojo pays to affiliate with the federation.",
        unit: "৳ / one-time",
        fallback: DOJO_ENLISTMENT_FEE_BDT,
    },
    {
        key: "dojoRenewalFeeBDT",
        label: "Dojo Renewal Fee",
        hint: "Annual federation renewal fee charged to affiliated dojos.",
        unit: "৳ / year",
        fallback: DOJO_RENEWAL_FEE_BDT,
    },
    {
        key: "membershipFeeBDT",
        label: "Student Membership Renewal Fee",
        hint: "Annual membership fee charged to individual students.",
        unit: "৳ / year",
        fallback: MEMBERSHIP_FEE_BDT,
    },
];

function toInput(n: number | null): string {
    return n == null ? "" : String(n);
}

export default function SubscriptionsClient({ stored }: Props) {
    const initial: FeeState = {
        dojoEnlistmentFeeBDT: toInput(stored.dojoEnlistmentFeeBDT),
        dojoRenewalFeeBDT: toInput(stored.dojoRenewalFeeBDT),
        membershipFeeBDT: toInput(stored.membershipFeeBDT),
    };

    const [values, setValues] = useState<FeeState>(initial);
    const [savedValues, setSavedValues] = useState<FeeState>(initial);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);
    const [isPending, startTransition] = useTransition();

    const dirty =
        values.dojoEnlistmentFeeBDT !== savedValues.dojoEnlistmentFeeBDT ||
        values.dojoRenewalFeeBDT !== savedValues.dojoRenewalFeeBDT ||
        values.membershipFeeBDT !== savedValues.membershipFeeBDT;

    function setField(key: FieldKey, v: string) {
        setValues((prev) => ({ ...prev, [key]: v }));
        setError(null);
        setSuccess(null);
    }

    function resetToDefault(key: FieldKey) {
        setField(key, "");
    }

    function onSubmit(e: React.FormEvent<HTMLFormElement>) {
        e.preventDefault();
        setError(null);
        setSuccess(null);

        const form = new FormData();
        form.set("dojoEnlistmentFeeBDT", values.dojoEnlistmentFeeBDT);
        form.set("dojoRenewalFeeBDT", values.dojoRenewalFeeBDT);
        form.set("membershipFeeBDT", values.membershipFeeBDT);

        startTransition(async () => {
            const result = await updateSubscriptionFeesAction(form);
            if (!result.ok) {
                setError(result.error);
                return;
            }
            setSavedValues(values);
            setSuccess("Fees updated. New rates take effect immediately.");
        });
    }

    return (
        <form
            onSubmit={onSubmit}
            className="bg-white border border-zinc-200 rounded-sm shadow-sm"
        >
            <header className="px-6 py-5 border-b border-zinc-200">
                <p className="text-[10px] tracking-widest uppercase font-bold text-zinc-400 mb-1">
                    Fee catalog
                </p>
                <h2 className="font-serif text-lg font-bold text-zinc-900">
                    Subscription fees
                </h2>
                <p className="text-xs text-zinc-500 mt-1 leading-relaxed max-w-2xl">
                    These values are used everywhere the app quotes an
                    affiliation, renewal, or student membership charge. Leave a
                    field blank to fall back to the built-in default shown
                    beneath the input.
                </p>
            </header>

            <div className="px-6 py-6 space-y-6">
                {FIELDS.map((f) => {
                    const value = values[f.key];
                    const usingDefault = value.trim() === "";
                    return (
                        <div key={f.key}>
                            <div className="flex items-baseline justify-between mb-1.5">
                                <label
                                    htmlFor={`fee-${f.key}`}
                                    className="text-sm font-semibold text-zinc-900"
                                >
                                    {f.label}
                                </label>
                                {!usingDefault && (
                                    <button
                                        type="button"
                                        onClick={() => resetToDefault(f.key)}
                                        disabled={isPending}
                                        className="inline-flex items-center gap-1 text-[10px] tracking-widest uppercase font-bold text-zinc-500 hover:text-accent-red disabled:opacity-60 transition-colors"
                                    >
                                        <RotateCcw size={11} />
                                        Use default
                                    </button>
                                )}
                            </div>
                            <p className="text-xs text-zinc-500 mb-2 leading-relaxed">
                                {f.hint}
                            </p>
                            <div className="flex items-center gap-3">
                                <div className="relative flex-1 max-w-xs">
                                    <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-sm text-zinc-500 pointer-events-none">
                                        ৳
                                    </span>
                                    <input
                                        id={`fee-${f.key}`}
                                        type="number"
                                        inputMode="decimal"
                                        min={0}
                                        step="1"
                                        value={value}
                                        onChange={(e) =>
                                            setField(f.key, e.target.value)
                                        }
                                        disabled={isPending}
                                        placeholder={String(f.fallback)}
                                        className="w-full bg-white border border-zinc-300 rounded-sm pl-7 pr-3 py-2.5 text-sm text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:border-accent-red focus:ring-1 focus:ring-accent-red disabled:opacity-60"
                                    />
                                </div>
                                <span className="text-[10px] tracking-widest uppercase font-bold text-zinc-500">
                                    {f.unit}
                                </span>
                            </div>
                            <p className="text-[11px] text-zinc-400 mt-1.5">
                                {usingDefault
                                    ? `Using default: ৳ ${f.fallback.toLocaleString(
                                          "en-IN"
                                      )}`
                                    : `Overriding default of ৳ ${f.fallback.toLocaleString(
                                          "en-IN"
                                      )}`}
                            </p>
                        </div>
                    );
                })}
            </div>

            <footer className="px-6 py-4 border-t border-zinc-200 flex items-center justify-between gap-3 flex-wrap">
                <div className="min-h-[1.25rem]">
                    {error && (
                        <p role="alert" className="text-sm text-accent-red">
                            {error}
                        </p>
                    )}
                    {success && (
                        <p
                            role="status"
                            className="inline-flex items-center gap-2 text-sm text-emerald-700"
                        >
                            <CheckCircle2 size={14} />
                            {success}
                        </p>
                    )}
                </div>
                <button
                    type="submit"
                    disabled={isPending || !dirty}
                    className="inline-flex items-center gap-2 bg-accent-red text-white px-4 py-2.5 text-xs font-bold tracking-widest uppercase hover:bg-accent-red/90 disabled:opacity-60 disabled:cursor-not-allowed transition-colors rounded-sm"
                >
                    {isPending ? (
                        <>
                            <Loader2 size={14} className="animate-spin" />
                            Saving
                        </>
                    ) : (
                        <>Save changes</>
                    )}
                </button>
            </footer>
        </form>
    );
}
