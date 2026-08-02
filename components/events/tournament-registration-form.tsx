"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Ticket, LogIn } from "lucide-react";
import {
    ageOnDate,
    checkDivisionEligibility,
    customToDivision,
    getDivision,
    isCustomDivisionCode,
    type CustomDivision,
    type Division,
    type Gender,
    type TournamentEventType,
} from "@/lib/tournaments/divisions";
import { registerForTournamentAndRedirect } from "@/app/actions/event-registration";

export type TournamentRegistrationEvent = {
    id: string;
    title: string;
    eventDate: string; // ISO
    ticketPrice: number | null;
    memberDiscountActive: boolean;
    baseTicketPrice: number | null;
    memberDiscountPercent: number;
    isPremium: boolean;
    // Types the tournament is running. May contain KATA, KUMITE, or both.
    enabledTypes: TournamentEventType[];
    enabledDivisions: string[];
    customDivisions: CustomDivision[];
    registrationDeadline: string | null; // ISO
};

export type MemberAutofill = {
    userId: string;
    fullName: string;
    email: string;
    phone: string | null;
    dateOfBirth: string | null; // ISO date
    gender: Gender | null;
    currentRank: string | null;
    dojoName: string | null;
    emergencyContactName: string | null;
    emergencyContactPhone: string | null;
} | null;

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

    // Enabled divisions, resolved to full Division objects. Unknown codes are
    // filtered out — a code that vanished from the preset is treated as
    // disabled rather than crashing the page. Custom codes are resolved from
    // the event's admin-defined list.
    const customByCode = useMemo(
        () => new Map(event.customDivisions.map((c) => [c.code, c])),
        [event.customDivisions],
    );
    const allEnabled = useMemo(
        () =>
            event.enabledDivisions
                .map((c): Division | null => {
                    if (isCustomDivisionCode(c)) {
                        const custom = customByCode.get(c);
                        return custom ? customToDivision(custom) : null;
                    }
                    return getDivision(c) ?? null;
                })
                .filter((d): d is Division => !!d),
        [event.enabledDivisions, customByCode],
    );

    const [gender, setGender] = useState<Gender | "">(
        member?.gender ?? "",
    );
    const [dobStr, setDobStr] = useState<string>(member?.dateOfBirth ?? "");
    const [weightKgStr, setWeightKgStr] = useState<string>("");
    // Two independent picks so a participant can enter one Kata + one Kumite
    // in a single submission. Either can be empty; at least one must be set.
    const [kataCode, setKataCode] = useState<string>("");
    const [kumiteCode, setKumiteCode] = useState<string>("");

    // Compute the participant's age at the event so we can filter divisions
    // and decide whether the guardian block is required. If DOB isn't filled
    // yet we can't filter — show all enabled divisions of the right gender.
    const dob = dobStr ? new Date(dobStr) : null;
    const age = dob ? ageOnDate(dob, eventDate) : null;
    const isMinor = age !== null && age < 18;

    const weightKg =
        weightKgStr.trim() !== "" ? Number.parseFloat(weightKgStr) : null;

    const availableDivisions = useMemo(() => {
        if (!gender) return [] as Division[];
        return allEnabled
            .filter((d) => {
                // Custom divisions aren't gender-locked (see divisions.ts).
                if (isCustomDivisionCode(d.code)) return true;
                return d.gender === gender;
            })
            .filter((d) => {
                if (!dob) return true; // relax when DOB missing; server enforces
                if (isCustomDivisionCode(d.code)) return true;
                const issue = checkDivisionEligibility(d, {
                    gender,
                    dob,
                    eventDate,
                    weightKg: weightKg ?? undefined,
                });
                // Weight-required is fine at picker time — user hasn't entered
                // their weight yet. Only hide when age is off.
                if (issue === "age-below-min" || issue === "age-above-max")
                    return false;
                if (
                    weightKg !== null &&
                    (issue === "weight-below-min" ||
                        issue === "weight-above-max")
                )
                    return false;
                return true;
            });
    }, [allEnabled, gender, dob, weightKg, eventDate]);

    // Group the picker by event type so an event running both Kata and Kumite
    // shows two labelled sections instead of a flat list.
    const divisionsByType = useMemo(() => {
        const kata = availableDivisions.filter((d) => d.eventType === "KATA");
        const kumite = availableDivisions.filter((d) => d.eventType === "KUMITE");
        return { KATA: kata, KUMITE: kumite };
    }, [availableDivisions]);

    const kataAllowed = event.enabledTypes.includes("KATA");
    const kumiteAllowed = event.enabledTypes.includes("KUMITE");
    const bothTypesEnabled = kataAllowed && kumiteAllowed;

    const selectedKata = kataCode
        ? divisionsByType.KATA.find((d) => d.code === kataCode) ?? null
        : null;
    const selectedKumite = kumiteCode
        ? divisionsByType.KUMITE.find((d) => d.code === kumiteCode) ?? null
        : null;
    // Team info is only asked once — the current data model captures one
    // teamName/teammates block on the registration row it belongs to. If both
    // picks are team divisions we still surface the block; the server writes
    // the same team payload to whichever row is the team division.
    const isTeam = !!selectedKata?.isTeam || !!selectedKumite?.isTeam;
    const kumiteRequired = !!selectedKumite;
    const selectedCount = (selectedKata ? 1 : 0) + (selectedKumite ? 1 : 0);

    if (registrationClosed) {
        return (
            <div className="bg-white border border-zinc-200 rounded-sm shadow-sm p-6 text-center">
                <p className="text-base font-semibold text-zinc-900 mb-2">
                    Registration is closed.
                </p>
                <p className="text-sm text-zinc-500">
                    The deadline for this tournament has passed.
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

            {member ? (
                <div className="text-sm text-zinc-700 bg-emerald-50 border border-emerald-200 rounded-sm px-4 py-3">
                    Registering as <b>{member.fullName}</b> ({member.email}).
                </div>
            ) : (
                <>
                    <Field label="Full name" required>
                        <input
                            name="name"
                            type="text"
                            required
                            className={inputCx}
                        />
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
                        Already a JKA member?{" "}
                        <Link
                            href={signInHref}
                            className="text-accent-red font-semibold hover:underline inline-flex items-center gap-1"
                        >
                            <LogIn size={12} /> Sign in
                        </Link>{" "}
                        for a faster registration.
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
                            setKataCode("");
                            setKumiteCode("");
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
                        onChange={(e) => {
                            setDobStr(e.target.value);
                            setKataCode("");
                            setKumiteCode("");
                        }}
                        required
                        className={inputCx}
                    />
                </Field>
            </div>

            {event.enabledTypes.includes("KUMITE") && (
                <Field
                    label={
                        kumiteRequired
                            ? "Weight (kg)"
                            : "Weight (kg) — required for kumite divisions"
                    }
                    required={kumiteRequired}
                >
                    <input
                        name="entrantWeightKg"
                        type="number"
                        min={20}
                        max={200}
                        step="0.1"
                        value={weightKgStr}
                        onChange={(e) => setWeightKgStr(e.target.value)}
                        required={kumiteRequired}
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
                    <input
                        name="entrantBeltRank"
                        type="text"
                        defaultValue={member?.currentRank ?? ""}
                        required
                        placeholder="e.g. 3rd Kyu"
                        className={inputCx}
                    />
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

            <Field label="Coach name (optional)">
                <input name="coachName" type="text" className={inputCx} />
            </Field>

            <div
                className={
                    bothTypesEnabled
                        ? "grid grid-cols-1 md:grid-cols-2 gap-3"
                        : ""
                }
            >
                {kataAllowed && (
                    <Field
                        label={
                            bothTypesEnabled
                                ? "Kata division (optional)"
                                : "Division"
                        }
                        required={!bothTypesEnabled}
                    >
                        <select
                            name="kataDivisionCode"
                            value={kataCode}
                            onChange={(e) => setKataCode(e.target.value)}
                            required={!bothTypesEnabled}
                            disabled={!gender || !dob}
                            className={inputCx}
                        >
                            <option value="">
                                {!gender || !dob
                                    ? "Fill in gender and date of birth first…"
                                    : divisionsByType.KATA.length === 0
                                      ? "No kata divisions match"
                                      : bothTypesEnabled
                                        ? "— No kata entry —"
                                        : "Select a division…"}
                            </option>
                            {divisionsByType.KATA.map((d) => (
                                <option key={d.code} value={d.code}>
                                    {d.label}
                                </option>
                            ))}
                        </select>
                    </Field>
                )}
                {kumiteAllowed && (
                    <Field
                        label={
                            bothTypesEnabled
                                ? "Kumite division (optional)"
                                : "Division"
                        }
                        required={!bothTypesEnabled}
                    >
                        <select
                            name="kumiteDivisionCode"
                            value={kumiteCode}
                            onChange={(e) => setKumiteCode(e.target.value)}
                            required={!bothTypesEnabled}
                            disabled={!gender || !dob}
                            className={inputCx}
                        >
                            <option value="">
                                {!gender || !dob
                                    ? "Fill in gender and date of birth first…"
                                    : divisionsByType.KUMITE.length === 0
                                      ? "No kumite divisions match"
                                      : bothTypesEnabled
                                        ? "— No kumite entry —"
                                        : "Select a division…"}
                            </option>
                            {divisionsByType.KUMITE.map((d) => (
                                <option key={d.code} value={d.code}>
                                    {d.label}
                                </option>
                            ))}
                        </select>
                    </Field>
                )}
            </div>
            {gender && dob && availableDivisions.length === 0 && (
                <p className="text-[11px] text-amber-700 bg-amber-50 border border-amber-200 rounded-sm px-3 py-2">
                    None of the enabled divisions match your age and gender.
                    Contact the organiser if you believe this is wrong.
                </p>
            )}
            {bothTypesEnabled && (
                <p className="text-[11px] text-zinc-500 -mt-2">
                    Pick a kata division, a kumite division, or one of each —
                    both entries are created together
                    {event.isPremium
                        ? "; the ticket price applies to each."
                        : "."}
                </p>
            )}
            {bothTypesEnabled && selectedCount === 0 && (
                <p className="text-[11px] text-amber-700 bg-amber-50 border border-amber-200 rounded-sm px-3 py-2 -mt-2">
                    Pick at least one division to continue.
                </p>
            )}

            {isTeam && (
                <div className="border border-zinc-200 rounded-sm bg-zinc-50 p-4 space-y-3">
                    <p className="text-[10px] tracking-widest uppercase font-bold text-zinc-500">
                        Team kata — teammates
                    </p>
                    <Field label="Team name" required>
                        <input
                            name="teamName"
                            type="text"
                            required
                            className={inputCx}
                        />
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

            {initialError && (
                <p className="text-sm text-red-600">{initialError}</p>
            )}

            {event.isPremium && event.ticketPrice !== null ? (
                <>
                    <div className="border-t border-zinc-200 pt-4 space-y-2">
                        <div className="flex items-center justify-between text-sm text-zinc-700">
                            <span className="font-semibold">
                                {event.memberDiscountActive
                                    ? "Member ticket"
                                    : "Ticket price"}
                                {selectedCount > 1 && (
                                    <span className="text-zinc-400 font-normal">
                                        {" "}
                                        × {selectedCount} divisions
                                    </span>
                                )}
                            </span>
                            <span className="text-zinc-700">
                                ৳{event.ticketPrice.toLocaleString()}
                                {event.memberDiscountActive &&
                                    event.baseTicketPrice !== null && (
                                        <span className="ml-2 text-zinc-400 text-xs line-through font-normal">
                                            ৳{event.baseTicketPrice.toLocaleString()}
                                        </span>
                                    )}
                            </span>
                        </div>
                        {selectedCount > 1 && (
                            <div className="flex items-center justify-between text-sm border-t border-zinc-100 pt-2">
                                <span className="font-bold text-zinc-900">
                                    Total
                                </span>
                                <span className="font-bold text-zinc-900">
                                    ৳
                                    {(
                                        event.ticketPrice * selectedCount
                                    ).toLocaleString()}
                                </span>
                            </div>
                        )}
                    </div>
                    <button
                        type="submit"
                        className="w-full inline-flex items-center justify-center gap-2 bg-accent-red text-white px-4 py-3 text-xs font-bold tracking-widest uppercase hover:bg-accent-red/90 transition-colors rounded-sm"
                    >
                        <Ticket size={14} />
                        {selectedCount > 1
                            ? `Pay ৳${(event.ticketPrice * selectedCount).toLocaleString()} for ${selectedCount} divisions`
                            : "Continue to payment"}
                    </button>
                    <p className="text-[11px] text-zinc-500 text-center">
                        {selectedCount > 1
                            ? "Both entries are confirmed once payment settles."
                            : "Your division entry is confirmed once payment settles."}
                    </p>
                </>
            ) : (
                <button
                    type="submit"
                    className="w-full inline-flex items-center justify-center gap-2 bg-accent-red text-white px-4 py-3 text-xs font-bold tracking-widest uppercase hover:bg-accent-red/90 transition-colors rounded-sm"
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
