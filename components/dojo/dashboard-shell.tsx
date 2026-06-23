"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useTransition } from "react";
import { Eye, Home, LogOut, Menu, X } from "lucide-react";
import Logo from "@/assets/jka_logo.svg";
import { signoutAction } from "@/app/actions/auth";
import { setDojoPreviewRole } from "@/app/actions/dojo-preview";
import {
    DOJO_ROLES,
    ROLE_BADGE_COLOR,
    ROLE_LABEL,
    type DojoRole,
} from "@/lib/dojo-roles";
import {
    DOJO_NAV,
    GROUP_LABEL,
    type DojoNavItem,
} from "@/lib/dojo-nav";

type ShellSession = {
    userId: string;
    email: string;
    fullName: string;
    role: DojoRole;
    realRole: DojoRole;
    isPreviewing: boolean;
    pendingApproval: boolean;
    dojoName: string | null;
};

type Props = {
    children: React.ReactNode;
    session: ShellSession;
};

const ROLE_RANK: Record<DojoRole, number> = {
    DOJO_INSTRUCTOR: 1,
    DOJO_MANAGER: 2,
    DOJO_OWNER: 3,
};

export default function DojoDashboardShell({ children, session }: Props) {
    const pathname = usePathname();
    const [mobileOpen, setMobileOpen] = useState(false);

    const visibleItems = DOJO_NAV.filter(
        (item) => ROLE_RANK[session.role] >= ROLE_RANK[item.min]
    );

    const grouped = groupBy(visibleItems, (i) => i.group);

    return (
        <div className="min-h-screen bg-[#f8f8f8] flex">
            {/* Mobile sidebar overlay */}
            {mobileOpen && (
                <div
                    className="fixed inset-0 bg-black/30 z-40 md:hidden"
                    onClick={() => setMobileOpen(false)}
                />
            )}

            {/* Sidebar */}
            <aside
                className={`fixed md:sticky top-0 left-0 z-50 h-screen w-64 bg-white border-r border-zinc-200 flex flex-col transition-transform ${
                    mobileOpen
                        ? "translate-x-0"
                        : "-translate-x-full md:translate-x-0"
                }`}
            >
                <div className="px-6 py-5 border-b border-zinc-200 flex items-center justify-between">
                    <Link
                        href="/"
                        className="flex items-center gap-2.5 group"
                    >
                        <Image
                            src={Logo}
                            alt="JKA Bangladesh logo"
                            width={32}
                            height={32}
                        />
                        <div className="flex flex-col leading-tight">
                            <span className="font-karate text-[10px] tracking-[0.35em] text-zinc-800 group-hover:text-accent-red transition-colors">
                                JKA{" "}
                                <span className="text-accent-red">BD</span>
                            </span>
                            <span className="text-[9px] tracking-widest uppercase font-bold text-zinc-400">
                                Dojo console
                            </span>
                        </div>
                    </Link>
                    <button
                        type="button"
                        onClick={() => setMobileOpen(false)}
                        className="md:hidden text-zinc-500 hover:text-accent-red"
                    >
                        <X size={20} />
                    </button>
                </div>

                <nav className="flex-1 overflow-y-auto px-3 py-5 space-y-6">
                    {(Object.keys(grouped) as DojoNavItem["group"][]).map(
                        (group) => (
                            <div key={group}>
                                <p className="px-3 text-[10px] tracking-widest uppercase font-bold text-zinc-400 mb-2">
                                    {GROUP_LABEL[group]}
                                </p>
                                <ul className="space-y-1">
                                    {grouped[group].map((item) => {
                                        const Icon = item.icon;
                                        const active =
                                            pathname === item.href ||
                                            (item.href !== "/dojo/dashboard" &&
                                                pathname?.startsWith(
                                                    item.href
                                                ));
                                        return (
                                            <li key={item.href}>
                                                <Link
                                                    href={item.href}
                                                    onClick={() =>
                                                        setMobileOpen(false)
                                                    }
                                                    className={`flex items-center gap-3 px-3 py-2.5 rounded-md text-sm transition-colors ${
                                                        active
                                                            ? "bg-accent-red text-white font-semibold"
                                                            : "text-zinc-700 hover:bg-zinc-100"
                                                    }`}
                                                >
                                                    <Icon size={16} />
                                                    {item.label}
                                                </Link>
                                            </li>
                                        );
                                    })}
                                </ul>
                            </div>
                        )
                    )}
                </nav>

                <div className="px-3 py-4 border-t border-zinc-200 space-y-2">
                    <Link
                        href="/"
                        className="flex items-center gap-3 px-3 py-2 rounded-md text-sm text-zinc-600 hover:bg-zinc-100"
                    >
                        <Home size={16} />
                        Back to site
                    </Link>
                    <form action={signoutAction}>
                        <button
                            type="submit"
                            className="w-full flex items-center gap-3 px-3 py-2 rounded-md text-sm text-zinc-600 hover:bg-red-50 hover:text-red-600 transition-colors"
                        >
                            <LogOut size={16} />
                            Sign out
                        </button>
                    </form>
                </div>
            </aside>

            {/* Main column */}
            <div className="flex-1 flex flex-col min-w-0">
                <header className="sticky top-0 z-30 bg-white/80 backdrop-blur-xl border-b border-zinc-200">
                    <div className="px-4 sm:px-6 lg:px-10 h-16 flex items-center justify-between gap-4">
                        <button
                            type="button"
                            onClick={() => setMobileOpen(true)}
                            className="md:hidden text-zinc-500 hover:text-accent-red"
                        >
                            <Menu size={22} />
                        </button>
                        <div className="hidden sm:flex flex-col leading-tight">
                            <span className="text-xs tracking-widest uppercase font-bold text-zinc-400">
                                {session.dojoName ?? "Awaiting approval"}
                            </span>
                            <span className="text-sm font-semibold text-zinc-900">
                                {session.fullName}{" "}
                                <span className="text-zinc-400 font-normal">
                                    · {session.email}
                                </span>
                            </span>
                        </div>
                        <div className="flex items-center gap-3 ml-auto">
                            <RoleBadge
                                role={session.role}
                                preview={session.isPreviewing}
                            />
                            {session.realRole === "DOJO_OWNER" && (
                                <PreviewSwitcher
                                    activeRole={session.role}
                                    realRole={session.realRole}
                                />
                            )}
                        </div>
                    </div>
                </header>

                <main className="flex-1 px-4 sm:px-6 lg:px-10 py-8 max-w-7xl w-full mx-auto">
                    {session.pendingApproval && (
                        <div className="mb-6 rounded-sm border border-amber-200 bg-amber-50 text-amber-900 p-4 flex items-start gap-3">
                            <div className="w-9 h-9 rounded-full bg-amber-500 text-white flex items-center justify-center shrink-0 text-xs font-bold">
                                !
                            </div>
                            <div className="text-sm leading-relaxed">
                                <p className="font-semibold mb-0.5">
                                    Your enlistment is awaiting JKA review
                                </p>
                                <p>
                                    Federation staff are verifying your
                                    application. The dashboard is unlocked
                                    with sample data until your dojo is
                                    approved — usually within 1–2 working
                                    days.
                                </p>
                            </div>
                        </div>
                    )}
                    {children}
                </main>
            </div>
        </div>
    );
}

function RoleBadge({
    role,
    preview,
}: {
    role: DojoRole;
    preview: boolean;
}) {
    return (
        <span
            className={`inline-flex items-center gap-1.5 text-[10px] font-bold tracking-widest uppercase px-2.5 py-1 rounded-full border ${ROLE_BADGE_COLOR[role]}`}
        >
            {preview && <Eye size={10} />}
            {preview ? `Preview · ${ROLE_LABEL[role]}` : ROLE_LABEL[role]}
        </span>
    );
}

function PreviewSwitcher({
    activeRole,
    realRole,
}: {
    activeRole: DojoRole;
    realRole: DojoRole;
}) {
    const [open, setOpen] = useState(false);
    const [isPending, startTransition] = useTransition();

    function pick(role: DojoRole | "clear") {
        startTransition(async () => {
            await setDojoPreviewRole(role);
            setOpen(false);
        });
    }

    return (
        <div className="relative">
            <button
                type="button"
                onClick={() => setOpen((o) => !o)}
                className="text-[10px] font-bold tracking-widest uppercase px-2.5 py-1 rounded-full bg-zinc-100 text-zinc-600 hover:bg-zinc-200 transition-colors inline-flex items-center gap-1.5"
            >
                <Eye size={10} />
                Preview as
            </button>
            {open && (
                <div className="absolute right-0 mt-2 w-56 bg-white border border-zinc-200 rounded-md shadow-lg z-40 overflow-hidden">
                    <div className="px-3 py-2 border-b border-zinc-200 text-[10px] tracking-widest uppercase font-bold text-zinc-400">
                        Preview as
                    </div>
                    {DOJO_ROLES.slice()
                        .reverse()
                        .map((role) => (
                            <button
                                key={role}
                                type="button"
                                disabled={isPending}
                                onClick={() => pick(role)}
                                className={`w-full text-left px-3 py-2 text-sm hover:bg-zinc-50 transition-colors flex items-center justify-between ${
                                    role === activeRole
                                        ? "bg-zinc-50 font-semibold"
                                        : ""
                                }`}
                            >
                                <span>{ROLE_LABEL[role]}</span>
                                {role === realRole && (
                                    <span className="text-[9px] tracking-widest uppercase font-bold text-zinc-400">
                                        Yours
                                    </span>
                                )}
                            </button>
                        ))}
                    {activeRole !== realRole && (
                        <button
                            type="button"
                            onClick={() => pick("clear")}
                            disabled={isPending}
                            className="w-full text-left px-3 py-2 text-sm text-accent-red hover:bg-red-50 transition-colors border-t border-zinc-200"
                        >
                            Stop previewing
                        </button>
                    )}
                </div>
            )}
        </div>
    );
}

function groupBy<T, K extends string>(
    arr: T[],
    keyFn: (item: T) => K
): Record<K, T[]> {
    return arr.reduce(
        (acc, item) => {
            const k = keyFn(item);
            (acc[k] ||= []).push(item);
            return acc;
        },
        {} as Record<K, T[]>
    );
}
