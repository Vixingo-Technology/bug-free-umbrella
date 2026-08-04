"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Ticket, LogIn } from "lucide-react";
import {
    ageOnDate,
    type CustomDivision,
    type Gender,
} from "@/lib/tournaments/divisions";
import { registerForTournamentAndRedirect } from "@/app/actions/event-registration";

export type EventRegistrationBeltRank = {
    id: string;
    name: string;
    orderIndex: number;
};

export type TournamentRegistrationEvent = {
    id: string;
    title: string;
    eventDate: string; // ISO
    memberDiscountActive: boolean;
    memberDiscountPercent: number;
    divisions: CustomDivision[];
    /** Optional bundle total (BDT) applied when 2+ divisions selected. */
    multiDivisionBundlePriceBdt: number | null;
    registrationDeadline: string | null; // ISO
    beltRanks: EventRegistrationBeltRank[];
};

export type MemberAutofill = {
    userId: string;
    fullName: string;
    email: string;
    phone: string | null;
    dateOfBirth: string | null;
    gender: Gender | null;
    currentRank: string | null;
    dojoName: string | null;
    emergencyContactName: string | null;
    emergencyContactPhone: string | null;
    rankOrderIndex: number | null;
} | null;

function applyDiscount(base: number, pct: number): number {
    if (pct <= 0) return base;
    const capped = Math.min(100, Math.max(0, pct));
    return Math.round(base * (1 - capped / 100) * 100) / 100;
}

export default function TournamentRegistrationForm({
    event,
    member,
    signInHref,
    initialError,
}: {
    event: TournamentRegistrationEvent;
    member: MemberAutofill;
    signInHref: string;
    initialError: string | null;
}) {
    const eventDate = useMemo(() => new Date(event.eventDate), [event.eventDate]);
    const registrationClosed = event.registrationDeadline
        ? new Date(event.registrationDeadline).getTime() < Date.now()
        : false;

    const [gender, setGender] = useState<Gender | "">(member?.gender ?? "");
    const [dobStr, setDobStr] = useState<string>(member?.dateOfBirth ?? "");
    const [weightKgStr, setWeightKgStr] = useState<string>("");
    const [selectedRankName, setSelectedRankName] = useState<string>(
        member?.currentRank ?? "",
    );
    const [selectedCodes, setSelectedCodes] = useState<Set<string>>(new Set());

    const dob = dobStr ? new Date(dobStr) : null;
    const age = dob ? ageOnDate(dob, eventDate) : null;
    const isMinor = age !== null && age < 18;

    // Belt rank order lookup — used to disable divisions whose min belt is
    // above the entrant's picked rank.
    const rankByOrder = useMemo(() => {
        const map = new Map<string, number>();
        for (const r of event.beltRanks) map.set(r.id, r.orderIndex);
        return map;
    }, [event.beltRanks]);
    const selectedRank = useMemo(
        () => event.beltRanks.find((r) => r.name === selectedRankName) ?? null,
        [event.beltRanks, selectedRankName],
    );
    const entrantRankOrder =
        selectedRank?.orderIndex ?? member?.rankOrderIndex ?? null;

    type EligibleDivision = {
        d: CustomDivision;
        reason: string | null;
    };

    // Per-division eligibility — a filter kicks in only once its input
    // field is filled. Any unfilled input means we can't say the division
    // is definitely out, so we leave it selectable.
    const eligibility = useMemo<EligibleDivision[]>(() => {
        return event.divisions.map((d) => {
            const reasons: string[] = [];
            if (gender && d.gender !== "ANY" && d.gender !== gender) {
                reasons.push(
                    d.gender === "MALE" ? "male only" : "female only",
                );
            }
            if (d.minAge !== null && age !== null && age < d.minAge) {
                reasons.push(`age ${d.minAge}+ on event day (you are ${age})`);
            }
            if (d.minRankId) {
                const required = rankByOrder.get(d.minRankId);
                if (
                    required !== undefined &&
                    entrantRankOrder !== null &&
                    entrantRankOrder < required
                ) {
                    const rank = event.beltRanks.find(
                        (r) => r.id === d.minRankId,
                    );
                    reasons.push(`min ${rank?.name ?? "belt"}`);
                }
            }
            return {
                d,
                reason: reasons.length ? reasons.join(", ") : null,
            };
        });
    }, [
        event.divisions,
        gender,
        age,
        entrantRankOrder,
        rankByOrder,
        event.beltRanks,
    ]);

    // Prune selected divisions that became ineligible as filters tightened.
    const eligibleCodes = useMemo(() => {
        const s = new Set<string>();
        for (const { d, reason } of eligibility) if (!reason) s.add(d.code);
        return s;
    }, [eligibility]);
    const effectiveSelected = useMemo(() => {
        const next = new Set<string>();
        for (const c of selectedCodes) if (eligibleCodes.has(c)) next.add(c);
        return next;
    }, [selectedCodes, eligibleCodes]);

    const allFiltersProvided = !!gender && !!dobStr && !!selectedRankName;
    const anyEligible = eligibility.some((e) => !e.reason);
    const cannotRegister = allFiltersProvided && !anyEligible;

    const selected = useMemo(
        () => event.divisions.filter((d) => effectiveSelected.has(d.code)),
        [event.divisions, effectiveSelected],
    );
    const anyTeam = selected.some((d) => d.isTeam);
    const anyKumite = selected.some((d) => d.eventType === "KUMITE");

    const totals = useMemo(() => {
        let sum = 0;
        let baseSum = 0;
        for (const d of selected) {
            const base = d.priceBdt ?? 0;
            baseSum += base;
            const effective = event.memberDiscountActive
                ? applyDiscount(base, event.memberDiscountPercent)
                : base;
            sum += effective;
        }
        const usesBundle =
            selected.length >= 2 &&
            event.multiDivisionBundlePriceBdt !== null &&
            event.multiDivisionBundlePriceBdt > 0;
        const bundleBase = usesBundle ? event.multiDivisionBundlePriceBdt! : 0;
        const bundleEffective =
            usesBundle && event.memberDiscountActive
                ? applyDiscount(bundleBase, event.memberDiscountPercent)
                : bundleBase;
        return {
            total: usesBundle
                ? Math.round(bundleEffective * 100) / 100
                : Math.round(sum * 100) / 100,
            baseTotal: usesBundle
                ? Math.round(bundleBase * 100) / 100
                : Math.round(baseSum * 100) / 100,
            usesBundle,
            sumTotal: Math.round(sum * 100) / 100,
        };
    }, [
        selected,
        event.memberDiscountActive,
        event.memberDiscountPercent,
        event.multiDivisionBundlePriceBdt,
    ]);

    const paid = totals.total > 0;

    function toggle(code: string) {
        setSelectedCodes((prev) => {
            const next = new Set(prev);
            if (next.has(code)) next.delete(code);
            else next.add(code);
            return next;
        });
    }

    if (registrationClosed) {
        return (
            <div className="bg-white border border-zinc-200 rounded-sm shadow-sm p-6 text-center">
                <p className="text-base font-semibold text-zinc-900 mb-2">
                    Registration is closed.
                </p>
                <p className="text-sm text-zinc-500">
                    The deadline for this event has passed.
                </p>
            </div>
        );
    }

    if (event.divisions.length === 0) {
        return (
            <div className="bg-white border border-zinc-200 rounded-sm shadow-sm p-6 text-center">
                <p className="text-base font-semibold text-zinc-900 mb-2">
                    Registration not open yet.
                </p>
                <p className="text-sm text-zinc-500">
                    The organiser has not published any divisions.
                </p>
            </div>
        );
    }

    return (
        <form
            action={registerForTournamentAndRedirect}
            className="bg-white border border-zinc-200 rounded-sm shadow-sm p-6 space-y-5"
        >
            <input type="hidden" name="eventId" value={event.id} />
            {selected.map((d) => (
                <input
                    key={d.code}
                    type="hidden"
                    name="divisionCode"
                    value={d.code}
                />
            ))}

            {member ? (
                <div className="text-sm text-zinc-700 bg-emerald-50 border border-emerald-200 rounded-sm px-4 py-3">
                    Registering as <b>{member.fullName}</b> ({member.email}).
                </div>
            ) : (
                <>
                    <Field label="Full name" required>
                        <input name="name" type="text" required className={inputCx} />
                    </Field>
                    <Field label="Email" required>
                        <input
                            name="email"
                            type="email"
                            required
                            className={inputCx}
                        />
                    </Field>
                    <Field label="Phone" required>
                        <input
                            name="phone"
                            type="tel"
                            required
                            inputMode="numeric"
                            pattern="\d{11}"
                            maxLength={11}
                            minLength={11}
                            placeholder="01XXXXXXXXX"
                            title="Phone number must be exactly 11 digits."
                            className={inputCx}
                        />
                    </Field>
                    <p className="text-xs text-zinc-500 -mt-1">
                        Anyone can register — no JKA account needed. Already
                        a member?{" "}
                        <Link
                            href={signInHref}
                            className="text-accent-red font-semibold hover:underline inline-flex items-center gap-1"
                        >
                            <LogIn size={12} /> Sign in
                        </Link>{" "}
                        to autofill your details.
                    </p>
                </>
            )}

            <div className="grid grid-cols-2 gap-3">
                <Field label="Gender" required>
                    <select
                        name="entrantGender"
                        value={gender}
                        onChange={(e) => {
                            setGender(e.target.value as Gender);
                            setSelectedCodes(new Set());
                        }}
                        required
                        className={inputCx}
                    >
                        <option value="">Select…</option>
                        <option value="MALE">Male</option>
                        <option value="FEMALE">Female</option>
                    </select>
                </Field>
                <Field label="Date of birth" required>
                    <input
                        name="dateOfBirth"
                        type="date"
                        value={dobStr}
                        onChange={(e) => setDobStr(e.target.value)}
                        required
                        className={inputCx}
                    />
                </Field>
            </div>

            {anyKumite && (
                <Field label="Weight (kg)" required>
                    <input
                        name="entrantWeightKg"
                        type="number"
                        min={20}
                        max={200}
                        step="0.1"
                        value={weightKgStr}
                        onChange={(e) => setWeightKgStr(e.target.value)}
                        required
                        placeholder="e.g. 67.5"
                        className={inputCx}
                    />
                    <p className="text-[11px] text-zinc-500 mt-1">
                        Final weight is confirmed at the on-day weigh-in.
                    </p>
                </Field>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <Field label="Belt rank" required>
                    <select
                        name="entrantBeltRank"
                        value={selectedRankName}
                        onChange={(e) => setSelectedRankName(e.target.value)}
                        required
                        className={inputCx}
                    >
                        <option value="">Select your rank…</option>
                        {event.beltRanks.map((r) => (
                            <option key={r.id} value={r.name}>
                                {r.name}
                            </option>
                        ))}
                    </select>
                </Field>
                <Field label="Dojo">
                    <input
                        name="entrantDojoName"
                        type="text"
                        defaultValue={member?.dojoName ?? ""}
                        placeholder="Home dojo"
                        className={inputCx}
                    />
                </Field>
            </div>
            <p className="text-[11px] text-amber-800 bg-amber-50 border border-amber-200 rounded-sm px-3 py-2 -mt-2">
                You must bring your belt test results or certificate to
                justify your rank.
            </p>

            <Field label="Coach name (optional)">
                <input name="coachName" type="text" className={inputCx} />
            </Field>

            <Field label="Profile photo (optional · JPG/PNG · appears on your card)">
                <input
                    name="profileImage"
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    className="w-full text-xs text-zinc-600 file:mr-3 file:py-2 file:px-3 file:rounded-sm file:border file:border-zinc-200 file:bg-zinc-50 file:text-zinc-700 file:text-[10px] file:font-bold file:uppercase file:tracking-widest hover:file:bg-zinc-100 cursor-pointer"
                />
            </Field>

            <div>
                <p className="text-[10px] tracking-widest uppercase font-bold text-zinc-500 mb-2">
                    Divisions <span className="text-accent-red">*</span>
                </p>
                <p className="text-[11px] text-zinc-500 mb-3">
                    Pick every division you want to enter. Prices add up.
                </p>
                {cannotRegister && (
                    <div className="text-xs text-red-800 bg-red-50 border border-red-200 rounded-sm px-3 py-3 mb-3 space-y-2">
                        <p className="font-semibold">
                            You cannot register for this event.
                        </p>
                        <p className="text-red-700">
                            None of the published divisions match your details.
                            Here is why each one is unavailable:
                        </p>
                        <ul className="list-disc pl-4 space-y-1 text-red-700">
                            {eligibility.map(({ d, reason }) => (
                                <li key={d.code}>
                                    <span className="font-semibold">
                                        {d.label}
                                    </span>{" "}
                                    — {reason}
                                </li>
                            ))}
                        </ul>
                    </div>
                )}
                <ul className="space-y-2">
                    {eligibility
                        .filter(({ reason }) => !cannotRegister && !reason)
                        .map(({ d, reason }) => {
                        const checked = effectiveSelected.has(d.code);
                        const disabled = !!reason;
                        const base = d.priceBdt ?? 0;
                        const effective = event.memberDiscountActive
                            ? applyDiscount(base, event.memberDiscountPercent)
                            : base;
                        return (
                            <li key={d.code}>
                                <label
                                    className={`flex items-start gap-3 border rounded-sm px-3 py-2.5 cursor-pointer select-none ${
                                        disabled
                                            ? "border-zinc-100 bg-zinc-50 text-zinc-400 cursor-not-allowed"
                                            : checked
                                              ? "border-accent-red bg-accent-red/5"
                                              : "border-zinc-200 bg-white hover:border-zinc-300"
                                    }`}
                                >
                                    <input
                                        type="checkbox"
                                        className="h-4 w-4 accent-red-600 mt-0.5 shrink-0"
                                        checked={checked}
                                        disabled={disabled}
                                        onChange={() => toggle(d.code)}
                                    />
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center justify-between gap-3">
                                            <span className="text-sm font-semibold text-zinc-900 truncate">
                                                {d.label}
                                            </span>
                                            <span className="text-sm text-zinc-700 whitespace-nowrap">
                                                {base > 0 ? (
                                                    <>
                                                        ৳
                                                        {effective.toLocaleString()}
                                                        {event.memberDiscountActive &&
                                                            effective !== base && (
                                                                <span className="ml-2 text-zinc-400 text-xs line-through font-normal">
                                                                    ৳
                                                                    {base.toLocaleString()}
                                                                </span>
                                                            )}
                                                    </>
                                                ) : (
                                                    <span className="text-emerald-700 text-xs uppercase tracking-widest font-bold">
                                                        Free
                                                    </span>
                                                )}
                                            </span>
                                        </div>
                                        <div className="flex flex-wrap items-center gap-2 mt-1">
                                            <span className="text-[10px] uppercase tracking-widest font-bold text-zinc-500">
                                                {d.eventType === "KATA"
                                                    ? "Kata"
                                                    : "Kumite"}
                                            </span>
                                            {d.isTeam && (
                                                <span className="text-[10px] uppercase tracking-widest font-bold text-zinc-500">
                                                    · Team
                                                </span>
                                            )}
                                            {d.minAge !== null && (
                                                <span className="text-[10px] uppercase tracking-widest text-zinc-500">
                                                    · Age {d.minAge}+
                                                </span>
                                            )}
                                            {d.minRankId && (
                                                <span className="text-[10px] uppercase tracking-widest text-zinc-500">
                                                    ·{" "}
                                                    {event.beltRanks.find(
                                                        (r) =>
                                                            r.id === d.minRankId,
                                                    )?.name ?? "belt"}
                                                    +
                                                </span>
                                            )}
                                            {reason && (
                                                <span className="text-[10px] text-amber-700 bg-amber-50 border border-amber-200 rounded-sm px-1.5 py-0.5">
                                                    Not eligible: {reason}
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                </label>
                            </li>
                        );
                    })}
                </ul>
                {!cannotRegister && selected.length === 0 && (
                    <p className="text-[11px] text-amber-700 bg-amber-50 border border-amber-200 rounded-sm px-3 py-2 mt-3">
                        Select at least one division to continue.
                    </p>
                )}
            </div>

            {anyTeam && (
                <div className="border border-zinc-200 rounded-sm bg-zinc-50 p-4 space-y-3">
                    <p className="text-[10px] tracking-widest uppercase font-bold text-zinc-500">
                        Team — teammates
                    </p>
                    <Field label="Team name" required>
                        <input name="teamName" type="text" required className={inputCx} />
                    </Field>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <Field label="Teammate 1 (name)" required>
                            <input
                                name="teammate1Name"
                                type="text"
                                required
                                className={inputCx}
                            />
                        </Field>
                        <Field label="Teammate 1 member # (optional)">
                            <input
                                name="teammate1Member"
                                type="text"
                                className={inputCx}
                            />
                        </Field>
                        <Field label="Teammate 2 (name)" required>
                            <input
                                name="teammate2Name"
                                type="text"
                                required
                                className={inputCx}
                            />
                        </Field>
                        <Field label="Teammate 2 member # (optional)">
                            <input
                                name="teammate2Member"
                                type="text"
                                className={inputCx}
                            />
                        </Field>
                    </div>
                    <p className="text-[11px] text-zinc-500">
                        You are the third team member. Teammates do not
                        register separately.
                    </p>
                </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <Field label="Emergency contact name" required>
                    <input
                        name="emergencyContactName"
                        type="text"
                        required
                        defaultValue={member?.emergencyContactName ?? ""}
                        className={inputCx}
                    />
                </Field>
                <Field label="Emergency contact phone" required>
                    <input
                        name="emergencyContactPhone"
                        type="tel"
                        required
                        inputMode="numeric"
                        defaultValue={member?.emergencyContactPhone ?? ""}
                        className={inputCx}
                    />
                </Field>
            </div>

            {isMinor && (
                <div className="border border-amber-200 bg-amber-50 rounded-sm p-4 space-y-3">
                    <p className="text-[10px] tracking-widest uppercase font-bold text-amber-800">
                        Guardian consent — required for participants under 18
                    </p>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <Field label="Guardian name" required>
                            <input
                                name="guardianName"
                                type="text"
                                required
                                className={inputCx}
                            />
                        </Field>
                        <Field label="Guardian phone" required>
                            <input
                                name="guardianPhone"
                                type="tel"
                                required
                                inputMode="numeric"
                                className={inputCx}
                            />
                        </Field>
                    </div>
                    <label className="flex items-start gap-2 cursor-pointer select-none">
                        <input
                            type="checkbox"
                            name="guardianConsent"
                            value="true"
                            required
                            className="h-4 w-4 accent-red-600 mt-0.5"
                        />
                        <span className="text-xs text-amber-900">
                            I am the parent or legal guardian and I consent to
                            this participant competing.
                        </span>
                    </label>
                </div>
            )}

            {initialError && <p className="text-sm text-red-600">{initialError}</p>}

            {paid ? (
                <>
                    <div className="border-t border-zinc-200 pt-4 space-y-2">
                        {totals.usesBundle && (
                            <div className="text-[11px] text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-sm px-3 py-2">
                                Multi-division bundle applied: ৳
                                {totals.total.toLocaleString()} instead of ৳
                                {totals.sumTotal.toLocaleString()}.
                            </div>
                        )}
                        <div className="flex items-center justify-between text-sm">
                            <span className="font-bold text-zinc-900">
                                Total
                                {selected.length > 1 && (
                                    <span className="text-zinc-400 font-normal">
                                        {" "}
                                        · {selected.length} divisions
                                    </span>
                                )}
                            </span>
                            <span className="font-bold text-zinc-900">
                                ৳{totals.total.toLocaleString()}
                                {event.memberDiscountActive &&
                                    totals.total !== totals.baseTotal && (
                                        <span className="ml-2 text-zinc-400 text-xs line-through font-normal">
                                            ৳{totals.baseTotal.toLocaleString()}
                                        </span>
                                    )}
                            </span>
                        </div>
                    </div>
                    <button
                        type="submit"
                        disabled={selected.length === 0}
                        className="w-full inline-flex items-center justify-center gap-2 bg-accent-red text-white px-4 py-3 text-xs font-bold tracking-widest uppercase hover:bg-accent-red/90 disabled:opacity-40 transition-colors rounded-sm"
                    >
                        <Ticket size={14} />
                        Pay ৳{totals.total.toLocaleString()} & register
                    </button>
                    <p className="text-[11px] text-zinc-500 text-center">
                        Your participation card is emailed as soon as payment
                        is confirmed.
                    </p>
                </>
            ) : (
                <button
                    type="submit"
                    disabled={selected.length === 0}
                    className="w-full inline-flex items-center justify-center gap-2 bg-accent-red text-white px-4 py-3 text-xs font-bold tracking-widest uppercase hover:bg-accent-red/90 disabled:opacity-40 transition-colors rounded-sm"
                >
                    Complete registration
                </button>
            )}
        </form>
    );
}

const inputCx =
    "w-full bg-zinc-50 border border-zinc-200 text-zinc-900 px-3 py-2.5 focus:outline-none focus:border-accent-red text-sm transition-colors rounded-sm";

function Field({
    label,
    required,
    children,
}: {
    label: string;
    required?: boolean;
    children: React.ReactNode;
}) {
    return (
        <label className="block">
            <span className="text-[10px] tracking-widest uppercase font-bold text-zinc-500 block mb-1">
                {label}
                {required && <span className="text-accent-red ml-1">*</span>}
            </span>
            {children}
        </label>
    );
}
