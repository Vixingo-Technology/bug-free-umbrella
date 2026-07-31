"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "motion/react";
import { LogOut, User, UserCircle2 } from "lucide-react";
import { signoutAction } from "@/app/actions/auth";

interface Props {
    profileHref: string;
    profileLabel: string;
    avatarUrl: string | null;
    fullName: string;
    email: string;
    /** Diameter of the trigger avatar image. */
    avatarSize?: number;
    /** Size of the fallback User icon inside the trigger. */
    iconSize?: number;
}

export default function ProfileMenu({
    profileHref,
    profileLabel,
    avatarUrl,
    fullName,
    email,
    avatarSize = 28,
    iconSize = 20,
}: Props) {
    const [open, setOpen] = useState(false);
    const wrapRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        function onDocClick(e: MouseEvent) {
            if (!wrapRef.current) return;
            if (!wrapRef.current.contains(e.target as Node)) setOpen(false);
        }
        function onEsc(e: KeyboardEvent) {
            if (e.key === "Escape") setOpen(false);
        }
        if (open) {
            document.addEventListener("mousedown", onDocClick);
            document.addEventListener("keydown", onEsc);
        }
        return () => {
            document.removeEventListener("mousedown", onDocClick);
            document.removeEventListener("keydown", onEsc);
        };
    }, [open]);

    return (
        <div ref={wrapRef} className="relative">
            <button
                type="button"
                onClick={() => setOpen((o) => !o)}
                aria-label={profileLabel}
                aria-haspopup="menu"
                aria-expanded={open}
                className="relative p-1.5 rounded-full transition-colors text-zinc-500 hover:bg-zinc-100 hover:text-zinc-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-red/50"
            >
                {avatarUrl ? (
                    /* eslint-disable-next-line @next/next/no-img-element */
                    <img
                        src={avatarUrl}
                        alt={fullName || "Profile"}
                        style={{ width: avatarSize, height: avatarSize }}
                        className="rounded-full object-cover ring-1 ring-zinc-200"
                    />
                ) : (
                    <User size={iconSize} />
                )}
            </button>

            <AnimatePresence>
                {open && (
                    <motion.div
                        initial={{ opacity: 0, y: -6, scale: 0.98 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: -6, scale: 0.98 }}
                        transition={{ duration: 0.14 }}
                        role="menu"
                        className="absolute right-0 mt-2 w-60 rounded-xl bg-white border border-zinc-100 shadow-lg ring-1 ring-black/5 overflow-hidden z-50"
                    >
                        <div className="px-4 py-3 flex items-center gap-3 border-b border-zinc-100">
                            {avatarUrl ? (
                                /* eslint-disable-next-line @next/next/no-img-element */
                                <img
                                    src={avatarUrl}
                                    alt={fullName || "Profile"}
                                    className="w-10 h-10 rounded-full object-cover ring-1 ring-zinc-200"
                                />
                            ) : (
                                <div className="w-10 h-10 rounded-full bg-zinc-100 flex items-center justify-center text-zinc-500">
                                    <User size={18} />
                                </div>
                            )}
                            <div className="min-w-0">
                                <p className="text-sm font-semibold text-zinc-900 truncate">
                                    {fullName || "Member"}
                                </p>
                                {email && (
                                    <p className="text-[11px] text-zinc-500 truncate">
                                        {email}
                                    </p>
                                )}
                            </div>
                        </div>

                        <div className="py-1.5">
                            <Link
                                href={profileHref}
                                onClick={() => setOpen(false)}
                                role="menuitem"
                                className="flex items-center gap-2.5 px-4 py-2 text-sm text-zinc-700 hover:bg-zinc-50 hover:text-zinc-900 transition-colors"
                            >
                                <UserCircle2 size={16} className="text-zinc-500" />
                                Profile
                            </Link>

                            <form action={signoutAction}>
                                <button
                                    type="submit"
                                    role="menuitem"
                                    className="w-full flex items-center gap-2.5 px-4 py-2 text-sm text-zinc-700 hover:bg-red-50 hover:text-red-600 transition-colors"
                                >
                                    <LogOut size={16} className="text-zinc-500 group-hover:text-red-600" />
                                    Sign Out
                                </button>
                            </form>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
