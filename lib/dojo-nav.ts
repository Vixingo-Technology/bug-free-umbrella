import type { LucideIcon } from "lucide-react";
import {
    ArrowRightLeft,
    Award,
    GraduationCap,
    LayoutDashboard,
    Megaphone,
    RefreshCw,
    Settings,
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
        href: "/portal",
        label: "Overview",
        icon: LayoutDashboard,
        min: "INSTRUCTOR",
        group: "operations",
    },
    {
        href: "/portal/dojo/members",
        label: "Members",
        icon: Users,
        min: "INSTRUCTOR",
        group: "operations",
    },
    {
        href: "/portal/dojo/gradings",
        label: "Belt tests",
        icon: GraduationCap,
        min: "INSTRUCTOR",
        group: "operations",
    },
    {
        href: "/portal/dojo/certificates",
        label: "Certificates",
        icon: Award,
        min: "DOJO_MANAGER",
        group: "business",
    },
    {
        href: "/portal/dojo/renewals",
        label: "Renewals",
        icon: RefreshCw,
        min: "DOJO_MANAGER",
        group: "business",
    },
    {
        href: "/portal/dojo/settings",
        label: "Dojo settings",
        icon: Settings,
        min: "DOJO_MANAGER",
        group: "business",
    },
    {
        href: "/portal/dojo/announcements",
        label: "Announcements",
        icon: Megaphone,
        min: "DOJO_OWNER",
        group: "leadership",
    },
    {
        href: "/portal/dojo/transfers",
        label: "Transfer requests",
        icon: ArrowRightLeft,
        min: "DOJO_OWNER",
        group: "leadership",
    },
];

export const GROUP_LABEL: Record<DojoNavItem["group"], string> = {
    operations: "Operations",
    business: "Business",
    leadership: "Leadership",
};
