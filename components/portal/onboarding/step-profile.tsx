"use client";

import { useState, useTransition } from "react";
import dynamic from "next/dynamic";
import { motion } from "motion/react";
import { User, Phone, Mail, MapPin, AlertCircle, ChevronRight, Users, UserCircle2 } from "lucide-react";
import { saveProfileAction } from "@/app/portal/onboarding/actions";
import AvatarUploader from "@/components/portal/avatar-uploader";
import { validatePhone } from "@/lib/validation/phone";
import { validateMinAge, maxDobForAge } from "@/lib/validation/age";

const STUDENT_MIN_AGE = 6;

// Leaflet pulls window/document, so it must render client-side only.
const DojoMapPicker = dynamic(
    () => import("@/components/portal/onboarding/dojo-map-picker"),
    {
        ssr: false,
        loading: () => (
            <div className="h-64 sm:h-80 bg-zinc-100 rounded-xl border border-zinc-200 flex items-center justify-center text-xs text-zinc-400">
                Loading map…
            </div>
        ),
    },
);

export interface ProfileData {
    fullName: string;
    phone: string;
    contactEmail: string;
    dojoId: string;
    dateOfBirth: string; // ISO yyyy-mm-dd or ""
    gender: string; // "MALE" | "FEMALE" | ""
    bloodGroup: string;
    address: string;
    nationalId: string;
    fatherName: string;
    motherName: string;
    emergencyContactName: string;
    emergencyContactPhone: string;
}

interface Props {
    value: ProfileData;
    onChange: (next: ProfileData) => void;
    dojos: any[];
    onNext: () => void;
    /** True when returning user has missing required fields (not first-time). */
    isUpdateMode?: boolean;
    /** True when the account was pre-provisioned by the Dojo Head — the
     *  dojo is set by the Dojo Head at creation time and must not be
     *  editable by the student. */
    dojoLocked?: boolean;
    /** True when the account was pre-provisioned by the Dojo Head — no
     *  real email was captured at creation, so the profile step asks the
     *  student to provide one for notifications. */
    askContactEmail?: boolean;
    /** Which required fields are missing — shown as a hint banner. */
    missingFields?: string[];
    /** Existing avatar URL (if any) — used to seed the uploader preview. */
    avatarUrl?: string | null;
}

export default function StepProfile({
    value,
    onChange,
    dojos,
    onNext,
    isUpdateMode = false,
    dojoLocked = false,
    askContactEmail = false,
    missingFields = [],
    avatarUrl,
}: Props) {
    const lockedDojo = dojoLocked
        ? dojos.find((d) => d.id === value.dojoId) ?? null
        : null;
    const [isPending, startTransition] = useTransition();
    const [error, setError] = useState<string | null>(null);

    function update<K extends keyof ProfileData>(key: K, v: ProfileData[K]) {
        onChange({ ...value, [key]: v });
    }

    function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
        e.preventDefault();
        setError(null);

        const phoneError = validatePhone(value.phone);
        if (phoneError) {
            setError(phoneError);
            return;
        }
        const email = value.contactEmail.trim();
        if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
            setError("Enter a valid email address.");
            return;
        }
        const ageError = validateMinAge(value.dateOfBirth, STUDENT_MIN_AGE);
        if (ageError) {
            setError(ageError);
            return;
        }
        if (!value.gender) {
            setError("Please select your gender.");
            return;
        }
        if (!value.nationalId.trim()) {
            setError("Birth Certificate number is required.");
            return;
        }
        if (!value.fatherName.trim()) {
            setError("Father's name is required.");
            return;
        }
        if (!value.motherName.trim()) {
            setError("Mother's name is required.");
            return;
        }

        const formData = new FormData();
        for (const [k, v] of Object.entries(value)) {
            formData.append(k, v ?? "");
        }

        startTransition(async () => {
            const res = await saveProfileAction(formData);
            if (res?.error) {
                setError(res.error);
            } else {
                onNext();
            }
        });
    }

    return (
        <div className="bg-white rounded-2xl shadow-sm border border-zinc-200 p-8">
            <div className="mb-8 text-center">
                <motion.div
                    initial={{ scale: 0.8, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ delay: 0.1 }}
                    className={`w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-4 ${
                        isUpdateMode
                            ? "bg-amber-50 border border-amber-200"
                            : "bg-red-50 border border-red-200"
                    }`}
                >
                    <User size={24} className={isUpdateMode ? "text-amber-500" : "text-accent-red"} />
                </motion.div>
                <h1 className="text-2xl font-bold text-zinc-900">
                    {isUpdateMode ? "Profile Update Required" : "Complete Your Profile"}
                </h1>
                <p className="text-zinc-500 text-sm mt-1">
                    {isUpdateMode
                        ? "Please fill in the missing details below to continue using the portal."
                        : "This information is needed to register you as an official JKA member."}
                </p>
            </div>

            {/* Missing-fields banner (update mode only) */}
            {isUpdateMode && missingFields.length > 0 && (
                <motion.div
                    initial={{ opacity: 0, y: -8 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex items-start gap-3 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 mb-6"
                >
                    <AlertCircle size={16} className="text-amber-500 flex-shrink-0 mt-0.5" />
                    <div>
                        <p className="text-amber-700 text-sm font-medium">Required fields missing</p>
                        <p className="text-amber-600 text-xs mt-0.5">
                            {missingFields.join(" · ")}
                        </p>
                    </div>
                </motion.div>
            )}

            {error && (
                <motion.div
                    initial={{ opacity: 0, y: -8 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex items-center gap-2 bg-red-50 border border-red-200 rounded-xl px-4 py-3 mb-6 text-red-600 text-sm"
                >
                    <AlertCircle size={16} className="flex-shrink-0" />
                    {error}
                </motion.div>
            )}

            {/* Profile photo */}
            <div className="mb-6 pb-6 border-b border-zinc-100">
                <AvatarUploader
                    initialUrl={avatarUrl ?? null}
                    fallbackInitial={(value.fullName || "M").charAt(0).toUpperCase()}
                    sizeClasses="w-24 h-24"
                />
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
                {/* Full name */}
                <Field label="Full Name *" icon={<User size={15} />}>
                    <input
                        name="fullName"
                        type="text"
                        value={value.fullName}
                        onChange={(e) => update("fullName", e.target.value)}
                        placeholder="Your full legal name"
                        required
                        className={inputCls}
                    />
                </Field>

                {/* Phone */}
                <Field label="Phone Number *" icon={<Phone size={15} />}>
                    <input
                        name="phone"
                        type="tel"
                        inputMode="numeric"
                        pattern="\d{11}"
                        maxLength={11}
                        minLength={11}
                        title="Phone number must be exactly 11 digits."
                        value={value.phone}
                        onChange={(e) => update("phone", e.target.value.replace(/\D/g, "").slice(0, 11))}
                        placeholder="01XXXXXXXXX"
                        required
                        className={inputCls}
                    />
                </Field>

                {/* Contact email — asked only when the Dojo Head provisioned
                 *  the account without a real email. Login stays by Member ID;
                 *  this address is used for notifications. */}
                {askContactEmail && (
                    <Field label="Contact Email (optional)" icon={<Mail size={15} />}>
                        <input
                            name="contactEmail"
                            type="email"
                            autoComplete="email"
                            value={value.contactEmail}
                            onChange={(e) => update("contactEmail", e.target.value)}
                            placeholder="you@example.com"
                            className={inputCls}
                        />
                        <p className="mt-1.5 text-[11px] text-zinc-400">
                            Optional — used for notifications and receipts if
                            you provide it. You&apos;ll still log in with your
                            Member ID.
                        </p>
                    </Field>
                )}

                {/* Dojo — pick from the list, the map zooms into your choice.
                 *  When the Dojo Head pre-provisioned the account, the dojo
                 *  is fixed and shown as a read-only card instead. */}
                <Field label="Your Dojo *" icon={<MapPin size={15} />}>
                    {dojoLocked ? (
                        <>
                            <input
                                type="hidden"
                                name="dojoId"
                                value={value.dojoId}
                            />
                            <div className="flex items-start gap-3 bg-zinc-50 border border-zinc-200 rounded-xl px-4 py-3">
                                <MapPin
                                    size={15}
                                    className="text-zinc-400 mt-0.5 flex-shrink-0"
                                />
                                <div className="min-w-0">
                                    <p className="text-sm font-semibold text-zinc-900 truncate">
                                        {lockedDojo?.name ?? "Your dojo"}
                                    </p>
                                    {lockedDojo?.city && (
                                        <p className="text-xs text-zinc-500 mt-0.5 truncate">
                                            {lockedDojo.city}
                                        </p>
                                    )}
                                    <p className="text-[11px] text-zinc-400 mt-1.5">
                                        Set by your Dojo Head. Contact them if
                                        this needs to change.
                                    </p>
                                </div>
                            </div>
                        </>
                    ) : (
                        <div className="space-y-3">
                            <select
                                name="dojoId"
                                value={value.dojoId}
                                onChange={(e) => update("dojoId", e.target.value)}
                                required
                                disabled={dojos.length === 0}
                                className={inputCls}
                            >
                                <option value="">
                                    {dojos.length === 0
                                        ? "No dojos available yet"
                                        : "Select your dojo"}
                                </option>
                                {dojos.map((d) => (
                                    <option key={d.id} value={d.id}>
                                        {d.name}
                                        {d.city ? ` — ${d.city}` : ""}
                                    </option>
                                ))}
                            </select>
                            <DojoMapPicker
                                dojos={dojos}
                                selectedId={value.dojoId}
                                onSelect={(id) => update("dojoId", id)}
                            />
                        </div>
                    )}
                </Field>

                {/* Date of birth + Gender */}
                <div className="grid grid-cols-2 gap-4">
                    <Field label="Date of Birth *">
                        <input
                            name="dateOfBirth"
                            type="date"
                            required
                            max={maxDobForAge(STUDENT_MIN_AGE)}
                            value={value.dateOfBirth}
                            onChange={(e) => update("dateOfBirth", e.target.value)}
                            title={`You must be at least ${STUDENT_MIN_AGE} years old.`}
                            className={inputCls}
                        />
                    </Field>
                    <Field label="Gender *" icon={<UserCircle2 size={15} />}>
                        <select
                            name="gender"
                            value={value.gender}
                            onChange={(e) => update("gender", e.target.value)}
                            required
                            className={inputCls}
                        >
                            <option value="">Select</option>
                            <option value="MALE">Male</option>
                            <option value="FEMALE">Female</option>
                        </select>
                    </Field>
                </div>

                <Field label="Birth Certificate No. *">
                    <input
                        name="nationalId"
                        type="text"
                        value={value.nationalId}
                        onChange={(e) => update("nationalId", e.target.value)}
                        placeholder="Birth Certificate number"
                        required
                        className={inputCls}
                    />
                </Field>

                {/* Parent names — used on printed certificates. */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <Field label="Father's Name *" icon={<Users size={15} />}>
                        <input
                            name="fatherName"
                            type="text"
                            value={value.fatherName}
                            onChange={(e) => update("fatherName", e.target.value)}
                            placeholder="As it should appear on the certificate"
                            required
                            className={inputCls}
                        />
                    </Field>
                    <Field label="Mother's Name *" icon={<Users size={15} />}>
                        <input
                            name="motherName"
                            type="text"
                            value={value.motherName}
                            onChange={(e) => update("motherName", e.target.value)}
                            placeholder="As it should appear on the certificate"
                            required
                            className={inputCls}
                        />
                    </Field>
                </div>

                <p className="text-xs text-zinc-400 leading-relaxed">
                    You can add your address, blood group, and emergency
                    contact later from your profile.
                </p>

                <button
                    type="submit"
                    disabled={isPending}
                    className={`w-full mt-2 flex items-center justify-center gap-2 disabled:opacity-60 text-white font-semibold rounded-xl px-6 py-3.5 transition-colors ${
                        isUpdateMode
                            ? "bg-amber-500 hover:bg-amber-400"
                            : "bg-accent-red hover:bg-red-700"
                    }`}
                >
                    {isPending ? "Saving…" : isUpdateMode ? "Save & Continue to Portal" : "Continue"}
                    {!isPending && <ChevronRight size={18} />}
                </button>
            </form>
        </div>
    );
}

function Field({ label, icon, children }: { label: string; icon?: React.ReactNode; children: React.ReactNode }) {
    return (
        <div>
            <label className="flex items-center gap-1.5 text-xs font-semibold text-zinc-500 uppercase tracking-widest mb-2">
                {icon && <span className="text-zinc-400">{icon}</span>}
                {label}
            </label>
            {children}
        </div>
    );
}

const inputCls =
    "w-full bg-zinc-50 border border-zinc-200 rounded-xl px-4 py-3 text-zinc-900 placeholder-zinc-400 text-sm focus:outline-none focus:border-accent-red focus:ring-1 focus:ring-accent-red/20 transition-all appearance-none";
