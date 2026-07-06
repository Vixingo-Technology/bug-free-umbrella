"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "motion/react";
import StepProfile, { type ProfileData } from "./step-profile";
import StepWelcome from "./step-welcome";
import { createOnboardingOrderAction } from "@/app/portal/onboarding/actions";

interface Props {
    userId: string;
    member: any;
    dojos: any[];
    /** True when the user already completed onboarding but has missing required fields. */
    isProfileUpdateMode?: boolean;
    /** Human-readable list of fields still missing (for display in Step 1 banner). */
    missingFields?: string[];
}

const STEPS_FULL   = [{ label: "Profile", number: 1 }, { label: "Welcome", number: 2 }];
const STEPS_UPDATE = [{ label: "Update Profile", number: 1 }];

function initialProfile(member: any): ProfileData {
    return {
        fullName: member?.fullName ?? "",
        phone: member?.phone ?? "",
        dojoId: member?.dojoId ?? "",
        dateOfBirth: member?.dateOfBirth
            ? new Date(member.dateOfBirth).toISOString().split("T")[0]
            : "",
        bloodGroup: member?.bloodGroup ?? "",
        address: member?.address ?? "",
        nationalId: member?.nationalId ?? "",
        fatherName: member?.fatherName ?? "",
        motherName: member?.motherName ?? "",
        emergencyContactName: member?.emergencyContactName ?? "",
        emergencyContactPhone: member?.emergencyContactPhone ?? "",
    };
}

export default function OnboardingWizard({
    userId,
    member,
    dojos,
    isProfileUpdateMode = false,
    missingFields = [],
}: Props) {
    const router = useRouter();
    const [step, setStep] = useState(1);
    const [orderId, setOrderId] = useState<string | null>(null);

    const [profile, setProfile] = useState<ProfileData>(() => initialProfile(member));

    const STEPS = isProfileUpdateMode ? STEPS_UPDATE : STEPS_FULL;
    const totalSteps = STEPS.length;

    /** Called when Step 1 (profile) is saved successfully. */
    async function handleProfileNext() {
        if (isProfileUpdateMode) {
            router.push("/portal");
            return;
        }
        const res = await createOnboardingOrderAction([]);
        if (res && "orderId" in res && res.orderId) {
            setOrderId(res.orderId);
        }
        setStep(2);
    }

    return (
        <div className="min-h-screen bg-[#F5F5F7] flex flex-col">
            {/* Header / Navbar */}
            <header className="bg-white border-b border-zinc-200 px-6 py-3.5 flex items-center justify-between shadow-sm">
                <div className="flex items-center gap-3">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src="/assets/jka_logo.svg" alt="JKA Bangladesh" className="h-9 w-auto" />
                    <div className="flex flex-col">
                        <span className="font-karate font-bold text-zinc-900 tracking-[0.4em] text-[11px] leading-tight">
                            JKA <span className="text-accent-red">BANGLADESH</span>
                        </span>
                        <span className="text-[9px] tracking-widest uppercase text-zinc-400 leading-tight">Member Portal</span>
                    </div>
                </div>
                <p className="text-zinc-400 text-xs font-medium">Step {step} of {totalSteps}</p>
            </header>

            {/* Step indicator */}
            <div className="flex items-center justify-center gap-0 px-6 pt-8 pb-4">
                {STEPS.map((s, i) => (
                    <div key={s.number} className="flex items-center">
                        <div className="flex flex-col items-center gap-1.5">
                            <motion.div
                                animate={{
                                    backgroundColor: step > s.number ? "#10b981" : step === s.number ? "#C41E3A" : "#e4e4e7",
                                    borderColor: "transparent",
                                }}
                                className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold border"
                            >
                                {step > s.number ? (
                                    <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                                    </svg>
                                ) : (
                                    <span className={step === s.number ? "text-white" : "text-zinc-400"}>{s.number}</span>
                                )}
                            </motion.div>
                            <span className={`text-[10px] font-semibold tracking-wider uppercase ${step === s.number ? "text-zinc-700" : "text-zinc-400"}`}>
                                {s.label}
                            </span>
                        </div>
                        {i < STEPS.length - 1 && (
                            <motion.div
                                animate={{ backgroundColor: step > s.number ? "#10b981" : "#e4e4e7" }}
                                className="w-16 sm:w-24 h-0.5 mx-3 mt-[-14px]"
                            />
                        )}
                    </div>
                ))}
            </div>

            {/* Step content */}
            <div className="flex-1 flex items-start justify-center px-4 py-8">
                <AnimatePresence mode="wait">
                    {step === 1 && (
                        <motion.div
                            key="step1"
                            initial={{ opacity: 0, x: 40 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -40 }}
                            transition={{ duration: 0.3 }}
                            className="w-full max-w-xl"
                        >
                            <StepProfile
                                value={profile}
                                onChange={setProfile}
                                dojos={dojos}
                                onNext={handleProfileNext}
                                isUpdateMode={isProfileUpdateMode}
                                missingFields={missingFields}
                                avatarUrl={member?.avatarUrl ?? null}
                            />
                        </motion.div>
                    )}

                    {!isProfileUpdateMode && step === 2 && (
                        <motion.div
                            key="step2"
                            initial={{ opacity: 0, x: 40 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -40 }}
                            transition={{ duration: 0.3 }}
                            className="w-full max-w-xl"
                        >
                            <StepWelcome
                                member={{ ...member, ...profile }}
                                orderId={orderId}
                                onBack={() => setStep(1)}
                            />
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        </div>
    );
}
