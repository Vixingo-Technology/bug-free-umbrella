"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Ticket, LogIn } from "lucide-react";
import {
    ageOnDate,
    divisionBasePrice,
    feeAmountAfterMemberDiscount,
    type CustomDivision,
    type DivisionFee,
    type Gender,
} from "@/lib/tournaments/divisions";
import {
    applyTypedDiscount,
    formatTypedDiscount,
    type DiscountType,
} from "@/lib/pricing/discount";
import { registerForTournamentAndRedirect } from "@/app/actions/event-registration";
import { formatBeltRank } from "@/lib/constants";

export type EventRegistrationBeltRank = {
    id: string;
    name: string;
    orderIndex: number;
};

export type TournamentRegistrationEvent = {
    id: string;
    title: string;
    eventDate: string; // ISO
    /** True when the registrant is a signed-in JKA member with an active
     * membership — used to unlock per-fee member discounts. */
    memberDiscountActive: boolean;
    divisions: CustomDivision[];
    /** Event-wide base ticket price (BDT), added on top of division fees. */
    eventTicketPriceBdt: number | null;
    /** Discount applied to division subtotal when 2+ divisions selected. */
    multiDivisionDiscountType: DiscountType;
    multiDivisionDiscountPercent: number;
    registrationDeadline: string | null; // ISO
    beltRanks: EventRegistrationBeltRank[];
};

export type MemberAutofill = {
    userId: string;
    fullName: string;
    email: string;
    phone: string | null;
    memberNumber: string | null;
    avatarUrl: string | null;
    dateOfBirth: string | null;
    gender: Gender | null;
    currentRank: string | null;
    dojoName: string | null;
    coachName: string | null;
    emergencyContactName: string | null;
    emergencyContactPhone: string | null;
    guardianName: string | null;
    guardianPhone: string | null;
    rankOrderIndex: number | null;
} | null;

export default function TournamentRegistrationForm({
    event,
    member,
    isLoggedIn,
    signInHref,
    initialError,
}: {
    event: TournamentRegistrationEvent;
    member: MemberAutofill;
    /** True when a Supabase user session is present. Members-only divisions
     * stay locked for guests (no session). */
    isLoggedIn: boolean;
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
    const weightKg = weightKgStr.trim()
        ? Number.parseFloat(weightKgStr)
        : null;
    const weightProvided = weightKg !== null && Number.isFinite(weightKg);
    const [selectedRankName, setSelectedRankName] = useState<string>(
        member?.currentRank ?? "",
    );
    const [selectedCodes, setSelectedCodes] = useState<Set<string>>(new Set());
    // Keys are `${divisionCode}:${feeId}` for opt-in extras on each division.
    const [selectedOptionalFees, setSelectedOptionalFees] = useState<
        Set<string>
    >(new Set());

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

    // Per-division eligibility — every declared requirement must be met.
    // When a division requires a field the entrant hasn't filled yet (e.g.
    // a gender-locked division and no gender picked), we treat it as a
    // missing input and disable selection until every prerequisite lands.
    const eligibility = useMemo<EligibleDivision[]>(() => {
        return event.divisions.map((d) => {
            const reasons: string[] = [];
            if (d.membersOnly && !isLoggedIn) {
                reasons.push("members only — sign in");
            }
            const hasWeightGate =
                d.minWeightKg !== null || d.maxWeightKg !== null;
            const needsWeight = hasWeightGate || d.eventType === "KUMITE";
            if (d.gender !== "ANY") {
                if (!gender) {
                    reasons.push("select your gender");
                } else if (d.gender !== gender) {
                    reasons.push(
                        d.gender === "MALE" ? "male only" : "female only",
                    );
                }
            }
            if (d.minAge !== null || d.maxAge !== null) {
                if (age === null) {
                    reasons.push("enter your date of birth");
                } else {
                    if (d.minAge !== null && age < d.minAge) {
                        reasons.push(
                            `age ${d.minAge}+ on event day (you are ${age})`,
                        );
                    }
                    if (d.maxAge !== null && age > d.maxAge) {
                        reasons.push(
                            `up to age ${d.maxAge} on event day (you are ${age})`,
                        );
                    }
                }
            }
            if (needsWeight) {
                if (!weightProvided) {
                    reasons.push("enter your weight");
                } else if (weightKg !== null) {
                    if (
                        d.minWeightKg !== null &&
                        weightKg < d.minWeightKg
                    ) {
                        reasons.push(
                            `min ${d.minWeightKg} kg (you are ${weightKg})`,
                        );
                    }
                    if (
                        d.maxWeightKg !== null &&
                        weightKg > d.maxWeightKg
                    ) {
                        reasons.push(
                            `max ${d.maxWeightKg} kg (you are ${weightKg})`,
                        );
                    }
                }
            }
            if (d.minRankId) {
                const required = rankByOrder.get(d.minRankId);
                if (required !== undefined) {
                    if (entrantRankOrder === null) {
                        reasons.push("pick your belt rank");
                    } else if (entrantRankOrder < required) {
                        const rank = event.beltRanks.find(
                            (r) => r.id === d.minRankId,
                        );
                        reasons.push(`min ${rank?.name ?? "belt"}`);
                    }
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
        weightKg,
        weightProvided,
        entrantRankOrder,
        rankByOrder,
        event.beltRanks,
        isLoggedIn,
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

    const anyEligible = eligibility.some((e) => !e.reason);
    // "No available division" message shows only once every possible input
    // is filled and still nothing matches — the entrant has done their
    // part but no division fits.
    const allFiltersProvided =
        !!gender &&
        !!dobStr &&
        !!selectedRankName &&
        (!event.divisions.some(
            (d) =>
                d.eventType === "KUMITE" ||
                d.minWeightKg !== null ||
                d.maxWeightKg !== null,
        ) ||
            weightProvided);
    const cannotRegister = allFiltersProvided && !anyEligible;

    const selected = useMemo(
        () => event.divisions.filter((d) => effectiveSelected.has(d.code)),
        [event.divisions, effectiveSelected],
    );
    const anyTeam = selected.some((d) => d.isTeam);
    // Show the weight input whenever any division on the event needs it —
    // either kumite (weigh-in required) or any custom weight range gate.
    // That way participants can unlock weight-gated divisions from the
    // list without having to pick one first.
    const weightVisible = event.divisions.some(
        (d) =>
            d.eventType === "KUMITE" ||
            d.minWeightKg !== null ||
            d.maxWeightKg !== null,
    );
    const weightRequired = selected.some(
        (d) =>
            d.eventType === "KUMITE" ||
            d.minWeightKg !== null ||
            d.maxWeightKg !== null,
    );

    // Whether a given fee is "active" for the participant — required fees
    // always are; optional fees are only active once the participant has
    // ticked them.
    function feeIsActive(divisionCode: string, fee: DivisionFee): boolean {
        return (
            fee.required || selectedOptionalFees.has(`${divisionCode}:${fee.id}`)
        );
    }

    // Base (pre-discount) price for a division including any opt-in fees
    // the participant has ticked. Falls back to `divisionBasePrice` when
    // the division has no fee list (legacy rows).
    function priceForBase(d: CustomDivision): number {
        if (!d.fees || d.fees.length === 0) return divisionBasePrice(d);
        let total = 0;
        for (const f of d.fees) if (feeIsActive(d.code, f)) total += f.amountBdt;
        return Math.round(total * 100) / 100;
    }

    // Price for a division after per-fee member discounts (but before the
    // multi-division discount). Legacy fee-less rows have no per-fee
    // discount to apply.
    function priceForAfterMember(d: CustomDivision): number {
        if (!d.fees || d.fees.length === 0) return divisionBasePrice(d);
        let total = 0;
        for (const f of d.fees) {
            if (!feeIsActive(d.code, f)) continue;
            total += feeAmountAfterMemberDiscount(
                f,
                event.memberDiscountActive,
            );
        }
        return Math.round(total * 100) / 100;
    }

    // Discount amount saved on a single fee for the current registrant.
    function feeMemberSavings(fee: DivisionFee): number {
        if (!event.memberDiscountActive || fee.memberDiscountValue <= 0) {
            return 0;
        }
        const after = feeAmountAfterMemberDiscount(fee, true);
        return Math.round((fee.amountBdt - after) * 100) / 100;
    }

    const totals = useMemo(() => {
        const round2 = (n: number) => Math.round(n * 100) / 100;
        let divisionsBase = 0;
        let divisionsAfterMember = 0;
        let memberSavings = 0;
        for (const d of selected) {
            divisionsBase += priceForBase(d);
            divisionsAfterMember += priceForAfterMember(d);
            if (event.memberDiscountActive && d.fees) {
                for (const f of d.fees) {
                    if (!feeIsActive(d.code, f)) continue;
                    memberSavings += feeMemberSavings(f);
                }
            }
        }
        const multiActive =
            selected.length >= 2 && event.multiDivisionDiscountPercent > 0;
        const divisionsAfterAll = multiActive
            ? applyTypedDiscount(
                  divisionsAfterMember,
                  event.multiDivisionDiscountType,
                  event.multiDivisionDiscountPercent,
              )
            : round2(divisionsAfterMember);
        const multiDiscountAmount = multiActive
            ? round2(divisionsAfterMember - divisionsAfterAll)
            : 0;
        const ticketBase = event.eventTicketPriceBdt ?? 0;
        // Event-wide ticket has no per-fee discount — it's a flat charge.
        const ticketAfter = ticketBase;
        return {
            total: round2(divisionsAfterAll + ticketAfter),
            baseTotal: round2(divisionsBase + ticketBase),
            divisionsBase: round2(divisionsBase),
            divisionsAfterMember: round2(divisionsAfterMember),
            divisionsAfterAll,
            ticketAfter: round2(ticketAfter),
            memberSavings: round2(memberSavings),
            multiDiscountActive: multiActive,
            multiDiscountAmount,
        };
    }, [
        selected,
        selectedOptionalFees,
        event.memberDiscountActive,
        event.eventTicketPriceBdt,
        event.multiDivisionDiscountType,
        event.multiDivisionDiscountPercent,
    ]);

    const paid = totals.total > 0;
    const requiresDivision = event.divisions.length > 0;
    const missingDivision = requiresDivision && selected.length === 0;
    // Divisions that expose opt-in fees must have at least one picked before
    // the participant can submit — mirrors the server-side guard.
    const divisionsMissingOptional = selected.filter((d) => {
        const optional = d.fees?.filter((f) => !f.required) ?? [];
        if (optional.length === 0) return false;
        return !optional.some((f) =>
            selectedOptionalFees.has(`${d.code}:${f.id}`),
        );
    });
    const missingOptionalFee = divisionsMissingOptional.length > 0;
    const submitDisabled = missingDivision || missingOptionalFee;

    function toggle(code: string) {
        setSelectedCodes((prev) => {
            const next = new Set(prev);
            if (next.has(code)) next.delete(code);
            else next.add(code);
            return next;
        });
        // Drop any opt-in fees on a division that just got unchecked so the
        // hidden inputs and totals don't drift out of sync with the UI.
        setSelectedOptionalFees((prev) => {
            const next = new Set<string>();
            for (const key of prev) {
                if (!key.startsWith(`${code}:`)) next.add(key);
            }
            return next;
        });
    }

    function toggleOptionalFee(code: string, feeId: string) {
        const key = `${code}:${feeId}`;
        setSelectedOptionalFees((prev) => {
            const next = new Set(prev);
            if (next.has(key)) next.delete(key);
            else next.add(key);
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
            {Array.from(selectedOptionalFees).map((key) => (
                <input
                    key={key}
                    type="hidden"
                    name="optionalFee"
                    value={key}
                />
            ))}

            {member ? (
                <div className="text-sm text-zinc-700 bg-emerald-50 border border-emerald-200 rounded-sm px-4 py-3">
                    Registering as <b>{member.fullName}</b>
                    {member.memberNumber ? ` (ID: ${member.memberNumber})` : ""}.
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
                        name={member?.memberNumber ? undefined : "entrantGender"}
                        value={gender}
                        onChange={(e) => {
                            setGender(e.target.value as Gender);
                            setSelectedCodes(new Set());
                        }}
                        required
                        disabled={!!member?.memberNumber}
                        className={`${inputCx} disabled:bg-zinc-100 disabled:text-zinc-500 disabled:cursor-not-allowed`}
                    >
                        <option value="">Select…</option>
                        <option value="MALE">Male</option>
                        <option value="FEMALE">Female</option>
                    </select>
                    {member?.memberNumber && (
                        <input type="hidden" name="entrantGender" value={gender} />
                    )}
                </Field>
                <Field label="Date of birth" required>
                    <input
                        name="dateOfBirth"
                        type="date"
                        value={dobStr}
                        onChange={(e) => setDobStr(e.target.value)}
                        required
                        readOnly={!!member?.memberNumber}
                        className={`${inputCx} read-only:bg-zinc-100 read-only:text-zinc-500 read-only:cursor-not-allowed`}
                    />
                </Field>
            </div>

            {weightVisible && (
                <Field label="Weight (kg)" required={weightRequired}>
                    <input
                        name="entrantWeightKg"
                        type="number"
                        min={20}
                        max={200}
                        step="0.1"
                        value={weightKgStr}
                        onChange={(e) => setWeightKgStr(e.target.value)}
                        required={weightRequired}
                        placeholder="e.g. 67.5"
                        className={inputCx}
                    />
                    <p className="text-[11px] text-zinc-500 mt-1">
                        Needed to unlock weight-based divisions. Final weight
                        is confirmed at the on-day weigh-in.
                    </p>
                </Field>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <Field label="Belt rank">
                    <select
                        name={member?.memberNumber ? undefined : "entrantBeltRank"}
                        value={selectedRankName}
                        onChange={(e) => setSelectedRankName(e.target.value)}
                        disabled={!!member?.memberNumber}
                        className={`${inputCx} disabled:bg-zinc-100 disabled:text-zinc-500 disabled:cursor-not-allowed`}
                    >
                        <option value="">
                            Select your rank (optional)
                        </option>
                        {event.beltRanks.map((r) => (
                            <option key={r.id} value={r.name}>
                                {formatBeltRank(r.name)}
                            </option>
                        ))}
                    </select>
                    {member?.memberNumber && (
                        <input
                            type="hidden"
                            name="entrantBeltRank"
                            value={selectedRankName}
                        />
                    )}
                </Field>
                <Field label="Dojo">
                    <input
                        name="entrantDojoName"
                        type="text"
                        defaultValue={member?.dojoName ?? ""}
                        placeholder="Home dojo"
                        readOnly={!!member?.memberNumber}
                        className={`${inputCx} read-only:bg-zinc-100 read-only:text-zinc-500 read-only:cursor-not-allowed`}
                    />
                </Field>
            </div>
            {event.divisions.length > 0 && (
                <p className="text-[11px] text-amber-800 bg-amber-50 border border-amber-200 rounded-sm px-3 py-2 -mt-2">
                    You must bring your belt test results or certificate to
                    justify your rank.
                </p>
            )}

            <Field label="Coach name (optional)">
                <input
                    name="coachName"
                    type="text"
                    defaultValue={member?.coachName ?? ""}
                    className={inputCx}
                />
            </Field>

            <Field label="Profile photo (optional · JPG/PNG · appears on your card)">
                {member?.avatarUrl && (
                    <div className="flex items-center gap-3 mb-2">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                            src={member.avatarUrl}
                            alt="Current profile photo"
                            className="w-14 h-14 rounded-full object-cover border border-zinc-200"
                        />
                        <p className="text-[11px] text-zinc-500">
                            Using your profile photo. Upload a new one below to
                            replace it for this event.
                        </p>
                    </div>
                )}
                {member?.avatarUrl && (
                    <input
                        type="hidden"
                        name="existingProfileImageUrl"
                        value={member.avatarUrl}
                    />
                )}
                <input
                    name="profileImage"
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    className="w-full text-xs text-zinc-600 file:mr-3 file:py-2 file:px-3 file:rounded-sm file:border file:border-zinc-200 file:bg-zinc-50 file:text-zinc-700 file:text-[10px] file:font-bold file:uppercase file:tracking-widest hover:file:bg-zinc-100 cursor-pointer"
                />
            </Field>

            {event.divisions.length > 0 && (
            <div>
                <p className="text-[10px] tracking-widest uppercase font-bold text-zinc-500 mb-2">
                    Divisions <span className="text-accent-red">*</span>
                </p>
                <p className="text-[11px] text-zinc-500 mb-3">
                    Pick every division you want to enter. Prices add up.
                </p>
                {cannotRegister && (
                    <div className="text-xs text-blue-800 bg-blue-50 border border-blue-200 rounded-sm px-3 py-3 mb-3">
                        <p className="font-semibold">
                            No available division for your &quot;Rank/age&quot;
                        </p>
                    </div>
                )}
                <ul className="space-y-2">
                    {eligibility.map(({ d, reason }) => {
                        const checked = effectiveSelected.has(d.code);
                        const disabled = !!reason;
                        const base = priceForBase(d);
                        const effective = priceForAfterMember(d);
                        const requiredFees =
                            d.fees?.filter((f) => f.required) ?? [];
                        const optionalFees =
                            d.fees?.filter((f) => !f.required) ?? [];
                        return (
                            <li key={d.code}>
                                <div
                                    className={`border rounded-sm ${
                                        disabled
                                            ? "border-zinc-100 bg-zinc-50 text-zinc-400"
                                            : checked
                                              ? "border-accent-red bg-accent-red/5"
                                              : "border-zinc-200 bg-white hover:border-zinc-300"
                                    }`}
                                >
                                    <label
                                        className={`flex items-start gap-3 px-3 py-2.5 select-none ${
                                            disabled
                                                ? "cursor-not-allowed"
                                                : "cursor-pointer"
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
                                                    ৳{effective.toLocaleString()}
                                                    {base > 0 &&
                                                        event.memberDiscountActive &&
                                                        effective !== base && (
                                                            <span className="ml-2 text-zinc-400 text-xs line-through font-normal">
                                                                ৳{base.toLocaleString()}
                                                            </span>
                                                        )}
                                                </span>
                                            </div>
                                            <div className="flex flex-wrap items-center gap-2 mt-1">
                                                {d.isTeam && (
                                                    <span className="text-[10px] uppercase tracking-widest font-bold text-zinc-500">
                                                        Team
                                                    </span>
                                                )}
                                                {d.membersOnly && (
                                                    <span className="text-[10px] uppercase tracking-widest font-bold text-accent-red">
                                                        Members only
                                                    </span>
                                                )}
                                                {d.gender !== "ANY" && (
                                                    <span className="text-[10px] uppercase tracking-widest text-zinc-500">
                                                        ·{" "}
                                                        {d.gender === "MALE"
                                                            ? "Male"
                                                            : "Female"}
                                                    </span>
                                                )}
                                                {(d.minAge !== null ||
                                                    d.maxAge !== null) && (
                                                    <span className="text-[10px] uppercase tracking-widest text-zinc-500">
                                                        · Age{" "}
                                                        {d.minAge !== null && d.maxAge !== null
                                                            ? `${d.minAge}–${d.maxAge}`
                                                            : d.minAge !== null
                                                              ? `${d.minAge}+`
                                                              : `≤${d.maxAge}`}
                                                    </span>
                                                )}
                                                {(d.minWeightKg !== null ||
                                                    d.maxWeightKg !== null) && (
                                                    <span className="text-[10px] uppercase tracking-widest text-zinc-500">
                                                        ·{" "}
                                                        {d.minWeightKg !== null &&
                                                        d.maxWeightKg !== null
                                                            ? `${d.minWeightKg}–${d.maxWeightKg} kg`
                                                            : d.minWeightKg !== null
                                                              ? `${d.minWeightKg}+ kg`
                                                              : `≤${d.maxWeightKg} kg`}
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
                                                        Locked: {reason}
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    </label>
                                    {checked &&
                                        (requiredFees.length > 0 ||
                                            optionalFees.length > 0) && (
                                            <div className="mx-3 pb-2.5 pt-3 border-t border-dashed border-zinc-200 space-y-3 pl-7">
                                                {requiredFees.length > 0 && (
                                                    <div className="space-y-1.5">
                                                        <p className="text-[10px] tracking-widest uppercase font-bold text-zinc-500">
                                                            Included
                                                        </p>
                                                        {requiredFees.map(
                                                            (f) => (
                                                                <div
                                                                    key={f.id}
                                                                    className="flex items-center justify-between gap-3 text-xs text-zinc-700"
                                                                >
                                                                    <span className="inline-flex items-center gap-2">
                                                                        {f.name}
                                                                        {event.memberDiscountActive &&
                                                                            f.memberDiscountValue >
                                                                                0 && (
                                                                                <span className="text-[10px] tracking-widest uppercase font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-sm px-1.5 py-0.5">
                                                                                    {formatTypedDiscount(
                                                                                        f.memberDiscountType,
                                                                                        f.memberDiscountValue,
                                                                                    )}
                                                                                </span>
                                                                            )}
                                                                    </span>
                                                                    <span className="text-zinc-600 whitespace-nowrap">
                                                                        ৳
                                                                        {feeAmountAfterMemberDiscount(
                                                                            f,
                                                                            event.memberDiscountActive,
                                                                        ).toLocaleString()}
                                                                        {event.memberDiscountActive &&
                                                                            f.memberDiscountValue >
                                                                                0 && (
                                                                                <span className="ml-1.5 text-zinc-400 text-[11px] line-through">
                                                                                    ৳
                                                                                    {f.amountBdt.toLocaleString()}
                                                                                </span>
                                                                            )}
                                                                    </span>
                                                                </div>
                                                            ),
                                                        )}
                                                    </div>
                                                )}
                                                {optionalFees.length > 0 && (
                                                    <div className="space-y-1.5">
                                                        <p className="text-[10px] tracking-widest uppercase font-bold text-zinc-500">
                                                            Choose any 1 or more from below{" "}
                                                            <span className="text-accent-red">*</span>
                                                        </p>
                                                        {optionalFees.map((f) => {
                                                const key = `${d.code}:${f.id}`;
                                                const feeChecked =
                                                    selectedOptionalFees.has(key);
                                                return (
                                                    <label
                                                        key={f.id}
                                                        className="flex items-center justify-between gap-3 text-xs text-zinc-700 select-none cursor-pointer"
                                                    >
                                                        <span className="inline-flex items-center gap-2">
                                                            <input
                                                                type="checkbox"
                                                                className="h-3.5 w-3.5 accent-red-600 cursor-pointer"
                                                                checked={feeChecked}
                                                                onChange={() =>
                                                                    toggleOptionalFee(
                                                                        d.code,
                                                                        f.id,
                                                                    )
                                                                }
                                                            />
                                                            {f.name}
                                                            {event.memberDiscountActive &&
                                                                f.memberDiscountValue >
                                                                    0 && (
                                                                    <span className="text-[10px] tracking-widest uppercase font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-sm px-1.5 py-0.5">
                                                                        {formatTypedDiscount(
                                                                            f.memberDiscountType,
                                                                            f.memberDiscountValue,
                                                                        )}
                                                                    </span>
                                                                )}
                                                        </span>
                                                        <span className="text-zinc-600 whitespace-nowrap">
                                                            +৳
                                                            {feeAmountAfterMemberDiscount(
                                                                f,
                                                                event.memberDiscountActive,
                                                            ).toLocaleString()}
                                                            {event.memberDiscountActive &&
                                                                f.memberDiscountValue >
                                                                    0 && (
                                                                    <span className="ml-1.5 text-zinc-400 text-[11px] line-through">
                                                                        ৳
                                                                        {f.amountBdt.toLocaleString()}
                                                                    </span>
                                                                )}
                                                        </span>
                                                    </label>
                                                );
                                            })}
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                </div>
                            </li>
                        );
                    })}
                </ul>
                {!cannotRegister && selected.length === 0 && (
                    <p className="text-[11px] text-zinc-600 bg-zinc-50 border border-zinc-200 rounded-sm px-3 py-2 mt-3">
                        Pick at least one division to continue.
                    </p>
                )}
            </div>
            )}

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
                                defaultValue={member?.guardianName ?? ""}
                                className={inputCx}
                            />
                        </Field>
                        <Field label="Guardian phone" required>
                            <input
                                name="guardianPhone"
                                type="tel"
                                required
                                inputMode="numeric"
                                defaultValue={member?.guardianPhone ?? ""}
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
                    <div className="border-t border-zinc-200 pt-4">
                        <p className="text-[10px] tracking-widest uppercase font-bold text-zinc-500 mb-2">
                            Subtotal
                        </p>
                        <ul className="space-y-1.5 mb-3">
                            {selected.map((d) => {
                                const requiredFees =
                                    d.fees?.filter((f) => f.required) ?? [];
                                const chosenOptional =
                                    d.fees?.filter(
                                        (f) =>
                                            !f.required &&
                                            selectedOptionalFees.has(
                                                `${d.code}:${f.id}`,
                                            ),
                                    ) ?? [];
                                const legacyPrice =
                                    (!d.fees || d.fees.length === 0)
                                        ? divisionBasePrice(d)
                                        : 0;
                                return (
                                    <li key={d.code} className="text-xs">
                                        <div className="text-zinc-700 font-semibold mb-0.5">
                                            {d.label}
                                        </div>
                                        <ul className="pl-3 space-y-0.5 text-zinc-600">
                                            {requiredFees.map((f) => (
                                                <li
                                                    key={f.id}
                                                    className="flex items-center justify-between gap-3"
                                                >
                                                    <span className="truncate">
                                                        {f.name}
                                                        {event.memberDiscountActive &&
                                                            f.memberDiscountValue >
                                                                0 && (
                                                                <span className="ml-1.5 text-[10px] tracking-widest uppercase font-bold text-emerald-700">
                                                                    {formatTypedDiscount(
                                                                        f.memberDiscountType,
                                                                        f.memberDiscountValue,
                                                                    )}
                                                                </span>
                                                            )}
                                                    </span>
                                                    <span className="whitespace-nowrap">
                                                        ৳
                                                        {feeAmountAfterMemberDiscount(
                                                            f,
                                                            event.memberDiscountActive,
                                                        ).toLocaleString()}
                                                        {event.memberDiscountActive &&
                                                            f.memberDiscountValue >
                                                                0 && (
                                                                <span className="ml-1.5 text-zinc-400 line-through">
                                                                    ৳
                                                                    {f.amountBdt.toLocaleString()}
                                                                </span>
                                                            )}
                                                    </span>
                                                </li>
                                            ))}
                                            {chosenOptional.map((f) => (
                                                <li
                                                    key={f.id}
                                                    className="flex items-center justify-between gap-3"
                                                >
                                                    <span className="truncate">
                                                        + {f.name}
                                                        <span className="ml-1 text-[10px] tracking-widest uppercase text-zinc-400">
                                                            add-on
                                                        </span>
                                                        {event.memberDiscountActive &&
                                                            f.memberDiscountValue >
                                                                0 && (
                                                                <span className="ml-1.5 text-[10px] tracking-widest uppercase font-bold text-emerald-700">
                                                                    {formatTypedDiscount(
                                                                        f.memberDiscountType,
                                                                        f.memberDiscountValue,
                                                                    )}
                                                                </span>
                                                            )}
                                                    </span>
                                                    <span className="whitespace-nowrap">
                                                        ৳
                                                        {feeAmountAfterMemberDiscount(
                                                            f,
                                                            event.memberDiscountActive,
                                                        ).toLocaleString()}
                                                        {event.memberDiscountActive &&
                                                            f.memberDiscountValue >
                                                                0 && (
                                                                <span className="ml-1.5 text-zinc-400 line-through">
                                                                    ৳
                                                                    {f.amountBdt.toLocaleString()}
                                                                </span>
                                                            )}
                                                    </span>
                                                </li>
                                            ))}
                                            {legacyPrice > 0 && (
                                                <li className="flex items-center justify-between gap-3">
                                                    <span className="truncate">
                                                        Entry
                                                    </span>
                                                    <span className="whitespace-nowrap">
                                                        ৳
                                                        {legacyPrice.toLocaleString()}
                                                    </span>
                                                </li>
                                            )}
                                        </ul>
                                    </li>
                                );
                            })}
                            {totals.ticketAfter > 0 && (
                                <li className="flex items-center justify-between gap-3 text-xs text-zinc-600 pt-1 border-t border-dashed border-zinc-200">
                                    <span>Event ticket</span>
                                    <span>
                                        ৳{totals.ticketAfter.toLocaleString()}
                                    </span>
                                </li>
                            )}
                        </ul>

                        <div className="border-t border-zinc-200 pt-2 space-y-1 text-xs text-zinc-600">
                            <div className="flex items-center justify-between">
                                <span>Subtotal</span>
                                <span>
                                    ৳{totals.baseTotal.toLocaleString()}
                                </span>
                            </div>
                            {event.memberDiscountActive &&
                                totals.memberSavings > 0 && (
                                    <div className="flex items-center justify-between text-emerald-700">
                                        <span>JKA member discount</span>
                                        <span>
                                            −৳
                                            {totals.memberSavings.toLocaleString()}
                                        </span>
                                    </div>
                                )}
                            {totals.multiDiscountActive &&
                                totals.multiDiscountAmount > 0 && (
                                    <div className="flex items-center justify-between text-emerald-700">
                                        <span>
                                            Multi-division discount (
                                            {formatTypedDiscount(
                                                event.multiDivisionDiscountType,
                                                event.multiDivisionDiscountPercent,
                                            )}
                                            )
                                        </span>
                                        <span>
                                            −৳
                                            {totals.multiDiscountAmount.toLocaleString()}
                                        </span>
                                    </div>
                                )}
                        </div>

                        <div className="flex items-center justify-between text-sm mt-3 pt-2 border-t border-zinc-200">
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
                                {totals.total !== totals.baseTotal && (
                                    <span className="ml-2 text-zinc-400 text-xs line-through font-normal">
                                        ৳{totals.baseTotal.toLocaleString()}
                                    </span>
                                )}
                            </span>
                        </div>
                    </div>
                    {missingOptionalFee && (
                        <p className="text-[11px] text-amber-800 bg-amber-50 border border-amber-200 rounded-sm px-3 py-2 text-center">
                            Choose at least one add-on for:{" "}
                            {divisionsMissingOptional
                                .map((d) => d.label)
                                .join(", ")}
                            .
                        </p>
                    )}
                    <button
                        type="submit"
                        disabled={submitDisabled}
                        className="w-full inline-flex items-center justify-center gap-2 bg-accent-red text-white px-4 py-3 text-xs font-bold tracking-widest uppercase hover:bg-accent-red/90 disabled:opacity-40 disabled:cursor-not-allowed transition-colors rounded-sm"
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
                <>
                    {missingOptionalFee && (
                        <p className="text-[11px] text-amber-800 bg-amber-50 border border-amber-200 rounded-sm px-3 py-2 text-center">
                            Choose at least one add-on for:{" "}
                            {divisionsMissingOptional
                                .map((d) => d.label)
                                .join(", ")}
                            .
                        </p>
                    )}
                    <button
                        type="submit"
                        disabled={submitDisabled}
                        className="w-full inline-flex items-center justify-center gap-2 bg-accent-red text-white px-4 py-3 text-xs font-bold tracking-widest uppercase hover:bg-accent-red/90 disabled:opacity-40 disabled:cursor-not-allowed transition-colors rounded-sm"
                    >
                        Complete registration
                    </button>
                </>
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
