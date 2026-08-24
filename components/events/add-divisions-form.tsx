"use client";

import { useMemo, useState } from "react";
import { Ticket, CheckCircle2 } from "lucide-react";
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
import { addDivisionsAndRedirect } from "@/app/actions/event-registration";
import { formatBeltRank } from "@/lib/constants";

export type AddDivisionsBeltRank = {
    id: string;
    name: string;
    orderIndex: number;
};

export type AddDivisionsEvent = {
    id: string;
    title: string;
    eventDate: string; // ISO
    memberDiscountActive: boolean;
    divisions: CustomDivision[];
    multiDivisionDiscountType: DiscountType;
    multiDivisionDiscountPercent: number;
    registrationDeadline: string | null;
    beltRanks: AddDivisionsBeltRank[];
};

export type ExistingMember = {
    fullName: string;
    memberNumber: string | null;
    gender: Gender | null;
    dateOfBirth: string | null; // ISO date
    beltRank: string | null;
    dojoName: string | null;
    weightKg: number | null;
    /** Codes the member is already registered for on this event. */
    existingDivisionCodes: string[];
    /** Fee ids the member has already picked, keyed by division code. */
    pickedAddonIdsByCode: Record<string, string[]>;
    rankOrderIndex: number | null;
};

export default function AddDivisionsForm({
    event,
    member,
    initialError,
}: {
    event: AddDivisionsEvent;
    member: ExistingMember;
    initialError: string | null;
}) {
    const eventDate = useMemo(() => new Date(event.eventDate), [event.eventDate]);
    const dob = member.dateOfBirth ? new Date(member.dateOfBirth) : null;
    const age = dob ? ageOnDate(dob, eventDate) : null;

    const existingCodes = useMemo(
        () => new Set(member.existingDivisionCodes),
        [member.existingDivisionCodes],
    );
    const pickedAddonsByCode = useMemo(() => {
        const map = new Map<string, Set<string>>();
        for (const [code, ids] of Object.entries(member.pickedAddonIdsByCode)) {
            map.set(code, new Set(ids));
        }
        return map;
    }, [member.pickedAddonIdsByCode]);
    function isAddonAlreadyPicked(code: string, feeId: string): boolean {
        return pickedAddonsByCode.get(code)?.has(feeId) ?? false;
    }

    const [weightKgStr, setWeightKgStr] = useState<string>(
        member.weightKg != null ? String(member.weightKg) : "",
    );
    const weightKg = weightKgStr.trim()
        ? Number.parseFloat(weightKgStr)
        : null;
    const weightProvided = weightKg !== null && Number.isFinite(weightKg);
    const [selectedCodes, setSelectedCodes] = useState<Set<string>>(new Set());
    const [selectedOptionalFees, setSelectedOptionalFees] = useState<
        Set<string>
    >(new Set());

    const rankByOrder = useMemo(() => {
        const map = new Map<string, number>();
        for (const r of event.beltRanks) map.set(r.id, r.orderIndex);
        return map;
    }, [event.beltRanks]);

    type EligibleDivision = {
        d: CustomDivision;
        reason: string | null;
        alreadyRegistered: boolean;
    };

    const eligibility = useMemo<EligibleDivision[]>(() => {
        return event.divisions.map((d) => {
            const alreadyRegistered = existingCodes.has(d.code);
            const reasons: string[] = [];
            if (d.gender !== "ANY") {
                if (!member.gender) {
                    reasons.push("gender missing on file");
                } else if (d.gender !== member.gender) {
                    reasons.push(
                        d.gender === "MALE" ? "male only" : "female only",
                    );
                }
            }
            if (d.minAge !== null || d.maxAge !== null) {
                if (age === null) {
                    reasons.push("date of birth missing");
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
            const hasWeightGate =
                d.minWeightKg !== null || d.maxWeightKg !== null;
            const needsWeight = hasWeightGate || d.eventType === "KUMITE";
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
                    if (member.rankOrderIndex === null) {
                        reasons.push("belt rank missing on file");
                    } else if (member.rankOrderIndex < required) {
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
                alreadyRegistered,
            };
        });
    }, [
        event.divisions,
        event.beltRanks,
        existingCodes,
        member.gender,
        member.rankOrderIndex,
        age,
        weightKg,
        weightProvided,
        rankByOrder,
    ]);

    const eligibleCodes = useMemo(() => {
        const s = new Set<string>();
        for (const { d, reason, alreadyRegistered } of eligibility) {
            if (!reason && !alreadyRegistered) s.add(d.code);
        }
        return s;
    }, [eligibility]);
    const effectiveSelected = useMemo(() => {
        const next = new Set<string>();
        for (const c of selectedCodes) if (eligibleCodes.has(c)) next.add(c);
        return next;
    }, [selectedCodes, eligibleCodes]);
    const selected = useMemo(
        () => event.divisions.filter((d) => effectiveSelected.has(d.code)),
        [event.divisions, effectiveSelected],
    );
    const anyTeam = selected.some((d) => d.isTeam);

    // Weight input appears whenever any addable division would need it —
    // matches the main registration form's UX so the picker can unlock
    // weight-gated divisions dynamically.
    const weightVisible = event.divisions.some(
        (d) =>
            !existingCodes.has(d.code) &&
            (d.eventType === "KUMITE" ||
                d.minWeightKg !== null ||
                d.maxWeightKg !== null),
    );
    const weightRequired = selected.some(
        (d) =>
            d.eventType === "KUMITE" ||
            d.minWeightKg !== null ||
            d.maxWeightKg !== null,
    );

    function feeIsActive(divisionCode: string, fee: DivisionFee): boolean {
        return (
            fee.required || selectedOptionalFees.has(`${divisionCode}:${fee.id}`)
        );
    }

    function priceForBase(d: CustomDivision): number {
        if (!d.fees || d.fees.length === 0) return divisionBasePrice(d);
        let total = 0;
        for (const f of d.fees) if (feeIsActive(d.code, f)) total += f.amountBdt;
        return Math.round(total * 100) / 100;
    }

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

    function feeMemberSavings(fee: DivisionFee): number {
        if (!event.memberDiscountActive || fee.memberDiscountValue <= 0) {
            return 0;
        }
        const after = feeAmountAfterMemberDiscount(fee, true);
        return Math.round((fee.amountBdt - after) * 100) / 100;
    }

    // Existing + newly-picked count decides whether the multi-division
    // discount applies. The discount is applied to the newly-added subtotal
    // only — the original registration already settled on its own price.
    const totalDivisionsAfter = existingCodes.size + selected.length;

    // Addons picked on divisions the member is already registered for —
    // billed separately (no multi-div discount) since the underlying division
    // was already paid.
    const existingDivisionAddonAdds = useMemo(() => {
        const rows: Array<{
            division: CustomDivision;
            fee: DivisionFee;
        }> = [];
        for (const d of event.divisions) {
            if (!existingCodes.has(d.code)) continue;
            const optional = d.fees?.filter((f) => !f.required) ?? [];
            for (const f of optional) {
                if (isAddonAlreadyPicked(d.code, f.id)) continue;
                if (selectedOptionalFees.has(`${d.code}:${f.id}`)) {
                    rows.push({ division: d, fee: f });
                }
            }
        }
        return rows;
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [event.divisions, existingCodes, selectedOptionalFees]);

    type LineItem = {
        key: string;
        label: string;
        price: number;
        basePrice: number;
    };

    // Itemised list shown in the payment summary — one row per selected fee
    // (or per division when the division has no separate fee schedule).
    const lineItems = useMemo<LineItem[]>(() => {
        const items: LineItem[] = [];
        for (const d of selected) {
            if (d.fees && d.fees.length > 0) {
                for (const f of d.fees) {
                    if (!feeIsActive(d.code, f)) continue;
                    items.push({
                        key: `${d.code}:${f.id}`,
                        label: `${d.label} — ${f.name}`,
                        price: feeAmountAfterMemberDiscount(
                            f,
                            event.memberDiscountActive,
                        ),
                        basePrice: f.amountBdt,
                    });
                }
            } else {
                const base = divisionBasePrice(d);
                items.push({
                    key: d.code,
                    label: d.label,
                    price: base,
                    basePrice: base,
                });
            }
        }
        for (const { division, fee } of existingDivisionAddonAdds) {
            items.push({
                key: `${division.code}:${fee.id}`,
                label: `${division.label} — ${fee.name}`,
                price: feeAmountAfterMemberDiscount(
                    fee,
                    event.memberDiscountActive,
                ),
                basePrice: fee.amountBdt,
            });
        }
        return items;
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [
        selected,
        selectedOptionalFees,
        existingDivisionAddonAdds,
        event.memberDiscountActive,
    ]);

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
        // Add-on prices for existing divisions — no multi-div discount here.
        let addonBase = 0;
        let addonAfterMember = 0;
        for (const { fee } of existingDivisionAddonAdds) {
            addonBase += fee.amountBdt;
            addonAfterMember += feeAmountAfterMemberDiscount(
                fee,
                event.memberDiscountActive,
            );
            memberSavings += feeMemberSavings(fee);
        }
        const multiActive =
            totalDivisionsAfter >= 2 &&
            event.multiDivisionDiscountPercent > 0 &&
            divisionsAfterMember > 0;
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
        return {
            total: round2(divisionsAfterAll + addonAfterMember),
            baseTotal: round2(divisionsBase + addonBase),
            divisionsAfterMember: round2(divisionsAfterMember),
            addonAfterMember: round2(addonAfterMember),
            memberSavings: round2(memberSavings),
            multiDiscountActive: multiActive,
            multiDiscountAmount,
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [
        selected,
        selectedOptionalFees,
        existingDivisionAddonAdds,
        event.memberDiscountActive,
        event.multiDivisionDiscountType,
        event.multiDivisionDiscountPercent,
        totalDivisionsAfter,
    ]);

    const paid = totals.total > 0;
    // Something to submit = at least one new division OR at least one new
    // addon on an existing (already-registered) division.
    const nothingToAdd =
        selected.length === 0 && existingDivisionAddonAdds.length === 0;
    const divisionsMissingOptional = selected.filter((d) => {
        const optional = d.fees?.filter((f) => !f.required) ?? [];
        if (optional.length === 0) return false;
        return !optional.some((f) =>
            selectedOptionalFees.has(`${d.code}:${f.id}`),
        );
    });
    const missingOptionalFee = divisionsMissingOptional.length > 0;
    const submitDisabled =
        nothingToAdd ||
        missingOptionalFee ||
        (weightRequired && !weightProvided);

    function toggle(code: string) {
        setSelectedCodes((prev) => {
            const next = new Set(prev);
            if (next.has(code)) next.delete(code);
            else next.add(code);
            return next;
        });
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

    const registrationClosed = event.registrationDeadline
        ? new Date(event.registrationDeadline).getTime() < Date.now()
        : false;

    if (registrationClosed) {
        return (
            <div className="bg-white border border-zinc-200 rounded-sm shadow-sm p-6 text-center">
                <p className="text-base font-semibold text-zinc-900 mb-2">
                    Registration is closed.
                </p>
                <p className="text-sm text-zinc-500">
                    The deadline for this event has passed. New divisions can no
                    longer be added.
                </p>
            </div>
        );
    }

    return (
        <form
            action={addDivisionsAndRedirect}
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

            <div className="text-sm text-zinc-700 bg-emerald-50 border border-emerald-200 rounded-sm px-4 py-3">
                Adding to <b>{member.fullName}</b>&apos;s registration
                {member.memberNumber ? ` (ID: ${member.memberNumber})` : ""}.
                Personal details, emergency contact and profile photo carry over
                from your original registration.
            </div>

            {weightVisible && (
                <label className="block">
                    <span className="text-[10px] tracking-widest uppercase font-bold text-zinc-500 block mb-1">
                        Weight (kg)
                        {weightRequired && (
                            <span className="text-accent-red ml-1">*</span>
                        )}
                    </span>
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
                        Needed to unlock weight-based divisions. Final weight is
                        confirmed at the on-day weigh-in.
                    </p>
                </label>
            )}

            <div>
                <p className="text-[10px] tracking-widest uppercase font-bold text-zinc-500 mb-2">
                    Divisions <span className="text-accent-red">*</span>
                </p>
                <p className="text-[11px] text-zinc-500 mb-3">
                    Divisions you&apos;re already in are locked. Pick any of the
                    remaining ones to add. Prices add up.
                </p>
                <ul className="space-y-2">
                    {eligibility.map(({ d, reason, alreadyRegistered }) => {
                        const checked = effectiveSelected.has(d.code);
                        const disabled = alreadyRegistered || !!reason;
                        const base = priceForBase(d);
                        const effective = priceForAfterMember(d);
                        const requiredFees =
                            d.fees?.filter((f) => f.required) ?? [];
                        const optionalFees =
                            d.fees?.filter((f) => !f.required) ?? [];
                        // For already-registered divisions we always expand
                        // the optional fees so the member can pick ones they
                        // missed the first time round.
                        const showAddonsPanel =
                            (checked && !alreadyRegistered) ||
                            (alreadyRegistered && optionalFees.length > 0);
                        const missedOptionalFees = alreadyRegistered
                            ? optionalFees.filter(
                                  (f) => !isAddonAlreadyPicked(d.code, f.id),
                              )
                            : optionalFees;
                        return (
                            <li key={d.code}>
                                <div
                                    className={`border rounded-sm ${
                                        alreadyRegistered
                                            ? "border-emerald-200 bg-emerald-50/50 text-zinc-500"
                                            : disabled
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
                                            checked={
                                                alreadyRegistered || checked
                                            }
                                            disabled={disabled}
                                            onChange={() => toggle(d.code)}
                                        />
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center justify-between gap-3">
                                                <span className="text-sm font-semibold text-zinc-900 truncate">
                                                    {d.label}
                                                </span>
                                                {!alreadyRegistered && (
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
                                                )}
                                            </div>
                                            <div className="flex flex-wrap items-center gap-2 mt-1">
                                                {alreadyRegistered && (
                                                    <span className="text-[10px] uppercase tracking-widest font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-sm px-1.5 py-0.5 inline-flex items-center gap-1">
                                                        <CheckCircle2
                                                            size={10}
                                                        />
                                                        Already registered
                                                    </span>
                                                )}
                                                {d.isTeam && (
                                                    <span className="text-[10px] uppercase tracking-widest font-bold text-zinc-500">
                                                        Team
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
                                                        {d.minAge !== null &&
                                                        d.maxAge !== null
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
                                                        {(() => {
                                                            const r = event.beltRanks.find(
                                                                (r) =>
                                                                    r.id === d.minRankId,
                                                            );
                                                            return r
                                                                ? formatBeltRank(
                                                                      r.name,
                                                                  )
                                                                : "belt";
                                                        })()}
                                                        +
                                                    </span>
                                                )}
                                                {!alreadyRegistered && reason && (
                                                    <span className="text-[10px] text-amber-700 bg-amber-50 border border-amber-200 rounded-sm px-1.5 py-0.5">
                                                        Locked: {reason}
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    </label>
                                    {showAddonsPanel && (
                                            <div className="mx-3 pb-2.5 pt-3 border-t border-dashed border-zinc-200 space-y-3 pl-7">
                                                {!alreadyRegistered &&
                                                    requiredFees.length > 0 && (
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
                                                {alreadyRegistered &&
                                                    optionalFees.filter((f) =>
                                                        isAddonAlreadyPicked(
                                                            d.code,
                                                            f.id,
                                                        ),
                                                    ).length > 0 && (
                                                        <div className="space-y-1.5">
                                                            <p className="text-[10px] tracking-widest uppercase font-bold text-zinc-500">
                                                                Already added
                                                            </p>
                                                            {optionalFees
                                                                .filter((f) =>
                                                                    isAddonAlreadyPicked(
                                                                        d.code,
                                                                        f.id,
                                                                    ),
                                                                )
                                                                .map((f) => (
                                                                    <label
                                                                        key={f.id}
                                                                        className="flex items-center justify-between gap-3 text-xs text-zinc-400 select-none cursor-not-allowed"
                                                                    >
                                                                        <span className="inline-flex items-center gap-2">
                                                                            <input
                                                                                type="checkbox"
                                                                                className="h-3.5 w-3.5 accent-emerald-600"
                                                                                checked
                                                                                disabled
                                                                                readOnly
                                                                            />
                                                                            <span className="line-through">
                                                                                {f.name}
                                                                            </span>
                                                                            <span className="text-[10px] tracking-widest uppercase font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-sm px-1.5 py-0.5">
                                                                                Paid
                                                                            </span>
                                                                        </span>
                                                                    </label>
                                                                ))}
                                                        </div>
                                                    )}
                                                {(alreadyRegistered
                                                    ? missedOptionalFees.length > 0
                                                    : optionalFees.length > 0) && (
                                                    <div className="space-y-1.5">
                                                        <p className="text-[10px] tracking-widest uppercase font-bold text-zinc-500">
                                                            {alreadyRegistered
                                                                ? "Add-ons you missed"
                                                                : "Choose any 1 or more from below"}
                                                            {!alreadyRegistered && (
                                                                <span className="text-accent-red">
                                                                    {" "}*
                                                                </span>
                                                            )}
                                                        </p>
                                                        {(alreadyRegistered
                                                            ? missedOptionalFees
                                                            : optionalFees
                                                        ).map((f) => {
                                                            const key = `${d.code}:${f.id}`;
                                                            const feeChecked =
                                                                selectedOptionalFees.has(
                                                                    key,
                                                                );
                                                            return (
                                                                <label
                                                                    key={f.id}
                                                                    className="flex items-center justify-between gap-3 text-xs text-zinc-700 select-none cursor-pointer"
                                                                >
                                                                    <span className="inline-flex items-center gap-2">
                                                                        <input
                                                                            type="checkbox"
                                                                            className="h-3.5 w-3.5 accent-red-600 cursor-pointer"
                                                                            checked={
                                                                                feeChecked
                                                                            }
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
                {nothingToAdd && (
                    <p className="text-[11px] text-zinc-600 bg-zinc-50 border border-zinc-200 rounded-sm px-3 py-2 mt-3">
                        Pick at least one new division or a missed add-on to
                        continue.
                    </p>
                )}
            </div>

            {anyTeam && (
                <div className="border border-zinc-200 rounded-sm bg-zinc-50 p-4 space-y-3">
                    <p className="text-[10px] tracking-widest uppercase font-bold text-zinc-500">
                        Team — teammates
                    </p>
                    <label className="block">
                        <span className="text-[10px] tracking-widest uppercase font-bold text-zinc-500 block mb-1">
                            Team name <span className="text-accent-red">*</span>
                        </span>
                        <input
                            name="teamName"
                            type="text"
                            required
                            className={inputCx}
                        />
                    </label>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <label className="block">
                            <span className="text-[10px] tracking-widest uppercase font-bold text-zinc-500 block mb-1">
                                Teammate 1 (name){" "}
                                <span className="text-accent-red">*</span>
                            </span>
                            <input
                                name="teammate1Name"
                                type="text"
                                required
                                className={inputCx}
                            />
                        </label>
                        <label className="block">
                            <span className="text-[10px] tracking-widest uppercase font-bold text-zinc-500 block mb-1">
                                Teammate 1 member # (optional)
                            </span>
                            <input
                                name="teammate1Member"
                                type="text"
                                className={inputCx}
                            />
                        </label>
                        <label className="block">
                            <span className="text-[10px] tracking-widest uppercase font-bold text-zinc-500 block mb-1">
                                Teammate 2 (name){" "}
                                <span className="text-accent-red">*</span>
                            </span>
                            <input
                                name="teammate2Name"
                                type="text"
                                required
                                className={inputCx}
                            />
                        </label>
                        <label className="block">
                            <span className="text-[10px] tracking-widest uppercase font-bold text-zinc-500 block mb-1">
                                Teammate 2 member # (optional)
                            </span>
                            <input
                                name="teammate2Member"
                                type="text"
                                className={inputCx}
                            />
                        </label>
                    </div>
                </div>
            )}

            {initialError && (
                <p className="text-sm text-red-600">{initialError}</p>
            )}

            {paid && (
                <div className="border-t border-zinc-200 pt-4 space-y-1 text-xs text-zinc-600">
                    <p className="text-[10px] tracking-widest uppercase font-bold text-zinc-500 mb-1">
                        Selected items
                    </p>
                    {lineItems.map((item) => (
                        <div
                            key={item.key}
                            className="flex items-center justify-between gap-3"
                        >
                            <span className="truncate">{item.label}</span>
                            <span className="whitespace-nowrap">
                                ৳{item.basePrice.toLocaleString()}
                            </span>
                        </div>
                    ))}
                    {event.memberDiscountActive &&
                        totals.memberSavings > 0 && (
                            <div className="flex items-center justify-between text-emerald-700">
                                <span>JKA member discount</span>
                                <span>
                                    −৳{totals.memberSavings.toLocaleString()}
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
                    <div className="flex items-center justify-between text-sm mt-3 pt-2 border-t border-zinc-200">
                        <span className="font-bold text-zinc-900">
                            You&apos;ll pay
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
            )}

            {missingOptionalFee && (
                <p className="text-[11px] text-amber-800 bg-amber-50 border border-amber-200 rounded-sm px-3 py-2 text-center">
                    Choose at least one add-on for:{" "}
                    {divisionsMissingOptional.map((d) => d.label).join(", ")}.
                </p>
            )}
            <button
                type="submit"
                disabled={submitDisabled}
                className="w-full inline-flex items-center justify-center gap-2 bg-accent-red text-white px-4 py-3 text-xs font-bold tracking-widest uppercase hover:bg-accent-red/90 disabled:opacity-40 disabled:cursor-not-allowed transition-colors rounded-sm"
            >
                <Ticket size={14} />
                {paid
                    ? `Pay ৳${totals.total.toLocaleString()} & add`
                    : selected.length > 0
                      ? "Add divisions"
                      : "Add add-ons"}
            </button>
        </form>
    );
}

const inputCx =
    "w-full bg-zinc-50 border border-zinc-200 text-zinc-900 px-3 py-2.5 focus:outline-none focus:border-accent-red text-sm transition-colors rounded-sm";
