"use client";

import { motion, AnimatePresence } from "motion/react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import {
    ArrowLeft,
    ArrowRight,
    Building2,
    Check,
    CheckCircle2,
    ImagePlus,
    Loader2,
    MapPin,
    Plus,
    Trash2,
    Upload,
    UserSquare2,
    Users,
} from "lucide-react";
import Logo from "@/assets/jka_logo.svg";
import { submitDojoEnlistment } from "@/app/actions/enlist-dojo";

type Trainer = {
    name: string;
    rank: string;
    contact: string;
};

type FormState = {
    dojoName: string;
    logoName: string;
    email: string;
    phone: string;
    contactName: string;
    contactRole: string;
    address: string;
    latitude: string;
    longitude: string;
    interiorNames: string[];
    trainers: Trainer[];
    acceptedTerms: boolean;
};

const STEPS = [
    { id: 0, title: "Dojo basics", icon: Building2 },
    { id: 1, title: "Contact", icon: UserSquare2 },
    { id: 2, title: "Location", icon: MapPin },
    { id: 3, title: "Interiors", icon: ImagePlus },
    { id: 4, title: "Trainers", icon: Users },
    { id: 5, title: "Review", icon: CheckCircle2 },
];

const emptyTrainer: Trainer = { name: "", rank: "", contact: "" };

const initialState: FormState = {
    dojoName: "",
    logoName: "",
    email: "",
    phone: "",
    contactName: "",
    contactRole: "Head Instructor",
    address: "",
    latitude: "",
    longitude: "",
    interiorNames: [],
    trainers: [{ ...emptyTrainer }],
    acceptedTerms: false,
};

export default function EnlistDojoSignupPage() {
    const router = useRouter();
    const [step, setStep] = useState(0);
    const [form, setForm] = useState<FormState>(initialState);
    const [error, setError] = useState<string | null>(null);
    const [isPending, startTransition] = useTransition();

    function update<K extends keyof FormState>(key: K, value: FormState[K]) {
        setForm((f) => ({ ...f, [key]: value }));
    }

    function updateTrainer(i: number, key: keyof Trainer, value: string) {
        setForm((f) => {
            const next = [...f.trainers];
            next[i] = { ...next[i], [key]: value };
            return { ...f, trainers: next };
        });
    }

    function addTrainer() {
        setForm((f) => ({
            ...f,
            trainers: [...f.trainers, { ...emptyTrainer }],
        }));
    }

    function removeTrainer(i: number) {
        setForm((f) => ({
            ...f,
            trainers: f.trainers.filter((_, idx) => idx !== i),
        }));
    }

    function validateStep(s: number): string | null {
        if (s === 0) {
            if (!form.dojoName.trim()) return "Please enter your dojo name.";
        }
        if (s === 1) {
            if (!form.email.trim() || !form.email.includes("@"))
                return "Please enter a valid email address.";
            if (!form.phone.trim()) return "Please enter a contact phone number.";
            if (!form.contactName.trim())
                return "Please enter the contact person's name.";
        }
        if (s === 2) {
            if (!form.address.trim())
                return "Please enter your dojo's address.";
        }
        if (s === 4) {
            const valid = form.trainers.some(
                (t) => t.name.trim() && t.rank.trim()
            );
            if (!valid)
                return "Please add at least one trainer with name and rank.";
        }
        if (s === 5) {
            if (!form.acceptedTerms)
                return "Please accept the terms and conditions to continue.";
        }
        return null;
    }

    function next() {
        const err = validateStep(step);
        if (err) {
            setError(err);
            return;
        }
        setError(null);
        setStep((s) => Math.min(STEPS.length - 1, s + 1));
    }

    function back() {
        setError(null);
        setStep((s) => Math.max(0, s - 1));
    }

    function handleSubmit() {
        const err = validateStep(5);
        if (err) {
            setError(err);
            return;
        }
        setError(null);
        startTransition(async () => {
            const result = await submitDojoEnlistment({
                dojoName: form.dojoName,
                email: form.email,
                phone: form.phone,
                contactName: form.contactName,
                contactRole: form.contactRole,
                address: form.address,
                latitude: form.latitude,
                longitude: form.longitude,
                trainers: form.trainers.filter(
                    (t) => t.name.trim() && t.rank.trim()
                ),
            });
            if (result?.error) {
                setError(result.error);
                return;
            }
            router.push(
                `/enlist-dojo/verify?email=${encodeURIComponent(form.email)}`
            );
        });
    }

    const progress = ((step + 1) / STEPS.length) * 100;

    return (
        <div className="min-h-screen bg-bg-charcoal relative overflow-hidden py-12">
            <div className="absolute top-[-20%] left-[-10%] w-[80%] h-[80%] rounded-full bg-accent-gold/5 blur-[120px] pointer-events-none" />
            <div className="absolute bottom-[-20%] right-[-10%] w-[60%] h-[60%] rounded-full bg-accent-red/5 blur-[100px] pointer-events-none" />

            <div className="w-full max-w-3xl mx-auto px-6 relative z-10">
                <Link
                    href="/enlist-dojo"
                    className="inline-flex items-center gap-2 text-xs font-bold tracking-widest uppercase text-zinc-500 hover:text-accent-red transition-colors mb-8 group"
                >
                    <ArrowLeft
                        size={16}
                        className="group-hover:-translate-x-1 transition-transform"
                    />
                    Back to overview
                </Link>

                <div className="flex flex-col items-center mb-10">
                    <Image
                        src={Logo}
                        alt="JKA Bangladesh logo"
                        width={56}
                        height={56}
                    />
                    <h1 className="font-karate text-2xl md:text-3xl font-bold text-zinc-900 uppercase tracking-widest mt-4 text-center">
                        Enlist your dojo
                    </h1>
                    <p className="text-zinc-500 text-sm mt-2 text-center max-w-md">
                        Step {step + 1} of {STEPS.length} — {STEPS[step].title}
                    </p>
                </div>

                {/* Progress bar */}
                <div className="mb-10">
                    <div className="h-1 bg-zinc-200 rounded-full overflow-hidden">
                        <motion.div
                            className="h-full bg-accent-red"
                            initial={false}
                            animate={{ width: `${progress}%` }}
                            transition={{ duration: 0.4 }}
                        />
                    </div>
                    <div className="hidden md:flex justify-between mt-4">
                        {STEPS.map((s) => {
                            const Icon = s.icon;
                            const active = s.id === step;
                            const done = s.id < step;
                            return (
                                <div
                                    key={s.id}
                                    className="flex flex-col items-center gap-2 text-[10px] tracking-widest uppercase font-bold"
                                >
                                    <div
                                        className={`w-8 h-8 rounded-full flex items-center justify-center border transition-colors ${
                                            done
                                                ? "bg-accent-red border-accent-red text-white"
                                                : active
                                                ? "border-accent-red text-accent-red bg-white"
                                                : "border-zinc-300 text-zinc-400 bg-white"
                                        }`}
                                    >
                                        {done ? (
                                            <Check size={14} />
                                        ) : (
                                            <Icon size={14} />
                                        )}
                                    </div>
                                    <span
                                        className={`${
                                            active
                                                ? "text-accent-red"
                                                : "text-zinc-400"
                                        }`}
                                    >
                                        {s.title}
                                    </span>
                                </div>
                            );
                        })}
                    </div>
                </div>

                <div className="glass p-8 md:p-10 rounded-2xl shadow-xl">
                    <AnimatePresence mode="wait">
                        <motion.div
                            key={step}
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -20 }}
                            transition={{ duration: 0.25 }}
                        >
                            {step === 0 && (
                                <BasicsStep
                                    form={form}
                                    update={update}
                                />
                            )}
                            {step === 1 && (
                                <ContactStep
                                    form={form}
                                    update={update}
                                />
                            )}
                            {step === 2 && (
                                <LocationStep
                                    form={form}
                                    update={update}
                                />
                            )}
                            {step === 3 && (
                                <InteriorsStep
                                    form={form}
                                    update={update}
                                />
                            )}
                            {step === 4 && (
                                <TrainersStep
                                    form={form}
                                    updateTrainer={updateTrainer}
                                    addTrainer={addTrainer}
                                    removeTrainer={removeTrainer}
                                />
                            )}
                            {step === 5 && (
                                <ReviewStep
                                    form={form}
                                    update={update}
                                />
                            )}
                        </motion.div>
                    </AnimatePresence>

                    {error && (
                        <div className="mt-6 bg-accent-red/10 border border-accent-red/30 text-accent-red text-sm rounded-md p-4">
                            {error}
                        </div>
                    )}

                    <div className="flex justify-between items-center mt-10 pt-6 border-t border-zinc-200">
                        <button
                            type="button"
                            onClick={back}
                            disabled={step === 0 || isPending}
                            className="inline-flex items-center gap-2 text-xs font-bold tracking-widest uppercase text-zinc-500 hover:text-accent-red disabled:opacity-30 disabled:hover:text-zinc-500 transition-colors"
                        >
                            <ArrowLeft size={14} />
                            Back
                        </button>
                        {step < STEPS.length - 1 ? (
                            <button
                                type="button"
                                onClick={next}
                                className="inline-flex items-center gap-3 bg-accent-red text-white px-6 py-3 text-xs font-bold tracking-widest uppercase hover:bg-accent-red/90 transition-colors group rounded-sm"
                            >
                                Continue
                                <ArrowRight
                                    size={14}
                                    className="group-hover:translate-x-1 transition-transform"
                                />
                            </button>
                        ) : (
                            <button
                                type="button"
                                onClick={handleSubmit}
                                disabled={isPending}
                                className="inline-flex items-center gap-3 bg-accent-red text-white px-6 py-3 text-xs font-bold tracking-widest uppercase hover:bg-accent-red/90 disabled:opacity-60 transition-colors group rounded-sm"
                            >
                                {isPending ? (
                                    <>
                                        <Loader2
                                            size={14}
                                            className="animate-spin"
                                        />
                                        Submitting
                                    </>
                                ) : (
                                    <>
                                        Submit & Verify Email
                                        <ArrowRight
                                            size={14}
                                            className="group-hover:translate-x-1 transition-transform"
                                        />
                                    </>
                                )}
                            </button>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}

/* --------- Step components --------- */

function Label({ children }: { children: React.ReactNode }) {
    return (
        <label className="block text-[10px] tracking-widest uppercase font-bold text-zinc-500 mb-2">
            {children}
        </label>
    );
}

function inputClass() {
    return "w-full bg-white border border-zinc-200 text-zinc-900 px-4 py-3 focus:outline-none focus:border-accent-red text-sm transition-colors rounded-sm placeholder:text-zinc-400";
}

function BasicsStep({
    form,
    update,
}: {
    form: FormState;
    update: <K extends keyof FormState>(k: K, v: FormState[K]) => void;
}) {
    return (
        <div className="space-y-6">
            <div>
                <h2 className="font-serif text-xl font-bold text-zinc-900 mb-1">
                    Tell us about your dojo
                </h2>
                <p className="text-zinc-500 text-sm">
                    The name and emblem your students train under.
                </p>
            </div>

            <div>
                <Label>Dojo name *</Label>
                <input
                    type="text"
                    value={form.dojoName}
                    onChange={(e) => update("dojoName", e.target.value)}
                    placeholder="e.g. Shotokan Dhanmondi Dojo"
                    className={inputClass()}
                />
            </div>

            <div>
                <Label>Dojo logo (optional)</Label>
                <label className="flex items-center gap-4 border-2 border-dashed border-zinc-300 hover:border-accent-red/60 transition-colors px-5 py-6 rounded-sm cursor-pointer bg-white">
                    <div className="w-12 h-12 rounded-sm bg-accent-red/10 flex items-center justify-center">
                        <Upload size={18} className="text-accent-red" />
                    </div>
                    <div className="flex-1">
                        <div className="text-sm font-semibold text-zinc-900">
                            {form.logoName || "Upload your dojo emblem"}
                        </div>
                        <div className="text-xs text-zinc-500 mt-1">
                            PNG or SVG, square, at least 400×400. Optional —
                            you can add it later.
                        </div>
                    </div>
                    <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) =>
                            update("logoName", e.target.files?.[0]?.name ?? "")
                        }
                    />
                </label>
            </div>
        </div>
    );
}

function ContactStep({
    form,
    update,
}: {
    form: FormState;
    update: <K extends keyof FormState>(k: K, v: FormState[K]) => void;
}) {
    return (
        <div className="space-y-6">
            <div>
                <h2 className="font-serif text-xl font-bold text-zinc-900 mb-1">
                    Primary contact
                </h2>
                <p className="text-zinc-500 text-sm">
                    Who should the federation reach out to about your dojo?
                </p>
            </div>

            <div className="grid md:grid-cols-2 gap-4">
                <div>
                    <Label>Email *</Label>
                    <input
                        type="email"
                        value={form.email}
                        onChange={(e) => update("email", e.target.value)}
                        placeholder="dojo@example.com"
                        className={inputClass()}
                    />
                </div>
                <div>
                    <Label>Phone *</Label>
                    <input
                        type="tel"
                        value={form.phone}
                        onChange={(e) => update("phone", e.target.value)}
                        placeholder="+880 1XXX XXXXXX"
                        className={inputClass()}
                    />
                </div>
            </div>
            <div className="grid md:grid-cols-2 gap-4">
                <div>
                    <Label>Contact person name *</Label>
                    <input
                        type="text"
                        value={form.contactName}
                        onChange={(e) => update("contactName", e.target.value)}
                        placeholder="e.g. Sensei Karim Ahmed"
                        className={inputClass()}
                    />
                </div>
                <div>
                    <Label>Role</Label>
                    <select
                        value={form.contactRole}
                        onChange={(e) => update("contactRole", e.target.value)}
                        className={inputClass()}
                    >
                        <option>Head Instructor</option>
                        <option>Owner</option>
                        <option>Manager</option>
                        <option>Senior Instructor</option>
                    </select>
                </div>
            </div>
        </div>
    );
}

function LocationStep({
    form,
    update,
}: {
    form: FormState;
    update: <K extends keyof FormState>(k: K, v: FormState[K]) => void;
}) {
    return (
        <div className="space-y-6">
            <div>
                <h2 className="font-serif text-xl font-bold text-zinc-900 mb-1">
                    Where do you train?
                </h2>
                <p className="text-zinc-500 text-sm">
                    Help students find you on the public branch locator.
                </p>
            </div>

            <div>
                <Label>Full address *</Label>
                <textarea
                    value={form.address}
                    onChange={(e) => update("address", e.target.value)}
                    placeholder="House / Road / Area, City, Postal code"
                    rows={3}
                    className={inputClass()}
                />
            </div>

            <div className="grid md:grid-cols-2 gap-4">
                <div>
                    <Label>Latitude</Label>
                    <input
                        type="text"
                        value={form.latitude}
                        onChange={(e) => update("latitude", e.target.value)}
                        placeholder="23.7806"
                        className={inputClass()}
                    />
                </div>
                <div>
                    <Label>Longitude</Label>
                    <input
                        type="text"
                        value={form.longitude}
                        onChange={(e) => update("longitude", e.target.value)}
                        placeholder="90.4193"
                        className={inputClass()}
                    />
                </div>
            </div>

            <div className="bg-zinc-50 border border-zinc-200 rounded-sm p-4 text-xs text-zinc-500">
                You can grab coordinates from Google Maps — right-click the
                pin → &ldquo;What&rsquo;s here?&rdquo;. We&apos;ll switch this
                to an interactive map picker soon.
            </div>
        </div>
    );
}

function InteriorsStep({
    form,
    update,
}: {
    form: FormState;
    update: <K extends keyof FormState>(k: K, v: FormState[K]) => void;
}) {
    function handleFiles(files: FileList | null) {
        if (!files) return;
        const names = Array.from(files).map((f) => f.name);
        update("interiorNames", [...form.interiorNames, ...names]);
    }
    function remove(i: number) {
        update(
            "interiorNames",
            form.interiorNames.filter((_, idx) => idx !== i)
        );
    }

    return (
        <div className="space-y-6">
            <div>
                <h2 className="font-serif text-xl font-bold text-zinc-900 mb-1">
                    Interior photos
                </h2>
                <p className="text-zinc-500 text-sm">
                    Optional. A few photos of your training floor help students
                    pick a dojo that feels right for them.
                </p>
            </div>

            <label className="flex flex-col items-center justify-center gap-3 border-2 border-dashed border-zinc-300 hover:border-accent-red/60 transition-colors px-5 py-10 rounded-sm cursor-pointer bg-white">
                <div className="w-14 h-14 rounded-full bg-accent-red/10 flex items-center justify-center">
                    <ImagePlus size={22} className="text-accent-red" />
                </div>
                <div className="text-sm font-semibold text-zinc-900">
                    Click to add photos
                </div>
                <div className="text-xs text-zinc-500">
                    JPG / PNG · up to 5 images
                </div>
                <input
                    type="file"
                    accept="image/*"
                    multiple
                    className="hidden"
                    onChange={(e) => handleFiles(e.target.files)}
                />
            </label>

            {form.interiorNames.length > 0 && (
                <div className="space-y-2">
                    {form.interiorNames.map((name, i) => (
                        <div
                            key={`${name}-${i}`}
                            className="flex items-center justify-between bg-white border border-zinc-200 rounded-sm px-4 py-3 text-sm"
                        >
                            <span className="truncate text-zinc-700">
                                {name}
                            </span>
                            <button
                                type="button"
                                onClick={() => remove(i)}
                                className="text-zinc-400 hover:text-accent-red transition-colors"
                            >
                                <Trash2 size={16} />
                            </button>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}

function TrainersStep({
    form,
    updateTrainer,
    addTrainer,
    removeTrainer,
}: {
    form: FormState;
    updateTrainer: (i: number, k: keyof Trainer, v: string) => void;
    addTrainer: () => void;
    removeTrainer: (i: number) => void;
}) {
    return (
        <div className="space-y-6">
            <div>
                <h2 className="font-serif text-xl font-bold text-zinc-900 mb-1">
                    Trainers at your dojo
                </h2>
                <p className="text-zinc-500 text-sm">
                    List your head instructor and any assistant instructors.
                    You can add more later from the dashboard.
                </p>
            </div>

            <div className="space-y-4">
                {form.trainers.map((t, i) => (
                    <div
                        key={i}
                        className="bg-white border border-zinc-200 rounded-sm p-5 space-y-4"
                    >
                        <div className="flex items-center justify-between">
                            <h3 className="text-xs tracking-widest uppercase font-bold text-zinc-500">
                                Trainer {i + 1}
                            </h3>
                            {form.trainers.length > 1 && (
                                <button
                                    type="button"
                                    onClick={() => removeTrainer(i)}
                                    className="text-zinc-400 hover:text-accent-red transition-colors"
                                >
                                    <Trash2 size={16} />
                                </button>
                            )}
                        </div>
                        <div className="grid md:grid-cols-2 gap-4">
                            <div>
                                <Label>Full name</Label>
                                <input
                                    type="text"
                                    value={t.name}
                                    onChange={(e) =>
                                        updateTrainer(i, "name", e.target.value)
                                    }
                                    placeholder="e.g. Sensei Rahim"
                                    className={inputClass()}
                                />
                            </div>
                            <div>
                                <Label>Rank</Label>
                                <input
                                    type="text"
                                    value={t.rank}
                                    onChange={(e) =>
                                        updateTrainer(i, "rank", e.target.value)
                                    }
                                    placeholder="e.g. 3rd Dan"
                                    className={inputClass()}
                                />
                            </div>
                        </div>
                        <div>
                            <Label>Contact (email or phone)</Label>
                            <input
                                type="text"
                                value={t.contact}
                                onChange={(e) =>
                                    updateTrainer(i, "contact", e.target.value)
                                }
                                placeholder="trainer@example.com"
                                className={inputClass()}
                            />
                        </div>
                    </div>
                ))}
            </div>

            <button
                type="button"
                onClick={addTrainer}
                className="inline-flex items-center gap-2 text-xs font-bold tracking-widest uppercase text-accent-red hover:text-accent-red/80 transition-colors"
            >
                <Plus size={14} />
                Add another trainer
            </button>
        </div>
    );
}

function ReviewStep({
    form,
    update,
}: {
    form: FormState;
    update: <K extends keyof FormState>(k: K, v: FormState[K]) => void;
}) {
    return (
        <div className="space-y-6">
            <div>
                <h2 className="font-serif text-xl font-bold text-zinc-900 mb-1">
                    Review and submit
                </h2>
                <p className="text-zinc-500 text-sm">
                    Confirm your details. After submitting, we&apos;ll email an
                    OTP to verify ownership.
                </p>
            </div>

            <div className="bg-white border border-zinc-200 rounded-sm divide-y divide-zinc-200">
                <ReviewRow label="Dojo name" value={form.dojoName} />
                <ReviewRow label="Logo" value={form.logoName || "—"} />
                <ReviewRow label="Email" value={form.email} />
                <ReviewRow label="Phone" value={form.phone} />
                <ReviewRow
                    label="Contact"
                    value={`${form.contactName} (${form.contactRole})`}
                />
                <ReviewRow label="Address" value={form.address} />
                <ReviewRow
                    label="Coordinates"
                    value={
                        form.latitude && form.longitude
                            ? `${form.latitude}, ${form.longitude}`
                            : "—"
                    }
                />
                <ReviewRow
                    label="Interior photos"
                    value={`${form.interiorNames.length} uploaded`}
                />
                <ReviewRow
                    label="Trainers"
                    value={`${
                        form.trainers.filter((t) => t.name.trim()).length
                    } listed`}
                />
            </div>

            <label className="flex items-start gap-3 cursor-pointer">
                <input
                    type="checkbox"
                    checked={form.acceptedTerms}
                    onChange={(e) =>
                        update("acceptedTerms", e.target.checked)
                    }
                    className="mt-1 w-4 h-4 accent-accent-red"
                />
                <span className="text-sm text-zinc-700 leading-relaxed">
                    I have read and agree to the{" "}
                    <Link
                        href="/terms-and-conditions"
                        target="_blank"
                        className="text-accent-red font-semibold hover:underline"
                    >
                        Terms &amp; Conditions
                    </Link>
                    , the JKA Bangladesh Code of Conduct, and confirm the
                    information provided is accurate.
                </span>
            </label>
        </div>
    );
}

function ReviewRow({ label, value }: { label: string; value: string }) {
    return (
        <div className="flex justify-between gap-6 px-5 py-3 text-sm">
            <span className="text-zinc-500 text-xs tracking-widest uppercase font-bold">
                {label}
            </span>
            <span className="text-zinc-900 text-right break-words max-w-[60%]">
                {value || "—"}
            </span>
        </div>
    );
}
