"use client";

import { useState, useTransition } from "react";
import { motion } from "motion/react";
import { User, Phone, MapPin, Heart, AlertCircle, ChevronRight } from "lucide-react";
import { saveProfileAction } from "@/app/portal/onboarding/actions";
import { BLOOD_GROUPS } from "@/lib/constants";

export interface ProfileData {
    fullName: string;
    phone: string;
    dojoId: string;
    dateOfBirth: string; // ISO yyyy-mm-dd or ""
    bloodGroup: string;
    address: string;
    nationalId: string;
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
    /** Which required fields are missing — shown as a hint banner. */
    missingFields?: string[];
}

export default function StepProfile({
    value,
    onChange,
    dojos,
    onNext,
    isUpdateMode = false,
    missingFields = [],
}: Props) {
    const [isPending, startTransition] = useTransition();
    const [error, setError] = useState<string | null>(null);

    function update<K extends keyof ProfileData>(key: K, v: ProfileData[K]) {
        onChange({ ...value, [key]: v });
    }

    function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
        e.preventDefault();
        setError(null);

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
                        value={value.phone}
                        onChange={(e) => update("phone", e.target.value)}
                        placeholder="+880 1XXX-XXXXXX"
                        required
                        className={inputCls}
                    />
                </Field>

                {/* Dojo */}
                <Field label="Preferred Dojo *" icon={<MapPin size={15} />}>
                    <select
                        name="dojoId"
                        value={value.dojoId}
                        onChange={(e) => update("dojoId", e.target.value)}
                        required
                        disabled={dojos.length === 0}
                        className={inputCls}
                    >
                        <option value="">
                            {dojos.length === 0 ? "No dojos available yet" : "Select your nearest dojo"}
                        </option>
                        {dojos.map((d) => (
                            <option key={d.id} value={d.id}>
                                {d.name}{d.city ? ` — ${d.city}` : ""}
                            </option>
                        ))}
                    </select>
                </Field>

                {/* Date of birth + Blood group */}
                <div className="grid grid-cols-2 gap-4">
                    <Field label="Date of Birth">
                        <input
                            name="dateOfBirth"
                            type="date"
                            value={value.dateOfBirth}
                            onChange={(e) => update("dateOfBirth", e.target.value)}
                            className={inputCls}
                        />
                    </Field>
                    <Field label="Blood Group" icon={<Heart size={15} />}>
                        <select
                            name="bloodGroup"
                            value={value.bloodGroup}
                            onChange={(e) => update("bloodGroup", e.target.value)}
                            className={inputCls}
                        >
                            <option value="">Unknown</option>
                            {BLOOD_GROUPS.map((g) => <option key={g} value={g}>{g}</option>)}
                        </select>
                    </Field>
                </div>

                {/* Address */}
                <Field label="Address">
                    <input
                        name="address"
                        type="text"
                        value={value.address}
                        onChange={(e) => update("address", e.target.value)}
                        placeholder="Your current address"
                        className={inputCls}
                    />
                </Field>

                {/* National ID */}
                <Field label="National ID / Passport No.">
                    <input
                        name="nationalId"
                        type="text"
                        value={value.nationalId}
                        onChange={(e) => update("nationalId", e.target.value)}
                        placeholder="NID or Passport number"
                        className={inputCls}
                    />
                </Field>

                {/* Emergency contact */}
                <div className="pt-2">
                    <p className="text-xs font-bold tracking-widest uppercase text-zinc-400 mb-3">Emergency Contact</p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <Field label="Contact Name">
                            <input
                                name="emergencyContactName"
                                type="text"
                                value={value.emergencyContactName}
                                onChange={(e) => update("emergencyContactName", e.target.value)}
                                placeholder="Name"
                                className={inputCls}
                            />
                        </Field>
                        <Field label="Contact Phone">
                            <input
                                name="emergencyContactPhone"
                                type="tel"
                                value={value.emergencyContactPhone}
                                onChange={(e) => update("emergencyContactPhone", e.target.value)}
                                placeholder="+880 1XXX-XXXXXX"
                                className={inputCls}
                            />
                        </Field>
                    </div>
                </div>

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
