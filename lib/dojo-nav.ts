import type { LucideIcon } from "lucide-react";
import {
    Calendar,
    CreditCard,
    GraduationCap,
    LayoutDashboard,
    Megaphone,
    PartyPopper,
    QrCode,
    RefreshCw,
    Settings,
    ShoppingBag,
    Users,
} from "lucide-react";
import type { DojoRole } from "@/lib/dojo-roles";

export type DojoNavItem = {
    href: string;
    label: string;
    icon: LucideIcon;
    min: DojoRole;
    group: "operations" | "business" | "leadership";
};

export const DOJO_NAV: DojoNavItem[] = [
    {
        href: "/dojo/dashboard",
        label: "Overview",
        icon: LayoutDashboard,
        min: "INSTRUCTOR",
        group: "operations",
    },
    {
        href: "/dojo/dashboard/students",
        label: "Students",
        icon: Users,
        min: "INSTRUCTOR",
        group: "operations",
    },
    {
        href: "/dojo/dashboard/attendance",
        label: "Attendance",
        icon: QrCode,
        min: "INSTRUCTOR",
        group: "operations",
    },
    {
        href: "/dojo/dashboard/schedule",
        label: "Schedule",
        icon: Calendar,
        min: "INSTRUCTOR",
        group: "operations",
    },
    {
        href: "/dojo/dashboard/gradings",
        label: "Belt tests",
        icon: GraduationCap,
        min: "INSTRUCTOR",
        group: "operations",
    },
    {
        href: "/dojo/dashboard/shop",
        label: "Shop & dues",
        icon: ShoppingBag,
        min: "DOJO_MANAGER",
        group: "business",
    },
    {
        href: "/dojo/dashboard/payments",
        label: "Payments",
        icon: CreditCard,
        min: "DOJO_MANAGER",
        group: "business",
    },
    {
        href: "/dojo/dashboard/renewals",
        label: "Renewals",
        icon: RefreshCw,
        min: "DOJO_MANAGER",
        group: "business",
    },
    {
        href: "/dojo/dashboard/settings",
        label: "Dojo settings",
        icon: Settings,
        min: "DOJO_MANAGER",
        group: "business",
    },
    {
        href: "/dojo/dashboard/events",
        label: "Events",
        icon: PartyPopper,
        min: "DOJO_OWNER",
        group: "leadership",
    },
    {
        href: "/dojo/dashboard/announcements",
        label: "Announcements",
        icon: Megaphone,
        min: "DOJO_OWNER",
        group: "leadership",
    },
];

export const GROUP_LABEL: Record<DojoNavItem["group"], string> = {
    operations: "Operations",
    business: "Business",
    leadership: "Leadership",
};
