"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { motion, AnimatePresence } from "motion/react";
import {
    LayoutDashboard,
    TrendingUp,
    Award,
    CalendarDays,
    FileText,
    Bell,
    ShoppingBag,
    User,
    RefreshCw,
    LogOut,
    Menu,
    X,
    ChevronRight,
    Users,
    Package,
    Building2,
    ShieldCheck,
    Swords,
    Megaphone,
} from "lucide-react";
import Logo from "@/assets/jka_logo.svg";
import { signoutAction } from "@/app/actions/auth";
import { createClient } from "@/lib/supabase/client";
import { playNotificationChime } from "@/lib/notification-sound";
import { DOJO_NAV, GROUP_LABEL, type DojoNavItem } from "@/lib/dojo-nav";
import { type DojoRole } from "@/lib/dojo-roles";

const DOJO_ROLE_RANK: Record<DojoRole, number> = {
    INSTRUCTOR: 1,
    DOJO_MANAGER: 2,
    DOJO_OWNER: 3,
};

const studentNavItems = [
    { label: "Dashboard",    href: "/portal",              icon: LayoutDashboard },
    { label: "My Progress",  href: "/portal/progress",     icon: TrendingUp },
    { label: "Gradings",     href: "/portal/grading",      icon: Award },
    { label: "Certificates", href: "/portal/certificates", icon: FileText },
    { label: "Events",       href: "/portal/events",       icon: CalendarDays },
    { label: "Notifications",href: "/portal/notifications",icon: Bell },
    { label: "Shop Orders",  href: "/portal/orders",       icon: ShoppingBag },
    { label: "Renew",        href: "/portal/renew",        icon: RefreshCw },
    { label: "My Profile",   href: "/portal/profile",      icon: User },
];

// Admins skip the personal-membership flows (progress, gradings,
// certificates, renewal, personal shop orders).
const adminPersonalNavItems = [
    { label: "Dashboard",    href: "/portal",              icon: LayoutDashboard },
    { label: "Events",       href: "/portal/events",       icon: CalendarDays },
    { label: "Notifications",href: "/portal/notifications",icon: Bell },
    { label: "My Profile",   href: "/portal/profile",      icon: User },
];

const adminNavItems = [
    { label: "Members",  href: "/portal/admin/members",  icon: Users },
    { label: "Announcements", href: "/portal/admin/announcements", icon: Megaphone },
    { label: "Events",   href: "/portal/admin/events",   icon: CalendarDays },
    { label: "Products", href: "/portal/admin/products", icon: Package },
    { label: "Orders",   href: "/portal/admin/orders",   icon: ShoppingBag },
    { label: "Dojos",    href: "/portal/admin/dojos",    icon: Building2 },
    { label: "Certificates", href: "/portal/admin/certificates", icon: Award },
];

// Dojo staff (Instructor / Manager / Dojo Head) share the personal sidebar;
// their dojo-specific pages are surfaced as a second nav section below.
const dojoPersonalNavItems = [
    { label: "Events",        href: "/portal/events",       icon: CalendarDays },
    { label: "Notifications", href: "/portal/notifications",icon: Bell },
    { label: "My Profile",    href: "/portal/profile",      icon: User },
];

interface PortalShellProps {
    userId: string;
    initialRole?: "STUDENT" | "INSTRUCTOR" | "DOJO_MANAGER" | "DOJO_OWNER" | "ADMIN";
    children: React.ReactNode;
}

export default function PortalShell({ userId, initialRole = "STUDENT", children }: PortalShellProps) {
    const pathname = usePathname();
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const [member, setMember] = useState<{ fullName: string; email: string; currentRank: string | null; role: string } | null>(
        // Seed with the server-known role so admin nav renders on first paint.
        { fullName: "", email: "", currentRank: null, role: initialRole }
    );
    const [unreadCount, setUnreadCount] = useState(0);

    useEffect(() => {
        const supabase = createClient();

        async function fetchMember() {
            const { data } = await supabase
                .from("members")
                .select("full_name, email, current_rank, role")
                .eq("id", userId)
                .single();

            if (data) {
                setMember({
                    fullName: data.full_name,
                    email: data.email,
                    currentRank: data.current_rank,
                    role: data.role,
                });
            }

            const { count } = await supabase
                .from("notifications")
                .select("*", { count: "exact", head: true })
                .eq("member_id", userId)
                .eq("is_read", false);

            setUnreadCount(count ?? 0);
        }

        fetchMember();

        // Realtime: bump badge + chime when a new notification arrives.
        // Requires the `notifications` table to be in the supabase_realtime
        // publication — toggle it under Database → Replication in Supabase.
        const channel = supabase
            .channel(`notif:${userId}`)
            .on(
                "postgres_changes",
                {
                    event: "INSERT",
                    schema: "public",
                    table: "notifications",
                    filter: `member_id=eq.${userId}`,
                },
                () => {
                    setUnreadCount((c) => c + 1);
                    playNotificationChime();
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [userId]);

    // Listen for the notifications page marking things read so the badge clears
    // without a full refetch. Dispatched by NotificationsClient.
    useEffect(() => {
        function onRead(e: Event) {
            const detail = (e as CustomEvent<{ delta?: number; all?: boolean }>).detail;
            if (detail?.all) setUnreadCount(0);
            else if (detail?.delta) setUnreadCount((c) => Math.max(0, c - detail.delta!));
        }
        window.addEventListener("jka:notifications-read", onRead);
        return () => window.removeEventListener("jka:notifications-read", onRead);
    }, []);

    const roleColors: Record<string, string> = {
        ADMIN: "from-amber-500 to-amber-600",
        DOJO_OWNER: "from-rose-500 to-red-600",
        DOJO_MANAGER: "from-blue-500 to-indigo-600",
        INSTRUCTOR: "from-blue-500 to-indigo-600",
        STUDENT: "from-emerald-500 to-green-600",
    };

    const roleColor = roleColors[member?.role ?? "STUDENT"] ?? roleColors.STUDENT;

    // Close sidebar on route change
    useEffect(() => {
        setSidebarOpen(false);
    }, [pathname]);

    const isAdmin = member?.role === "ADMIN";
    const isDojoStaff =
        member?.role === "INSTRUCTOR" ||
        member?.role === "DOJO_MANAGER" ||
        member?.role === "DOJO_OWNER";
    const navItems = isAdmin
        ? adminPersonalNavItems
        : isDojoStaff
            ? dojoPersonalNavItems
            : studentNavItems;
    const portalLabel = isAdmin
        ? "Admin Portal"
        : isDojoStaff
            ? "Dojo Console"
            : "Member Portal";

    const dojoNavItems: DojoNavItem[] = isDojoStaff
        ? DOJO_NAV.filter(
              (item) =>
                  DOJO_ROLE_RANK[member!.role as DojoRole] >=
                  DOJO_ROLE_RANK[item.min]
          )
        : [];
    const groupedDojo = dojoNavItems.reduce<Record<DojoNavItem["group"], DojoNavItem[]>>(
        (acc, item) => {
            (acc[item.group] ||= []).push(item);
            return acc;
        },
        {} as Record<DojoNavItem["group"], DojoNavItem[]>,
    );

    const SidebarContent = () => (
        <div className="flex flex-col h-full">
            {/* Logo */}
            <div className="px-6 py-5 border-b border-zinc-100 flex items-center gap-3">
                <Link href="/" className="flex items-center gap-2.5">
                    <Image src={Logo} alt="JKA Logo" width={36} height={36} />
                    <div>
                        <p className="font-karate text-xs tracking-[0.3em] text-zinc-900 leading-tight">
                            JKA <span className="text-accent-red">BD</span>
                        </p>
                        <p className="text-[9px] tracking-widest uppercase text-zinc-400 leading-tight">
                            {portalLabel}
                        </p>
                    </div>
                </Link>
            </div>

            {/* Member info */}
            {member && member.fullName && (
                <div className="px-4 py-4 mx-3 mt-4 rounded-xl bg-zinc-50 border border-zinc-100">
                    <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-full bg-gradient-to-br ${roleColor} flex items-center justify-center text-white font-bold text-sm flex-shrink-0`}>
                            {member.fullName.charAt(0)}
                        </div>
                        <div className="min-w-0">
                            <p className="text-sm font-semibold text-zinc-900 truncate">{member.fullName}</p>
                            <p className="text-[10px] text-zinc-500 truncate">{member.currentRank ?? "White Belt"}</p>
                        </div>
                    </div>
                </div>
            )}

            {/* Nav */}
            <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
                {navItems.map(({ label, href, icon: Icon }) => {
                    const isActive = href === "/portal"
                        ? pathname === "/portal"
                        : pathname === href || pathname.startsWith(href + "/");
                    const isNotif = href === "/portal/notifications";

                    return (
                        <Link
                            key={href}
                            href={href}
                            className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all group relative ${
                                isActive
                                    ? "bg-accent-red text-white shadow-sm"
                                    : "text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900"
                            }`}
                        >
                            <Icon size={17} className="flex-shrink-0" />
                            <span className="flex-1">{label}</span>
                            {isNotif && unreadCount > 0 && (
                                <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${isActive ? "bg-white/30 text-white" : "bg-accent-red text-white"}`}>
                                    {unreadCount > 9 ? "9+" : unreadCount}
                                </span>
                            )}
                            {isActive && <ChevronRight size={14} className="opacity-60" />}
                        </Link>
                    );
                })}

                {isAdmin && (
                    <div className="pt-5 mt-3 border-t border-zinc-100">
                        <div className="px-3 pb-2 flex items-center gap-1.5 text-[10px] font-bold tracking-widest uppercase text-zinc-400">
                            <ShieldCheck size={11} /> Administration
                        </div>
                        {adminNavItems.map(({ label, href, icon: Icon }) => {
                            const isActive = pathname === href || pathname.startsWith(href + "/");
                            return (
                                <Link
                                    key={href}
                                    href={href}
                                    className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all group relative ${
                                        isActive
                                            ? "bg-zinc-900 text-white shadow-sm"
                                            : "text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900"
                                    }`}
                                >
                                    <Icon size={17} className="flex-shrink-0" />
                                    <span className="flex-1">{label}</span>
                                    {isActive && <ChevronRight size={14} className="opacity-60" />}
                                </Link>
                            );
                        })}
                    </div>
                )}

                {isDojoStaff &&
                    (Object.keys(groupedDojo) as DojoNavItem["group"][]).map((group) => (
                        <div key={group} className="pt-5 mt-3 border-t border-zinc-100">
                            <div className="px-3 pb-2 flex items-center gap-1.5 text-[10px] font-bold tracking-widest uppercase text-zinc-400">
                                <Swords size={11} /> {GROUP_LABEL[group]}
                            </div>
                            {groupedDojo[group].map(({ label, href, icon: Icon }) => {
                                const isActive = href === "/portal"
                                    ? pathname === "/portal"
                                    : pathname === href || pathname.startsWith(href + "/");
                                return (
                                    <Link
                                        key={href}
                                        href={href}
                                        className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all group relative ${
                                            isActive
                                                ? "bg-zinc-900 text-white shadow-sm"
                                                : "text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900"
                                        }`}
                                    >
                                        <Icon size={17} className="flex-shrink-0" />
                                        <span className="flex-1">{label}</span>
                                        {isActive && <ChevronRight size={14} className="opacity-60" />}
                                    </Link>
                                );
                            })}
                        </div>
                    ))}
            </nav>

            {/* Sign out */}
            <div className="px-3 py-4 border-t border-zinc-100">
                <form action={signoutAction}>
                    <button
                        type="submit"
                        className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-zinc-500 hover:bg-red-50 hover:text-red-600 transition-all"
                    >
                        <LogOut size={17} />
                        Sign Out
                    </button>
                </form>
            </div>
        </div>
    );

    return (
        <div className="min-h-screen bg-[#fafafa] flex">
            {/* Desktop Sidebar */}
            <aside className="hidden lg:flex flex-col w-64 bg-white border-r border-zinc-100 fixed inset-y-0 left-0 z-30">
                <SidebarContent />
            </aside>

            {/* Mobile Sidebar Overlay */}
            <AnimatePresence>
                {sidebarOpen && (
                    <>
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="fixed inset-0 bg-black/40 z-40 lg:hidden"
                            onClick={() => setSidebarOpen(false)}
                        />
                        <motion.aside
                            initial={{ x: -280 }}
                            animate={{ x: 0 }}
                            exit={{ x: -280 }}
                            transition={{ type: "spring", damping: 30, stiffness: 300 }}
                            className="fixed inset-y-0 left-0 w-72 bg-white z-50 lg:hidden shadow-2xl"
                        >
                            <button
                                onClick={() => setSidebarOpen(false)}
                                className="absolute top-4 right-4 p-2 rounded-lg text-zinc-400 hover:bg-zinc-100"
                            >
                                <X size={18} />
                            </button>
                            <SidebarContent />
                        </motion.aside>
                    </>
                )}
            </AnimatePresence>

            {/* Main content area */}
            <div className="flex-1 lg:ml-64 flex flex-col min-h-screen">
                {/* Mobile topbar */}
                <header className="lg:hidden sticky top-0 z-20 bg-white/90 backdrop-blur-xl border-b border-zinc-100 px-4 h-14 flex items-center justify-between">
                    <button
                        onClick={() => setSidebarOpen(true)}
                        className="p-2 rounded-lg text-zinc-600 hover:bg-zinc-100 transition-colors"
                        aria-label="Open menu"
                    >
                        <Menu size={20} />
                    </button>

                    <Link href="/" className="flex items-center gap-2">
                        <Image src={Logo} alt="JKA Logo" width={28} height={28} />
                        <span className="font-karate text-xs tracking-[0.3em] text-zinc-900">
                            JKA <span className="text-accent-red">BD</span>
                        </span>
                    </Link>

                    <Link href="/portal/notifications" className="relative p-2 rounded-lg text-zinc-600 hover:bg-zinc-100 transition-colors">
                        <Bell size={20} />
                        {unreadCount > 0 && (
                            <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-accent-red rounded-full" />
                        )}
                    </Link>
                </header>

                {/* Desktop topbar */}
                <header className="hidden lg:flex sticky top-0 z-20 bg-white/90 backdrop-blur-xl border-b border-zinc-100 px-8 h-14 items-center justify-between">
                    <div className="flex items-center gap-2 text-sm text-zinc-500">
                        <Link href="/" className="hover:text-zinc-900 transition-colors">Home</Link>
                        <ChevronRight size={14} />
                        <span className="text-zinc-900 font-medium">
                            {[...studentNavItems, ...adminPersonalNavItems, ...adminNavItems, ...dojoPersonalNavItems, ...DOJO_NAV].find(n => n.href === pathname || (n.href !== "/portal" && pathname.startsWith(n.href)))?.label ?? "Portal"}
                        </span>
                    </div>

                    <div className="flex items-center gap-3">
                        {member && member.fullName && (
                            <span className={`bg-gradient-to-r ${roleColor} text-white text-[10px] font-bold tracking-widest uppercase px-3 py-1.5 rounded-full`}>
                                {member.role}
                            </span>
                        )}
                        <Link href="/portal/notifications" className="relative p-2 rounded-lg text-zinc-500 hover:bg-zinc-100 hover:text-zinc-900 transition-colors">
                            <Bell size={18} />
                            {unreadCount > 0 && (
                                <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-accent-red rounded-full" />
                            )}
                        </Link>
                    </div>
                </header>

                {/* Page content */}
                <main className="flex-1 px-4 sm:px-6 lg:px-8 py-6 lg:py-8">
                    <motion.div
                        initial={{ opacity: 0, y: 16 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.4 }}
                    >
                        {children}
                    </motion.div>
                </main>
            </div>
        </div>
    );
}
