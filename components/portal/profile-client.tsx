"use client";

import { useState, useTransition } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
    User, Phone, Mail, MapPin, Shield, Loader2,
    CheckCircle2, AlertCircle, Key, Calendar, Award,
} from "lucide-react";
import { updateProfileAction, changePasswordAction } from "@/app/portal/profile/actions";

interface Props {
    member: any;
    dojos: any[];
    userId: string;
}

export default function ProfileClient({ member, dojos, userId }: Props) {
    // Profile form state
    const [fullName, setFullName]   = useState(member?.fullName ?? "");
    const [phone, setPhone]         = useState(member?.phone ?? "");
    const [dojoId, setDojoId]       = useState(member?.dojoId ?? "");
    const [profileMsg, setProfileMsg] = useState<{ type: "success" | "error"; message: string } | null>(null);
    const [isProfilePending, startProfileTransition] = useTransition();

    // Password form state
    const [newPassword, setNewPassword]         = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [passwordMsg, setPasswordMsg] = useState<{ type: "success" | "error"; message: string } | null>(null);
    const [isPasswordPending, startPasswordTransition] = useTransition();

    function handleProfileSubmit(e: React.FormEvent<HTMLFormElement>) {
        e.preventDefault();
        setProfileMsg(null);
        const formData = new FormData(e.currentTarget);
        startProfileTransition(async () => {
            const res = await updateProfileAction(formData);
            setProfileMsg(res.error
                ? { type: "error", message: res.error }
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

    const expiryDate = member?.expiryDate
        ? new Date(member.expiryDate).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })
        : null;

    const createdAt = member?.createdAt
        ? new Date(member.createdAt).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })
        : null;

    return (
        <div className="space-y-6 max-w-2xl">
            <div>
                <h1 className="text-2xl sm:text-3xl font-bold text-zinc-900">My Profile</h1>
                <p className="text-zinc-500 mt-1 text-sm">Manage your personal information and account settings.</p>
            </div>

            {/* Member summary */}
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="bg-white rounded-2xl p-5 border border-zinc-100 shadow-sm"
            >
                <div className="flex items-center gap-4">
                    <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-zinc-900 to-zinc-700 flex items-center justify-center text-white text-2xl font-bold flex-shrink-0">
                        {member?.fullName?.charAt(0) ?? "M"}
                    </div>
                    <div className="flex-1 min-w-0">
                        <h2 className="text-lg font-bold text-zinc-900 truncate">{member?.fullName ?? "Member"}</h2>
                        <p className="text-sm text-zinc-500 truncate">{member?.email ?? ""}</p>
                        <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                            <span className="text-[10px] font-bold tracking-widest uppercase bg-emerald-50 text-emerald-600 px-2 py-0.5 rounded-full">
                                {member?.role ?? "STUDENT"}
                            </span>
                            <span className="text-[10px] font-bold tracking-widest uppercase bg-amber-50 text-amber-600 px-2 py-0.5 rounded-full flex items-center gap-1">
                                <Award size={10} /> {member?.currentRank ?? "White Belt"}
                            </span>
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mt-5 pt-4 border-t border-zinc-100">
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
            </motion.div>

            {/* Edit profile form */}
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.15 }}
                className="bg-white rounded-2xl p-6 border border-zinc-100 shadow-sm"
            >
                <h2 className="text-sm font-bold text-zinc-900 mb-5 flex items-center gap-2">
                    <User size={16} className="text-blue-500" />
                    Personal Information
                </h2>

                <AnimatePresence>
                    {profileMsg && (
                        <motion.div
                            initial={{ opacity: 0, y: -8 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0 }}
                            className={`flex items-center gap-2 p-3.5 rounded-xl mb-4 text-sm font-medium ${
                                profileMsg.type === "success"
                                    ? "bg-emerald-50 border border-emerald-200 text-emerald-700"
                                    : "bg-red-50 border border-red-200 text-red-700"
                            }`}
                        >
                            {profileMsg.type === "success" ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
                            {profileMsg.message}
                        </motion.div>
                    )}
                </AnimatePresence>

                <form onSubmit={handleProfileSubmit} className="space-y-4">
                    <div>
                        <label className="text-xs font-bold tracking-widest uppercase text-zinc-500 block mb-1.5">
                            Full Name *
                        </label>
                        <div className="relative">
                            <User size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400" />
                            <input
                                type="text"
                                name="fullName"
                                value={fullName}
                                onChange={(e) => setFullName(e.target.value)}
                                required
                                placeholder="Your full name"
                                className="w-full bg-zinc-50 border border-zinc-200 rounded-xl py-3 pl-10 pr-4 text-sm focus:outline-none focus:border-accent-red focus:bg-white transition-all"
                            />
                        </div>
                    </div>

                    <div>
                        <label className="text-xs font-bold tracking-widest uppercase text-zinc-500 block mb-1.5">
                            Email Address
                        </label>
                        <div className="relative">
                            <Mail size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-300" />
                            <input
                                type="email"
                                value={member?.email ?? ""}
                                disabled
                                className="w-full bg-zinc-100 border border-zinc-200 rounded-xl py-3 pl-10 pr-4 text-sm text-zinc-400 cursor-not-allowed"
                            />
                        </div>
                        <p className="text-xs text-zinc-400 mt-1 pl-1">Email cannot be changed here. Contact an admin.</p>
                    </div>

                    <div>
                        <label className="text-xs font-bold tracking-widest uppercase text-zinc-500 block mb-1.5">
                            Phone Number
                        </label>
                        <div className="relative">
                            <Phone size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400" />
                            <input
                                type="tel"
                                name="phone"
                                value={phone}
                                onChange={(e) => setPhone(e.target.value)}
                                placeholder="+880 1X XXX XXXXX"
                                className="w-full bg-zinc-50 border border-zinc-200 rounded-xl py-3 pl-10 pr-4 text-sm focus:outline-none focus:border-accent-red focus:bg-white transition-all"
                            />
                        </div>
                    </div>

                    <div>
                        <label className="text-xs font-bold tracking-widest uppercase text-zinc-500 block mb-1.5">
                            Dojo
                        </label>
                        <div className="relative">
                            <MapPin size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400" />
                            <select
                                name="dojoId"
                                value={dojoId}
                                onChange={(e) => setDojoId(e.target.value)}
                                className="w-full bg-zinc-50 border border-zinc-200 rounded-xl py-3 pl-10 pr-4 text-sm focus:outline-none focus:border-accent-red focus:bg-white transition-all appearance-none"
                            >
                                <option value="">Select a dojo...</option>
                                {dojos.map((d: any) => (
                                    <option key={d.id} value={d.id}>{d.name} — {d.city}</option>
                                ))}
                            </select>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                            <label className="text-xs font-bold tracking-widest uppercase text-zinc-500 block mb-1.5">
                                Current Rank
                            </label>
                            <div className="relative">
                                <Award size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-300" />
                                <input
                                    type="text"
                                    value={member?.currentRank ?? "White Belt"}
                                    disabled
                                    className="w-full bg-zinc-100 border border-zinc-200 rounded-xl py-3 pl-10 pr-4 text-sm text-zinc-400 cursor-not-allowed"
                                />
                            </div>
                            <p className="text-xs text-zinc-400 mt-1 pl-1">Updated by your instructor.</p>
                        </div>
                        <div>
                            <label className="text-xs font-bold tracking-widest uppercase text-zinc-500 block mb-1.5">
                                Membership Expiry
                            </label>
                            <div className="relative">
                                <Calendar size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-300" />
                                <input
                                    type="text"
                                    value={expiryDate ?? "No expiry set"}
                                    disabled
                                    className="w-full bg-zinc-100 border border-zinc-200 rounded-xl py-3 pl-10 pr-4 text-sm text-zinc-400 cursor-not-allowed"
                                />
                            </div>
                        </div>
                    </div>

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
            </motion.div>

            {/* Change password */}
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="bg-white rounded-2xl p-6 border border-zinc-100 shadow-sm"
            >
                <h2 className="text-sm font-bold text-zinc-900 mb-5 flex items-center gap-2">
                    <Key size={16} className="text-red-500" />
                    Change Password
                </h2>

                <AnimatePresence>
                    {passwordMsg && (
                        <motion.div
                            initial={{ opacity: 0, y: -8 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0 }}
                            className={`flex items-center gap-2 p-3.5 rounded-xl mb-4 text-sm font-medium ${
                                passwordMsg.type === "success"
                                    ? "bg-emerald-50 border border-emerald-200 text-emerald-700"
                                    : "bg-red-50 border border-red-200 text-red-700"
                            }`}
                        >
                            {passwordMsg.type === "success" ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
                            {passwordMsg.message}
                        </motion.div>
                    )}
                </AnimatePresence>

                <form onSubmit={handlePasswordSubmit} className="space-y-4">
                    <div>
                        <label className="text-xs font-bold tracking-widest uppercase text-zinc-500 block mb-1.5">
                            New Password
                        </label>
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
                                className="w-full bg-zinc-50 border border-zinc-200 rounded-xl py-3 pl-10 pr-4 text-sm focus:outline-none focus:border-accent-red focus:bg-white transition-all"
                            />
                        </div>
                    </div>

                    <div>
                        <label className="text-xs font-bold tracking-widest uppercase text-zinc-500 block mb-1.5">
                            Confirm New Password
                        </label>
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

                    <div className="pt-2">
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
            </motion.div>
        </div>
    );
}
