"use client";

import { useState, useEffect, useTransition } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import { motion, AnimatePresence } from "motion/react";
import {
    LayoutDashboard,
    TrendingUp,
    Award,
    CalendarDays,
    FileText,
    Bell,
    ShoppingBag,
    RefreshCw,
    Menu,
    X,
    ChevronRight,
    Users,
    Package,
    Building2,
    ShieldCheck,
    Swords,
    Megaphone,
    Trophy,
    ArrowRightLeft,
    CreditCard,
    Lock,
    Receipt,
    UserPlus,
    Wrench,
} from "lucide-react";
import Logo from "@/assets/jka_logo.svg";
import { createClient } from "@/lib/supabase/client";
import { playNotificationChime } from "@/lib/notification-sound";
import { DOJO_NAV, GROUP_LABEL, type DojoNavItem } from "@/lib/dojo-nav";
import { type DojoRole } from "@/lib/dojo-roles";
import type { FeatureKey } from "@/lib/dojo/feature-locks";
import NotificationBell from "@/components/portal/notification-bell";
import ProfileMenu from "@/components/portal/profile-menu";

const DOJO_ROLE_RANK: Record<DojoRole, number> = {
    INSTRUCTOR: 1,
    DOJO_MANAGER: 2,
    DOJO_OWNER: 3,
};

// "My Profile" intentionally omitted — it lives in the top-right header
// next to the notification bell, and is always accessible (even while the
// student is still in the joining flow).
const studentNavItems = [
    { label: "Dashboard",    href: "/portal",              icon: LayoutDashboard },
    { label: "Events",       href: "/portal/events",       icon: CalendarDays },
    { label: "Notifications",href: "/portal/notifications",icon: Bell },
    { label: "My Progress",  href: "/portal/progress",     icon: TrendingUp },
    { label: "Achievements", href: "/portal/achievements", icon: Trophy },
    { label: "Gradings",     href: "/portal/grading",      icon: Award },
    { label: "Certificates", href: "/portal/certificates", icon: FileText },
    { label: "Shop Orders",  href: "/portal/orders",       icon: ShoppingBag },
    { label: "Renew",        href: "/portal/renew",        icon: RefreshCw },
    { label: "Request Service", href: "/portal/services",  icon: Wrench },
];

// While the student is still in the joining flow (joinStage !== JOINED),
// only these paths are reachable. Everything else in the sidebar renders
// as locked and clicks are swallowed.
const JOINING_UNLOCKED = new Set<string>([
    "/portal/joining",
    "/portal/notifications",
    "/portal/renew",
]);

// Admins skip the personal-membership flows (progress, gradings,
// certificates, renewal, personal shop orders).
const adminPersonalNavItems = [
    { label: "Dashboard",    href: "/portal",              icon: LayoutDashboard },
    { label: "Events",       href: "/portal/events",       icon: CalendarDays },
    { label: "Notifications",href: "/portal/notifications",icon: Bell },
];

const adminNavItems = [
    { label: "Members",  href: "/portal/admin/members",  icon: Users },
    { label: "Announcements", href: "/portal/admin/announcements", icon: Megaphone },
    { label: "Events",   href: "/portal/admin/events",   icon: CalendarDays },
    { label: "Products", href: "/portal/admin/products", icon: Package },
    { label: "Orders",   href: "/portal/admin/orders",   icon: ShoppingBag },
    { label: "Transactions", href: "/portal/admin/transactions", icon: Receipt },
    { label: "Dojos",    href: "/portal/admin/dojos",    icon: Building2 },
    { label: "Certificates", href: "/portal/admin/certificates", icon: Award },
    { label: "Transfers", href: "/portal/admin/transfers", icon: ArrowRightLeft },
    { label: "Services", href: "/portal/admin/services", icon: Wrench },
    { label: "Service Requests", href: "/portal/admin/service-requests", icon: Wrench },
    { label: "Subscriptions", href: "/portal/admin/subscriptions", icon: CreditCard },
];

// Dojo staff (Instructor / Manager / Dojo Head) share the personal sidebar;
// their dojo-specific pages are surfaced as a second nav section below.
const dojoPersonalNavItems = [
    { label: "Events",        href: "/portal/events",       icon: CalendarDays },
    { label: "Notifications", href: "/portal/notifications",icon: Bell },
];

export type DojoLockState = "UNPAID" | "AWAITING_APPROVAL" | null;

interface PortalShellProps {
    userId: string;
    initialRole?: "STUDENT" | "INSTRUCTOR" | "DOJO_MANAGER" | "DOJO_OWNER" | "ADMIN";
    /** Server-known joinStage for students. Prevents the sidebar lock
     *  from depending on a client-side Supabase query that may lag or
     *  fail silently under RLS. */
    initialJoinStage?: "FEE_UNPAID" | "AWAITING_APPROVAL" | "PAST_BELT_UNPAID" | "JOINED" | null;
    /** Dojo-console lock state.
     *  - "UNPAID" — enlistment fee unpaid; everything except Overview locked.
     *  - "AWAITING_APPROVAL" — fee paid, JKA approval pending; everything
     *    except Overview + Dojo Settings locked.
     *  - null — no lock. */
    initialDojoLock?: DojoLockState;
    /** For fully approved dojos, the union of milestone-locked and admin-
     *  locked feature keys. Ignored while initialDojoLock is set (that
     *  gate already covers everything). */
    initialLockedFeatures?: FeatureKey[];
    /** Server-known avatar URL, so the top-right header shows the user's
     *  photo on first paint without depending on the client-side Supabase
     *  query. */
    initialAvatarUrl?: string | null;
    /** Server-known display name, used by the profile dropdown so it shows
     *  the user's real name on first paint. */
    initialFullName?: string;
    /** Server-known email, shown under the name in the profile dropdown. */
    initialEmail?: string;
    /** Server-known dojo name for dojo-staff sidebar header. */
    initialDojoName?: string | null;
    /** Server-known dojo logo URL for dojo-staff sidebar header. */
    initialDojoLogoUrl?: string | null;
    /** Server-known current belt rank for students — so the sidebar
     *  card shows the real rank on first paint, without waiting on the
     *  client-side Supabase query. */
    initialCurrentRank?: string | null;
    children: React.ReactNode;
}

const DOJO_UNLOCKED_WHEN_AWAITING = new Set<string>([
    "/portal",
    "/portal/dojo/settings",
]);

// Map dojo-nav hrefs back to their feature key. Kept inline (rather than
// importing FEATURE_PATH) so the sidebar stays a client component.
const HREF_TO_FEATURE: Record<string, FeatureKey> = {
    "/portal/dojo/members":       "members",
    "/portal/dojo/join-requests": "join-requests",
    "/portal/dojo/gradings":      "gradings",
    "/portal/dojo/certificates":  "certificates",
    "/portal/dojo/announcements": "announcements",
    "/portal/dojo/transfers":     "transfers",
    "/portal/dojo/renewals":      "renewals",
    "/portal/dojo/settings":      "settings",
};

export default function PortalShell({
    userId,
    initialRole = "STUDENT",
    initialJoinStage = null,
    initialDojoLock = null,
    initialLockedFeatures = [],
    initialAvatarUrl = null,
    initialFullName = "",
    initialEmail = "",
    initialDojoName = null,
    initialDojoLogoUrl = null,
    initialCurrentRank = null,
    children,
}: PortalShellProps) {
    const featureLockSet = new Set<FeatureKey>(initialLockedFeatures);
    const pathname = usePathname();
    const router = useRouter();
    const [isPending, startTransition] = useTransition();
    const [pendingHref, setPendingHref] = useState<string | null>(null);
    const [sidebarOpen, setSidebarOpen] = useState(false);

    // Clear optimistic target once the URL catches up.
    useEffect(() => {
        if (pendingHref && pathname === pendingHref) {
            setPendingHref(null);
        }
    }, [pathname, pendingHref]);

    // Effective path used to decide which sidebar item shows as active. When
    // a nav item is clicked we flip this to the target href immediately so the
    // sidebar highlight (and content skeleton) update on the same paint —
    // before the server component for the new page has finished streaming.
    const activePath = pendingHref ?? pathname;

    function navigateTo(href: string) {
        if (href === pathname) return;
        setPendingHref(href);
        setSidebarOpen(false);
        startTransition(() => router.push(href));
    }

    function handleNavClick(href: string) {
        return (e: React.MouseEvent<HTMLAnchorElement>) => {
            // Let modifier clicks (new tab, etc.) behave normally.
            if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return;
            e.preventDefault();
            navigateTo(href);
        };
    }
    const [member, setMember] = useState<{
        fullName: string;
        email: string;
        avatarUrl: string | null;
        currentRank: string | null;
        role: string;
        joinStage: "FEE_UNPAID" | "AWAITING_APPROVAL" | "PAST_BELT_UNPAID" | "JOINED" | null;
    } | null>(
        // Seed with the server-known role + joinStage so admin nav renders
        // AND the student sidebar lock resolves correctly on first paint,
        // without depending on the client-side Supabase query completing.
        { fullName: initialFullName, email: initialEmail, avatarUrl: initialAvatarUrl, currentRank: initialCurrentRank, role: initialRole, joinStage: initialJoinStage }
    );
    const [dojoLogoUrl, setDojoLogoUrl] = useState<string | null>(initialDojoLogoUrl);
    const [dojoName, setDojoName] = useState<string | null>(initialDojoName);
    const [unreadCount, setUnreadCount] = useState(0);

    useEffect(() => {
        const supabase = createClient();

        async function fetchMember() {
            const { data } = await supabase
                .from("users")
                .select("full_name, email, avatar_url, role_id, students(current_rank, join_stage)")
                .eq("id", userId)
                .single<{
                    full_name: string;
                    email: string;
                    avatar_url: string | null;
                    role_id: string;
                    students: {
                        current_rank: string | null;
                        join_stage:
                            | "FEE_UNPAID"
                            | "AWAITING_APPROVAL"
                            | "PAST_BELT_UNPAID"
                            | "JOINED"
                            | null;
                    } | null;
                }>();

            if (data) {
                setMember((prev) => ({
                    fullName: data.full_name,
                    email: data.email,
                    avatarUrl: data.avatar_url ?? prev?.avatarUrl ?? null,
                    currentRank: data.students?.current_rank ?? prev?.currentRank ?? null,
                    role: data.role_id,
                    // Prefer the fresh browser value, but if postgrest didn't
                    // return a students row (RLS or missing join), keep the
                    // server-seeded stage rather than dropping it to null.
                    joinStage: data.students?.join_stage ?? prev?.joinStage ?? null,
                }));

                // For dojo staff, resolve their dojo's logo (if any) to render
                // in the top-right corner of the portal shell.
                const roleId = data.role_id;
                const staffTable =
                    roleId === "INSTRUCTOR"
                        ? "instructors"
                        : roleId === "DOJO_MANAGER"
                            ? "dojo_managers"
                            : roleId === "DOJO_OWNER"
                                ? "dojo_owners"
                                : null;

                if (staffTable) {
                    const { data: staffRow } = await supabase
                        .from(staffTable)
                        .select("dojos(name, logo_url)")
                        .eq("id", userId)
                        .single<{ dojos: { name: string | null; logo_url: string | null } | null }>();
                    setDojoLogoUrl(staffRow?.dojos?.logo_url ?? null);
                    setDojoName(staffRow?.dojos?.name ?? null);
                } else {
                    setDojoLogoUrl(null);
                    setDojoName(null);
                }
            }

            const { count } = await supabase
                .from("notifications")
                .select("*", { count: "exact", head: true })
                .eq("user_id", userId)
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
                    filter: `user_id=eq.${userId}`,
                },
                (payload) => {
                    setUnreadCount((c) => c + 1);
                    playNotificationChime();
                    // Let the bell dropdown refresh + pulse without re-reading
                    // its own subscription. payload.new is the inserted row.
                    window.dispatchEvent(
                        new CustomEvent("jka:notification-arrived", {
                            detail: { row: (payload as { new?: unknown }).new ?? null },
                        })
                    );
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
    const isStudent = !isAdmin && !isDojoStaff;
    // Admin + dojo staff get a compact users-table + password page.
    // Students keep the richer profile page (student-specific fields).
    const profileHref = isAdmin || isDojoStaff ? "/portal/account" : "/portal/profile";
    const isStudentLocked = isStudent && !!member?.joinStage && member.joinStage !== "JOINED";

    // While the student is still joining, prepend a Joining entry and
    // mark everything they can't visit yet with a `locked` flag so the
    // sidebar shows a padlock + swallows clicks.
    type NavItem = { label: string; href: string; icon: typeof LayoutDashboard; locked?: boolean };
    const studentNavRendered: NavItem[] = isStudentLocked
        ? [
              { label: "Joining", href: "/portal/joining", icon: UserPlus },
              ...studentNavItems.map((n) => ({
                  ...n,
                  locked: !JOINING_UNLOCKED.has(n.href),
              })),
          ]
        : studentNavItems;

    const navItems: NavItem[] = isAdmin
        ? adminPersonalNavItems
        : isDojoStaff
            ? dojoPersonalNavItems
            : studentNavRendered;
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
                <Link href="/portal" className="flex items-center gap-2.5 min-w-0">
                    {isDojoStaff ? (
                        <Image
                            src={dojoLogoUrl || Logo}
                            alt={dojoName ? `${dojoName} logo` : "Dojo Logo"}
                            width={36}
                            height={36}
                            unoptimized={!!dojoLogoUrl}
                            className="rounded-full object-cover w-9 h-9 flex-shrink-0"
                        />
                    ) : (
                        <Image src={Logo} alt="JKA Logo" width={36} height={36} />
                    )}
                    <div className="min-w-0">
                        {isDojoStaff ? (
                            <>
                                <p className="text-sm font-semibold text-zinc-900 leading-tight truncate">
                                    {dojoName ?? "Dojo"}
                                </p>
                                <p className="text-[9px] tracking-widest uppercase text-zinc-400 leading-tight mt-0.5">
                                    {portalLabel}
                                </p>
                            </>
                        ) : (
                            <>
                                <p className="font-karate text-xs tracking-[0.3em] text-zinc-900 leading-tight">
                                    JKA <span className="text-accent-red">BD</span>
                                </p>
                                <p className="text-[9px] tracking-widest uppercase text-zinc-400 leading-tight">
                                    {portalLabel}
                                </p>
                            </>
                        )}
                    </div>
                </Link>
            </div>

            {/* Member info — Member Portal (students) only */}
            {isStudent && member && member.fullName && (
                <div className="px-4 py-4 mx-3 mt-4 rounded-xl bg-zinc-50 border border-zinc-100">
                    <div className="flex items-center gap-3">
                        {member.avatarUrl ? (
                            /* eslint-disable-next-line @next/next/no-img-element */
                            <img
                                src={member.avatarUrl}
                                alt={member.fullName}
                                className="w-10 h-10 rounded-full object-cover ring-1 ring-zinc-200 flex-shrink-0"
                            />
                        ) : (
                            <div className={`w-10 h-10 rounded-full bg-gradient-to-br ${roleColor} flex items-center justify-center text-white font-bold text-sm flex-shrink-0`}>
                                {member.fullName.charAt(0)}
                            </div>
                        )}
                        <div className="min-w-0">
                            <p className="text-sm font-semibold text-zinc-900 truncate">{member.fullName}</p>
                            <p className="text-[10px] text-zinc-500 truncate">{member.currentRank ?? "White Belt"}</p>
                        </div>
                    </div>
                </div>
            )}

            {/* Nav */}
            <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
                {navItems.map(({ label, href, icon: Icon, locked }) => {
                    const isActive = href === "/portal"
                        ? activePath === "/portal"
                        : activePath === href || activePath.startsWith(href + "/");
                    const isNotif = href === "/portal/notifications";

                    if (locked) {
                        return (
                            <div
                                key={href}
                                aria-disabled="true"
                                title="Unlocks once your dojo accepts your join request."
                                className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-zinc-400 cursor-not-allowed select-none"
                            >
                                <Icon size={17} className="flex-shrink-0 opacity-60" />
                                <span className="flex-1">{label}</span>
                                <Lock size={13} className="opacity-60" />
                            </div>
                        );
                    }

                    return (
                        <Link
                            key={href}
                            href={href}
                            onClick={handleNavClick(href)}
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
                            const isActive = activePath === href || activePath.startsWith(href + "/");
                            return (
                                <Link
                                    key={href}
                                    href={href}
                                    onClick={handleNavClick(href)}
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
                                    ? activePath === "/portal"
                                    : activePath === href || activePath.startsWith(href + "/");
                                const featureKey = HREF_TO_FEATURE[href];
                                const featureLocked =
                                    !initialDojoLock &&
                                    !!featureKey &&
                                    featureLockSet.has(featureKey);
                                const isLocked =
                                    initialDojoLock === "UNPAID"
                                        ? href !== "/portal"
                                        : initialDojoLock === "AWAITING_APPROVAL"
                                            ? !DOJO_UNLOCKED_WHEN_AWAITING.has(href)
                                            : featureLocked;
                                if (isLocked) {
                                    const tip =
                                        initialDojoLock === "AWAITING_APPROVAL"
                                            ? "Unlocks once JKA approves your dojo"
                                            : initialDojoLock === "UNPAID"
                                                ? "Pay the enlistment fee to unlock"
                                                : "Locked — reach 30 active students or ask JKA admin to unlock";
                                    return (
                                        <div
                                            key={href}
                                            aria-disabled="true"
                                            title={tip}
                                            className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-zinc-400 cursor-not-allowed select-none"
                                        >
                                            <Icon size={17} className="flex-shrink-0 opacity-60" />
                                            <span className="flex-1 opacity-70">{label}</span>
                                            <Lock size={13} className="opacity-60" />
                                        </div>
                                    );
                                }
                                return (
                                    <Link
                                        key={href}
                                        href={href}
                                        onClick={handleNavClick(href)}
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

                    <Link href="/portal" className="flex items-center gap-2">
                        <Image src={Logo} alt="JKA Logo" width={28} height={28} />
                        <span className="font-karate text-xs tracking-[0.3em] text-zinc-900">
                            JKA <span className="text-accent-red">BD</span>
                        </span>
                    </Link>

                    <div className="flex items-center">
                        <NotificationBell
                            userId={userId}
                            unreadCount={unreadCount}
                            onUnreadChange={setUnreadCount}
                            align="right"
                            iconSize={20}
                        />
                        <ProfileMenu
                            profileHref={profileHref}
                            profileLabel={isAdmin || isDojoStaff ? "My account" : "My profile"}
                            avatarUrl={member?.avatarUrl ?? null}
                            fullName={member?.fullName ?? ""}
                            email={member?.email ?? ""}
                            avatarSize={28}
                            iconSize={20}
                        />
                    </div>
                </header>

                {/* Desktop topbar */}
                <header className="hidden lg:flex sticky top-0 z-20 bg-white/90 backdrop-blur-xl border-b border-zinc-100 px-8 h-14 items-center justify-between">
                    <div className="flex items-center gap-2 text-sm text-zinc-500">
                        <Link href="/" className="hover:text-zinc-900 transition-colors">Home</Link>
                        <ChevronRight size={14} />
                        <span className="text-zinc-900 font-medium">
                            {[
                                ...studentNavItems,
                                { label: "Joining", href: "/portal/joining" },
                                ...adminPersonalNavItems,
                                ...adminNavItems,
                                ...dojoPersonalNavItems,
                                ...DOJO_NAV,
                            ].find(n => n.href === activePath || (n.href !== "/portal" && activePath.startsWith(n.href)))?.label ?? "Portal"}
                        </span>
                    </div>

                    <div className="flex items-center gap-3">
                        {member && member.fullName && (
                            <span className={`bg-gradient-to-r ${roleColor} text-white text-[10px] font-bold tracking-widest uppercase px-3 py-1.5 rounded-full`}>
                                {member.role}
                            </span>
                        )}
                        <NotificationBell
                            userId={userId}
                            unreadCount={unreadCount}
                            onUnreadChange={setUnreadCount}
                            align="right"
                            iconSize={18}
                        />
                        <ProfileMenu
                            profileHref={profileHref}
                            profileLabel={isAdmin || isDojoStaff ? "My account" : "My profile"}
                            avatarUrl={member?.avatarUrl ?? null}
                            fullName={member?.fullName ?? ""}
                            email={member?.email ?? ""}
                            avatarSize={28}
                            iconSize={18}
                        />
                    </div>
                </header>

                {/* Page content */}
                <main className="flex-1 px-4 sm:px-6 lg:px-8 py-6 lg:py-8">
                    {isPending && pendingHref ? (
                        <PortalPageSkeleton />
                    ) : (
                        <motion.div
                            key={pathname}
                            initial={{ opacity: 0, y: 16 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.4 }}
                        >
                            {children}
                        </motion.div>
                    )}
                </main>
            </div>
        </div>
    );
}

function PortalPageSkeleton() {
    return (
        <div className="animate-pulse space-y-6">
            <div className="h-8 w-56 rounded-lg bg-zinc-200/70" />
            <div className="h-4 w-80 max-w-full rounded bg-zinc-200/60" />
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {Array.from({ length: 6 }).map((_, i) => (
                    <div
                        key={i}
                        className="h-32 rounded-2xl border border-zinc-100 bg-white shadow-sm"
                    >
                        <div className="h-full w-full rounded-2xl bg-gradient-to-br from-zinc-100 to-zinc-50" />
                    </div>
                ))}
            </div>
            <div className="h-64 rounded-2xl border border-zinc-100 bg-white shadow-sm">
                <div className="h-full w-full rounded-2xl bg-gradient-to-br from-zinc-100 to-zinc-50" />
            </div>
        </div>
    );
}
