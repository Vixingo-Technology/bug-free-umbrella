"use client";

import { useState, useTransition } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
    User, Phone, Mail, Shield, Loader2,
    CheckCircle2, AlertCircle, Key, Save, FileText, IdCard,
} from "lucide-react";
import AvatarUploader from "@/components/portal/avatar-uploader";
import { updateAccountAction, changePasswordAction } from "@/app/portal/account/actions";
import { validatePhone } from "@/lib/validation/phone";
import { displayEmail } from "@/lib/format/email";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

interface Props {
    user: {
        id: string;
        email: string;
        contactEmail: string | null;
        phone: string | null;
        fullName: string;
        avatarUrl: string | null;
        bio: string | null;
        roleId: string;
        memberNumber: string | null;
        createdAt: Date;
    };
}

const roleColors: Record<string, string> = {
    ADMIN: "from-amber-500 to-amber-600",
    DOJO_OWNER: "from-rose-500 to-red-600",
    DOJO_MANAGER: "from-blue-500 to-indigo-600",
    INSTRUCTOR: "from-blue-500 to-indigo-600",
    STUDENT: "from-emerald-500 to-green-600",
};

function FeedbackBanner({ msg }: { msg: { type: "success" | "error"; message: string } | null }) {
    return (
        <AnimatePresence>
            {msg && (
                <motion.div
                    initial={{ opacity: 0, y: -8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    className={`flex items-center gap-2 p-3.5 rounded-xl mb-4 text-sm font-medium ${
                        msg.type === "success"
                            ? "bg-emerald-50 border border-emerald-200 text-emerald-700"
                            : "bg-red-50 border border-red-200 text-red-700"
                    }`}
                >
                    {msg.type === "success" ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
                    {msg.message}
                </motion.div>
            )}
        </AnimatePresence>
    );
}

export default function AccountClient({ user }: Props) {
    const [fullName, setFullName] = useState(user.fullName);
    const [phone, setPhone]       = useState(user.phone ?? "");
    const [avatarUrl, setAvatarUrl] = useState(user.avatarUrl);
    const [bio, setBio]           = useState(user.bio ?? "");
    const [contactEmail, setContactEmail] = useState(displayEmail(user));

    const [accountMsg, setAccountMsg] = useState<{ type: "success" | "error"; message: string } | null>(null);
    const [isAccountPending, startAccountTransition] = useTransition();

    const [newPassword, setNewPassword]         = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [passwordMsg, setPasswordMsg] = useState<{ type: "success" | "error"; message: string } | null>(null);
    const [isPasswordPending, startPasswordTransition] = useTransition();

    const roleColor = roleColors[user.roleId] ?? roleColors.STUDENT;

    function handleAccountSubmit(e: React.FormEvent<HTMLFormElement>) {
        e.preventDefault();
        setAccountMsg(null);

        if (!fullName.trim()) {
            setAccountMsg({ type: "error", message: "Full name is required." });
            return;
        }
        const phoneError = validatePhone(phone);
        if (phoneError) {
            setAccountMsg({ type: "error", message: phoneError });
            return;
        }
        if (bio.length > 280) {
            setAccountMsg({ type: "error", message: "Bio must be 280 characters or less." });
            return;
        }
        const emailTrimmed = contactEmail.trim();
        if (emailTrimmed && !EMAIL_PATTERN.test(emailTrimmed)) {
            setAccountMsg({ type: "error", message: "Please enter a valid email address." });
            return;
        }

        const fd = new FormData();
        fd.append("fullName", fullName);
        fd.append("phone", phone);
        fd.append("avatarUrl", avatarUrl ?? "");
        fd.append("bio", bio);
        fd.append("contactEmail", emailTrimmed);

        startAccountTransition(async () => {
            const res = await updateAccountAction(fd);
            if (res.error) {
                setAccountMsg({ type: "error", message: res.error });
            } else {
                setAccountMsg({
                    type: "success",
                    message: res.notice ?? "Account updated.",
                });
                setTimeout(() => setAccountMsg(null), res.notice ? 6000 : 2500);
            }
        });
    }

    function handlePasswordSubmit(e: React.FormEvent<HTMLFormElement>) {
        e.preventDefault();
        setPasswordMsg(null);

        if (newPassword.length < 8) {
            setPasswordMsg({ type: "error", message: "Password must be at least 8 characters." });
            return;
        }
        if (newPassword !== confirmPassword) {
            setPasswordMsg({ type: "error", message: "Passwords do not match." });
            return;
        }

        const fd = new FormData();
        fd.append("newPassword", newPassword);
        fd.append("confirmPassword", confirmPassword);

        startPasswordTransition(async () => {
            const res = await changePasswordAction(fd);
            if (res.error) {
                setPasswordMsg({ type: "error", message: res.error });
            } else {
                setPasswordMsg({ type: "success", message: "Password changed successfully." });
                setNewPassword("");
                setConfirmPassword("");
                setTimeout(() => setPasswordMsg(null), 2500);
            }
        });
    }

    return (
        <div className="max-w-3xl mx-auto space-y-6">
            {/* Header */}
            <div className="flex items-center gap-4">
                <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${roleColor} flex items-center justify-center text-white font-bold text-xl shadow-sm`}>
                    {user.fullName.charAt(0).toUpperCase()}
                </div>
                <div>
                    <h1 className="text-2xl font-bold text-zinc-900">Account</h1>
                    <p className="text-sm text-zinc-500">
                        Manage your personal information and password.
                    </p>
                </div>
            </div>

            {/* Account card */}
            <section className="bg-white rounded-2xl border border-zinc-100 shadow-sm overflow-hidden">
                <div className="px-6 py-5 border-b border-zinc-100 flex items-center gap-2">
                    <User size={16} className="text-zinc-400" />
                    <h2 className="text-sm font-semibold tracking-wide uppercase text-zinc-700">Profile</h2>
                </div>

                <form onSubmit={handleAccountSubmit} className="px-6 py-6 space-y-5">
                    <FeedbackBanner msg={accountMsg} />

                    {/* Avatar */}
                    <div className="flex items-center gap-5">
                        <AvatarUploader
                            initialUrl={avatarUrl}
                            fallbackInitial={user.fullName.charAt(0)}
                            sizeClasses="w-20 h-20"
                            onUploaded={(url) => setAvatarUrl(url)}
                            showHint={false}
                        />
                        <div className="text-xs text-zinc-500">
                            <p className="font-medium text-zinc-700 mb-0.5">Profile picture</p>
                            <p>JPG or PNG, up to a few MB.</p>
                        </div>
                    </div>

                    <div className="grid gap-4 sm:grid-cols-2">
                        <Field label="Full name" icon={<User size={14} />} required>
                            <input
                                type="text"
                                value={fullName}
                                onChange={(e) => setFullName(e.target.value)}
                                required
                                className="input"
                            />
                        </Field>

                        <Field label="Email" icon={<Mail size={14} />} hint="Where we send notifications">
                            <input
                                type="email"
                                value={contactEmail}
                                onChange={(e) => setContactEmail(e.target.value)}
                                placeholder="you@example.com"
                                autoComplete="email"
                                className="input"
                            />
                        </Field>

                        <Field label="Phone" icon={<Phone size={14} />} required hint="11 digits">
                            <input
                                type="tel"
                                value={phone}
                                onChange={(e) => setPhone(e.target.value.replace(/\D/g, "").slice(0, 11))}
                                placeholder="01XXXXXXXXX"
                                inputMode="numeric"
                                maxLength={11}
                                required
                                className="input"
                            />
                        </Field>

                        <Field label="Role" icon={<Shield size={14} />}>
                            <input
                                type="text"
                                value={user.roleId.replace(/_/g, " ")}
                                readOnly
                                className="input bg-zinc-50 text-zinc-500 cursor-not-allowed capitalize"
                            />
                        </Field>

                        <Field
                            label="Member ID"
                            icon={<IdCard size={14} />}
                            hint={user.memberNumber ? "Use to log in" : undefined}
                        >
                            <input
                                type="text"
                                value={user.memberNumber ?? "Not yet assigned"}
                                readOnly
                                className="input bg-zinc-50 text-zinc-500 cursor-not-allowed font-mono tracking-wide"
                            />
                        </Field>
                    </div>

                    <Field
                        label="Short bio"
                        icon={<FileText size={14} />}
                        hint={`${bio.length}/280`}
                    >
                        <textarea
                            value={bio}
                            onChange={(e) => setBio(e.target.value)}
                            maxLength={280}
                            rows={3}
                            placeholder="A sentence or two about yourself"
                            className="input resize-none"
                        />
                    </Field>

                    <div className="flex justify-end pt-2 border-t border-zinc-100">
                        <button
                            type="submit"
                            disabled={isAccountPending}
                            className="inline-flex items-center gap-2 bg-zinc-900 text-white text-sm font-medium px-4 py-2.5 rounded-xl hover:bg-zinc-800 disabled:opacity-60 disabled:cursor-not-allowed transition"
                        >
                            {isAccountPending ? <Loader2 size={15} className="animate-spin" /> : <Save size={15} />}
                            Save changes
                        </button>
                    </div>
                </form>
            </section>

            {/* Password card */}
            <section className="bg-white rounded-2xl border border-zinc-100 shadow-sm overflow-hidden">
                <div className="px-6 py-5 border-b border-zinc-100 flex items-center gap-2">
                    <Key size={16} className="text-zinc-400" />
                    <h2 className="text-sm font-semibold tracking-wide uppercase text-zinc-700">Change password</h2>
                </div>

                <form onSubmit={handlePasswordSubmit} className="px-6 py-6 space-y-5">
                    <FeedbackBanner msg={passwordMsg} />

                    <div className="grid gap-4 sm:grid-cols-2">
                        <Field label="New password" required>
                            <input
                                type="password"
                                value={newPassword}
                                onChange={(e) => setNewPassword(e.target.value)}
                                minLength={8}
                                required
                                className="input"
                                autoComplete="new-password"
                            />
                        </Field>

                        <Field label="Confirm new password" required>
                            <input
                                type="password"
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                                minLength={8}
                                required
                                className="input"
                                autoComplete="new-password"
                            />
                        </Field>
                    </div>

                    <p className="text-xs text-zinc-500">
                        Use at least 8 characters. Mixing letters, numbers and symbols is recommended.
                    </p>

                    <div className="flex justify-end pt-2 border-t border-zinc-100">
                        <button
                            type="submit"
                            disabled={isPasswordPending}
                            className="inline-flex items-center gap-2 bg-accent-red text-white text-sm font-medium px-4 py-2.5 rounded-xl hover:bg-red-700 disabled:opacity-60 disabled:cursor-not-allowed transition"
                        >
                            {isPasswordPending ? <Loader2 size={15} className="animate-spin" /> : <Key size={15} />}
                            Update password
                        </button>
                    </div>
                </form>
            </section>

            <style jsx>{`
                :global(.input) {
                    width: 100%;
                    border: 1px solid #e4e4e7;
                    border-radius: 0.75rem;
                    padding: 0.625rem 0.875rem;
                    font-size: 0.875rem;
                    background: white;
                    color: #18181b;
                    transition: border-color 120ms, box-shadow 120ms;
                }
                :global(.input:focus) {
                    outline: none;
                    border-color: #a1a1aa;
                    box-shadow: 0 0 0 3px rgba(161, 161, 170, 0.15);
                }
            `}</style>
        </div>
    );
}

function Field({
    label,
    icon,
    required,
    hint,
    children,
}: {
    label: string;
    icon?: React.ReactNode;
    required?: boolean;
    hint?: string;
    children: React.ReactNode;
}) {
    return (
        <label className="block space-y-1.5">
            <span className="flex items-center gap-1.5 text-xs font-medium text-zinc-600">
                {icon}
                {label}
                {required && <span className="text-accent-red">*</span>}
                {hint && <span className="ml-auto text-[10px] text-zinc-400 font-normal normal-case">{hint}</span>}
            </span>
            {children}
        </label>
    );
}
