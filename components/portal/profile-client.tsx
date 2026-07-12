"use client";

import { useEffect, useState, useTransition } from "react";
import { motion, AnimatePresence } from "motion/react";
import TiltCard from "@/components/portal/tilt-card";
import AvatarUploader from "@/components/portal/avatar-uploader";
import {
    User, Phone, Mail, MapPin, Shield, Loader2,
    CheckCircle2, AlertCircle, Key, Calendar, Award,
    Droplets, CreditCard, HeartPulse, FileText,
    Copy, ExternalLink, Share2,
} from "lucide-react";
import { updateProfileAction, changePasswordAction } from "@/app/portal/profile/actions";
import { BLOOD_GROUPS } from "@/lib/constants";
import { validatePhone } from "@/lib/validation/phone";

interface Props {
    member: any;
    dojos: any[];
    userId: string;
}

function toDateInputValue(val: any): string {
    if (!val) return "";
    try {
        return new Date(val).toISOString().split("T")[0];
    } catch {
        return "";
    }
}

function StatusBadge({ status }: { status?: string }) {
    const map: Record<string, { label: string; cls: string }> = {
        ACTIVE:    { label: "Active",    cls: "bg-emerald-50 text-emerald-600 border-emerald-200" },
        PENDING:   { label: "Pending",   cls: "bg-amber-50   text-amber-600   border-amber-200"   },
        EXPIRED:   { label: "Expired",   cls: "bg-red-50     text-red-600     border-red-200"     },
        SUSPENDED: { label: "Suspended", cls: "bg-zinc-100   text-zinc-500    border-zinc-300"    },
    };
    const s = map[status ?? ""] ?? { label: status ?? "Unknown", cls: "bg-zinc-100 text-zinc-500 border-zinc-200" };
    return (
        <span className={`text-[10px] font-bold tracking-widest uppercase px-2 py-0.5 rounded-full border ${s.cls}`}>
            {s.label}
        </span>
    );
}

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

export default function ProfileClient({ member, dojos, userId }: Props) {
    /* ── Personal info state ─────────────────────────────────────────────── */
    const [fullName,              setFullName]              = useState(member?.fullName ?? "");
    const [phone,                 setPhone]                 = useState(member?.phone ?? "");
    const [dojoId,                setDojoId]                = useState(member?.dojoId ?? "");
    const [dateOfBirth,           setDateOfBirth]           = useState(toDateInputValue(member?.dateOfBirth));
    const [bloodGroup,            setBloodGroup]            = useState(member?.bloodGroup ?? "");
    const [address,               setAddress]               = useState(member?.address ?? "");
    const [nationalId,            setNationalId]            = useState(member?.nationalId ?? "");
    const [emergencyContactName,  setEmergencyContactName]  = useState(member?.emergencyContactName ?? "");
    const [emergencyContactPhone, setEmergencyContactPhone] = useState(member?.emergencyContactPhone ?? "");

    const [profileMsg, setProfileMsg] = useState<{ type: "success" | "error"; message: string } | null>(null);
    const [isProfilePending, startProfileTransition] = useTransition();

    /* ── Password state ──────────────────────────────────────────────────── */
    const [newPassword,     setNewPassword]     = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [passwordMsg, setPasswordMsg] = useState<{ type: "success" | "error"; message: string } | null>(null);
    const [isPasswordPending, startPasswordTransition] = useTransition();

    /* ── Public share link ───────────────────────────────────────────────── */
    const [copied, setCopied] = useState(false);
    const publicProfilePath = `/members/${userId}`;
    const [publicProfileUrl, setPublicProfileUrl] = useState(publicProfilePath);
    useEffect(() => {
        setPublicProfileUrl(`${window.location.origin}${publicProfilePath}`);
    }, [publicProfilePath]);

    async function copyShareLink() {
        try {
            await navigator.clipboard.writeText(publicProfileUrl);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        } catch {
            // clipboard blocked — no-op
        }
    }

    /* ── Derived display values ──────────────────────────────────────────── */
    const expiryDate = member?.expiryDate
        ? new Date(member.expiryDate).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })
        : null;
    const createdAt = member?.createdAt
        ? new Date(member.createdAt).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })
        : null;

    /* ── Handlers ────────────────────────────────────────────────────────── */
    function handleProfileSubmit(e: React.FormEvent<HTMLFormElement>) {
        e.preventDefault();
        setProfileMsg(null);
        const phoneError = validatePhone(phone);
        if (phoneError) {
            setProfileMsg({ type: "error", message: phoneError });
            return;
        }
        if (emergencyContactPhone.trim()) {
            const emergencyError = validatePhone(emergencyContactPhone);
            if (emergencyError) {
                setProfileMsg({ type: "error", message: `Emergency contact: ${emergencyError}` });
                return;
            }
        }
        const formData = new FormData(e.currentTarget);
        startProfileTransition(async () => {
            const res = await updateProfileAction(formData);
            setProfileMsg(res.error
                ? { type: "error",   message: res.error }
                : { type: "success", message: "Profile updated successfully." }
            );
        });
    }

    function handlePasswordSubmit(e: React.FormEvent<HTMLFormElement>) {
        e.preventDefault();
        setPasswordMsg(null);
        const formData = new FormData(e.currentTarget);
        startPasswordTransition(async () => {
            const res = await changePasswordAction(formData);
            if (res.error) {
                setPasswordMsg({ type: "error", message: res.error });
            } else {
                setPasswordMsg({ type: "success", message: "Password changed successfully." });
                setNewPassword("");
                setConfirmPassword("");
            }
        });
    }

    /* ── Shared field styles ─────────────────────────────────────────────── */
    const inputCls    = "w-full bg-zinc-50 border border-zinc-200 rounded-xl py-3 pl-10 pr-4 text-sm focus:outline-none focus:border-accent-red focus:bg-white transition-all";
    const disabledCls = "w-full bg-zinc-100 border border-zinc-200 rounded-xl py-3 pl-10 pr-4 text-sm text-zinc-400 cursor-not-allowed";
    const labelCls    = "text-xs font-bold tracking-widest uppercase text-zinc-500 block mb-1.5";

    return (
        <div className="space-y-6 max-w-2xl">
            <div>
                <h1 className="text-2xl sm:text-3xl font-bold text-zinc-900">My Profile</h1>
                <p className="text-zinc-500 mt-1 text-sm">Manage your personal information and account settings.</p>
            </div>

            {/* ── Member summary card ───────────────────────────────────────── */}
            <TiltCard delay={0.05} className="p-5" tilt={false} glow={false}>
                <div className="flex items-center gap-5">
                    <AvatarUploader
                        initialUrl={member?.avatarUrl ?? null}
                        fallbackInitial={member?.fullName?.charAt(0)?.toUpperCase() ?? "M"}
                        sizeClasses="w-20 h-20"
                        showHint={false}
                    />
                    <div className="flex-1 min-w-0">
                        <h2 className="text-lg font-bold text-zinc-900 truncate">{member?.fullName ?? "Member"}</h2>
                        <p className="text-sm text-zinc-500 truncate">{member?.email ?? ""}</p>
                        <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                            <span className="text-[10px] font-bold tracking-widest uppercase bg-blue-50 text-blue-600 px-2 py-0.5 rounded-full border border-blue-200">
                                {member?.role ?? "STUDENT"}
                            </span>
                            <span className="text-[10px] font-bold tracking-widest uppercase bg-amber-50 text-amber-600 px-2 py-0.5 rounded-full border border-amber-200 flex items-center gap-1">
                                <Award size={10} /> {member?.currentRank ?? "White Belt"}
                            </span>
                            <StatusBadge status={member?.membershipStatus} />
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mt-5 pt-4 border-t border-zinc-100">
                    {member?.memberNumber && (
                        <div>
                            <p className="text-[10px] tracking-widest uppercase text-zinc-400 font-bold">Member No.</p>
                            <p className="text-sm font-semibold text-zinc-700 mt-0.5">{member.memberNumber}</p>
                        </div>
                    )}
                    {member?.dojo && (
                        <div>
                            <p className="text-[10px] tracking-widest uppercase text-zinc-400 font-bold">Dojo</p>
                            <p className="text-sm font-semibold text-zinc-700 mt-0.5 truncate">{member.dojo.name}</p>
                        </div>
                    )}
                    {expiryDate && (
                        <div>
                            <p className="text-[10px] tracking-widest uppercase text-zinc-400 font-bold">Expires</p>
                            <p className="text-sm font-semibold text-zinc-700 mt-0.5">{expiryDate}</p>
                        </div>
                    )}
                    {createdAt && (
                        <div>
                            <p className="text-[10px] tracking-widest uppercase text-zinc-400 font-bold">Member Since</p>
                            <p className="text-sm font-semibold text-zinc-700 mt-0.5">{createdAt}</p>
                        </div>
                    )}
                </div>
            </TiltCard>

            {/* ── Public profile / share link ───────────────────────────────── */}
            <TiltCard delay={0.08} className="p-5" tilt={false} glow={false}>
                <div className="flex items-start gap-3 mb-4">
                    <div className="w-9 h-9 rounded-full bg-blue-50 border border-blue-100 flex items-center justify-center shrink-0">
                        <Share2 size={16} className="text-blue-500" />
                    </div>
                    <div className="min-w-0 flex-1">
                        <h2 className="text-sm font-bold text-zinc-900">Public Profile</h2>
                        <p className="text-xs text-zinc-500 mt-0.5">
                            Your profile is not listed on any dojo page. Share this private link with anyone you want to view it.
                        </p>
                    </div>
                </div>

                <div className="flex flex-col sm:flex-row gap-2">
                    <div className="relative flex-1 min-w-0">
                        <input
                            type="text"
                            readOnly
                            value={publicProfileUrl}
                            onFocus={(e) => e.currentTarget.select()}
                            className="w-full bg-zinc-50 border border-zinc-200 rounded-xl py-2.5 px-3 text-xs font-mono text-zinc-700 focus:outline-none focus:border-accent-red truncate"
                        />
                    </div>
                    <button
                        type="button"
                        onClick={copyShareLink}
                        className="inline-flex items-center justify-center gap-2 bg-zinc-900 hover:bg-accent-red text-white text-xs font-bold px-4 py-2.5 rounded-xl transition-colors shrink-0"
                    >
                        {copied ? <CheckCircle2 size={14} /> : <Copy size={14} />}
                        {copied ? "Copied" : "Copy link"}
                    </button>
                    <a
                        href={publicProfilePath}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center justify-center gap-2 bg-white border border-zinc-200 hover:border-accent-red hover:text-accent-red text-zinc-700 text-xs font-bold px-4 py-2.5 rounded-xl transition-colors shrink-0"
                    >
                        <ExternalLink size={14} />
                        View
                    </a>
                </div>
            </TiltCard>

            {/* ── Edit profile form ─────────────────────────────────────────── */}
            <TiltCard delay={0.1} className="p-6" tilt={false} glow={false}>
                <form onSubmit={handleProfileSubmit} className="space-y-6">
                {/* Personal */}
                <div>
                    <h2 className="text-sm font-bold text-zinc-900 mb-4 flex items-center gap-2">
                        <User size={16} className="text-blue-500" />
                        Personal Information
                    </h2>

                    <FeedbackBanner msg={profileMsg} />

                    <div className="space-y-4">
                        {/* Full name */}
                        <div>
                            <label className={labelCls}>Full Name *</label>
                            <div className="relative">
                                <User size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400" />
                                <input
                                    type="text"
                                    name="fullName"
                                    value={fullName}
                                    onChange={(e) => setFullName(e.target.value)}
                                    required
                                    placeholder="Your full name"
                                    className={inputCls}
                                />
                            </div>
                        </div>

                        {/* Email (read-only) */}
                        <div>
                            <label className={labelCls}>Email Address</label>
                            <div className="relative">
                                <Mail size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-300" />
                                <input type="email" value={member?.email ?? ""} disabled className={disabledCls} />
                            </div>
                            <p className="text-xs text-zinc-400 mt-1 pl-1">Email cannot be changed here. Contact an admin.</p>
                        </div>

                        {/* Date of birth + Blood group */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                                <label className={labelCls}>Date of Birth</label>
                                <div className="relative">
                                    <Calendar size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400" />
                                    <input
                                        type="date"
                                        name="dateOfBirth"
                                        value={dateOfBirth}
                                        onChange={(e) => setDateOfBirth(e.target.value)}
                                        className={inputCls}
                                    />
                                </div>
                            </div>

                            <div>
                                <label className={labelCls}>Blood Group</label>
                                <div className="relative">
                                    <Droplets size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400" />
                                    <select
                                        name="bloodGroup"
                                        value={bloodGroup}
                                        onChange={(e) => setBloodGroup(e.target.value)}
                                        className={`${inputCls} appearance-none`}
                                    >
                                        <option value="">Select…</option>
                                        {BLOOD_GROUPS.map((g) => (
                                            <option key={g} value={g}>{g}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>
                        </div>

                        {/* National ID */}
                        <div>
                            <label className={labelCls}>National ID / Passport No.</label>
                            <div className="relative">
                                <CreditCard size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400" />
                                <input
                                    type="text"
                                    name="nationalId"
                                    value={nationalId}
                                    onChange={(e) => setNationalId(e.target.value)}
                                    placeholder="NID or passport number"
                                    className={inputCls}
                                />
                            </div>
                        </div>

                        {/* Address */}
                        <div>
                            <label className={labelCls}>Address</label>
                            <div className="relative">
                                <MapPin size={16} className="absolute left-3.5 top-3.5 text-zinc-400" />
                                <textarea
                                    name="address"
                                    value={address}
                                    onChange={(e) => setAddress(e.target.value)}
                                    placeholder="Your full address"
                                    rows={2}
                                    className="w-full bg-zinc-50 border border-zinc-200 rounded-xl py-3 pl-10 pr-4 text-sm focus:outline-none focus:border-accent-red focus:bg-white transition-all resize-none"
                                />
                            </div>
                        </div>
                    </div>
                </div>

                <div className="border-t border-zinc-100" />

                {/* Contact */}
                <div>
                    <h2 className="text-sm font-bold text-zinc-900 mb-4 flex items-center gap-2">
                        <Phone size={16} className="text-emerald-500" />
                        Contact Details
                    </h2>

                    <div className="space-y-4">
                        <div>
                            <label className={labelCls}>Phone Number *</label>
                            <div className="relative">
                                <Phone size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400" />
                                <input
                                    type="tel"
                                    name="phone"
                                    inputMode="numeric"
                                    pattern="\d{11}"
                                    maxLength={11}
                                    minLength={11}
                                    title="Phone number must be exactly 11 digits."
                                    value={phone}
                                    onChange={(e) => setPhone(e.target.value.replace(/\D/g, "").slice(0, 11))}
                                    placeholder="01XXXXXXXXX"
                                    className={inputCls}
                                />
                            </div>
                        </div>

                        <div>
                            <label className={labelCls}>Dojo *</label>
                            <div className="relative">
                                <MapPin size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400" />
                                <select
                                    name="dojoId"
                                    value={dojoId}
                                    onChange={(e) => setDojoId(e.target.value)}
                                    className={`${inputCls} appearance-none`}
                                >
                                    <option value="">Select a dojo…</option>
                                    {dojos.map((d: any) => (
                                        <option key={d.id} value={d.id}>{d.name} — {d.city}</option>
                                    ))}
                                </select>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="border-t border-zinc-100" />

                {/* Emergency contact */}
                <div>
                    <h2 className="text-sm font-bold text-zinc-900 mb-4 flex items-center gap-2">
                        <HeartPulse size={16} className="text-red-500" />
                        Emergency Contact
                    </h2>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                            <label className={labelCls}>Contact Name</label>
                            <div className="relative">
                                <User size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400" />
                                <input
                                    type="text"
                                    name="emergencyContactName"
                                    value={emergencyContactName}
                                    onChange={(e) => setEmergencyContactName(e.target.value)}
                                    placeholder="Full name"
                                    className={inputCls}
                                />
                            </div>
                        </div>

                        <div>
                            <label className={labelCls}>Contact Phone</label>
                            <div className="relative">
                                <Phone size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400" />
                                <input
                                    type="tel"
                                    name="emergencyContactPhone"
                                    inputMode="numeric"
                                    pattern="\d{11}"
                                    maxLength={11}
                                    title="Phone number must be exactly 11 digits."
                                    value={emergencyContactPhone}
                                    onChange={(e) => setEmergencyContactPhone(e.target.value.replace(/\D/g, "").slice(0, 11))}
                                    placeholder="01XXXXXXXXX"
                                    className={inputCls}
                                />
                            </div>
                        </div>
                    </div>
                </div>

                <div className="border-t border-zinc-100" />

                {/* Membership info (read-only) */}
                <div>
                    <h2 className="text-sm font-bold text-zinc-900 mb-4 flex items-center gap-2">
                        <FileText size={16} className="text-zinc-400" />
                        Membership Info
                        <span className="text-[10px] font-normal text-zinc-400 ml-1">(read only)</span>
                    </h2>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                            <label className={labelCls}>Current Rank</label>
                            <div className="relative">
                                <Award size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-300" />
                                <input type="text" value={member?.currentRank ?? "White Belt"} disabled className={disabledCls} />
                            </div>
                            <p className="text-xs text-zinc-400 mt-1 pl-1">Updated by your instructor after gradings.</p>
                        </div>

                        <div>
                            <label className={labelCls}>Membership Expiry</label>
                            <div className="relative">
                                <Calendar size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-300" />
                                <input type="text" value={expiryDate ?? "No expiry set"} disabled className={disabledCls} />
                            </div>
                        </div>
                    </div>
                </div>

                {/* Save */}
                <div className="pt-2">
                    <button
                        type="submit"
                        disabled={isProfilePending}
                        className="w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-zinc-900 hover:bg-accent-red text-white text-sm font-bold px-6 py-3 rounded-xl transition-colors disabled:opacity-60"
                    >
                        {isProfilePending ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle2 size={16} />}
                        Save Changes
                    </button>
                </div>
                </form>
            </TiltCard>

            {/* ── Change password ───────────────────────────────────────────── */}
            <TiltCard delay={0.15} className="p-6" tilt={false} glow={false}>
                <h2 className="text-sm font-bold text-zinc-900 mb-4 flex items-center gap-2">
                    <Key size={16} className="text-red-500" />
                    Change Password
                </h2>

                <FeedbackBanner msg={passwordMsg} />

                <form onSubmit={handlePasswordSubmit} className="space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                            <label className={labelCls}>New Password</label>
                            <div className="relative">
                                <Shield size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400" />
                                <input
                                    type="password"
                                    name="newPassword"
                                    value={newPassword}
                                    onChange={(e) => setNewPassword(e.target.value)}
                                    required
                                    minLength={8}
                                    placeholder="Minimum 8 characters"
                                    className={inputCls}
                                />
                            </div>
                        </div>

                        <div>
                            <label className={labelCls}>Confirm New Password</label>
                            <div className="relative">
                                <Shield size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400" />
                                <input
                                    type="password"
                                    name="confirmPassword"
                                    value={confirmPassword}
                                    onChange={(e) => setConfirmPassword(e.target.value)}
                                    required
                                    placeholder="Repeat new password"
                                    className={`w-full bg-zinc-50 border rounded-xl py-3 pl-10 pr-4 text-sm focus:outline-none transition-all ${
                                        confirmPassword && newPassword !== confirmPassword
                                            ? "border-red-300 focus:border-red-400"
                                            : "border-zinc-200 focus:border-accent-red focus:bg-white"
                                    }`}
                                />
                            </div>
                            {confirmPassword && newPassword !== confirmPassword && (
                                <p className="text-xs text-red-500 mt-1 pl-1">Passwords do not match.</p>
                            )}
                        </div>
                    </div>

                    <div className="pt-1">
                        <button
                            type="submit"
                            disabled={isPasswordPending || (!!confirmPassword && newPassword !== confirmPassword)}
                            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-zinc-900 hover:bg-red-600 text-white text-sm font-bold px-6 py-3 rounded-xl transition-colors disabled:opacity-60"
                        >
                            {isPasswordPending ? <Loader2 size={16} className="animate-spin" /> : <Key size={16} />}
                            Update Password
                        </button>
                    </div>
                </form>
            </TiltCard>
        </div>
    );
}
