"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "motion/react";
import StepProfile, { type ProfileData } from "./step-profile";
import StepProducts from "./step-products";
import StepWelcome from "./step-welcome";

interface Props {
    userId: string;
    member: any;
    dojos: any[];
    products: any[];
    /** True when the user already completed onboarding but has missing required fields. */
    isProfileUpdateMode?: boolean;
    /** Human-readable list of fields still missing (for display in Step 1 banner). */
    missingFields?: string[];
}

const STEPS_FULL   = [{ label: "Profile", number: 1 }, { label: "Gear Up", number: 2 }, { label: "Welcome", number: 3 }];
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
        emergencyContactName: member?.emergencyContactName ?? "",
        emergencyContactPhone: member?.emergencyContactPhone ?? "",
    };
}

export default function OnboardingWizard({
    userId,
    member,
    dojos,
    products,
    isProfileUpdateMode = false,
    missingFields = [],
}: Props) {
    const router = useRouter();
    const [step, setStep] = useState(1);
    const [orderId, setOrderId] = useState<string | null>(null);

    // ── Persisted wizard state ─────────────────────────────────────────────
    // Lifted here so navigating Back from step 2 → 1 or 3 → 2 preserves
    // everything the user typed / selected.
    const [profile, setProfile] = useState<ProfileData>(() => initialProfile(member));
    const [selectedProducts, setSelectedProducts] = useState<Set<string>>(new Set());

    const STEPS = isProfileUpdateMode ? STEPS_UPDATE : STEPS_FULL;
    const totalSteps = STEPS.length;

    /** Called when Step 1 (profile) is saved successfully. */
    function handleProfileNext() {
        if (isProfileUpdateMode) {
            // Profile-update mode: go straight to portal, skip gear/welcome.
            router.push("/portal");
        } else {
            setStep(2);
        }
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-zinc-950 via-zinc-900 to-zinc-950 flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-white/5">
                <div className="flex items-center gap-2">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src="/assets/jka_logo.svg" alt="JKA" className="h-8 w-auto opacity-90" />
                    <span className="text-white/60 text-sm font-medium tracking-wide">JKA Bangladesh</span>
                </div>
                <p className="text-white/40 text-xs">Step {step} of {totalSteps}</p>
            </div>

            {/* Step indicator */}
            <div className="flex items-center justify-center gap-0 px-6 pt-8 pb-4">
                {STEPS.map((s, i) => (
                    <div key={s.number} className="flex items-center">
                        <div className="flex flex-col items-center gap-1.5">
                            <motion.div
                                animate={{
                                    backgroundColor: step > s.number ? "#10b981" : step === s.number ? "#dc2626" : "rgba(255,255,255,0.1)",
                                    borderColor: step >= s.number ? "transparent" : "rgba(255,255,255,0.15)",
                                }}
                                className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold border"
                            >
                                {step > s.number ? (
                                    <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                                    </svg>
                                ) : (
                                    <span className={step === s.number ? "text-white" : "text-white/30"}>{s.number}</span>
                                )}
                            </motion.div>
                            <span className={`text-[10px] font-semibold tracking-wider uppercase ${step === s.number ? "text-white/80" : "text-white/25"}`}>
                                {s.label}
                            </span>
                        </div>
                        {i < STEPS.length - 1 && (
                            <motion.div
                                animate={{ backgroundColor: step > s.number ? "#10b981" : "rgba(255,255,255,0.1)" }}
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
                            className="w-full max-w-4xl"
                        >
                            <StepProducts
                                products={products}
                                value={selectedProducts}
                                onChange={setSelectedProducts}
                                onBack={() => setStep(1)}
                                onNext={(oid) => { setOrderId(oid); setStep(3); }}
                            />
                        </motion.div>
                    )}

                    {!isProfileUpdateMode && step === 3 && (
                        <motion.div
                            key="step3"
                            initial={{ opacity: 0, x: 40 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -40 }}
                            transition={{ duration: 0.3 }}
                            className="w-full max-w-xl"
                        >
                            <StepWelcome
                                member={{ ...member, ...profile }}
                                orderId={orderId}
                                onBack={() => setStep(2)}
                            />
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        </div>
    );
}
