// Shared role constants and predicates. No server-only imports here —
// this module is imported by client components (e.g. dashboard shell).
import type { MemberRole } from "@/prisma/generated/client";

export const DOJO_ROLES = [
    "INSTRUCTOR",
    "DOJO_MANAGER",
    "DOJO_OWNER",
] as const satisfies readonly MemberRole[];

export type DojoRole = (typeof DOJO_ROLES)[number];

const ROLE_RANK: Record<DojoRole, number> = {
    INSTRUCTOR:   1,
    DOJO_MANAGER: 2,
    DOJO_OWNER:   3,
};

export const ROLE_LABEL: Record<DojoRole, string> = {
    INSTRUCTOR:   "Instructor",
    DOJO_MANAGER: "Manager",
    DOJO_OWNER:   "Dojo Head",
};

export const ROLE_BADGE_COLOR: Record<DojoRole, string> = {
    INSTRUCTOR:   "bg-emerald-100 text-emerald-700 border-emerald-200",
    DOJO_MANAGER: "bg-blue-100 text-blue-700 border-blue-200",
    DOJO_OWNER:   "bg-accent-red/10 text-accent-red border-accent-red/30",
};

export const PREVIEW_COOKIE = "jka_dojo_preview_role";

export function hasAtLeast(role: DojoRole, min: DojoRole): boolean {
    return ROLE_RANK[role] >= ROLE_RANK[min];
}

export function isDojoRole(value: unknown): value is DojoRole {
    return (
        typeof value === "string" &&
        (DOJO_ROLES as readonly string[]).includes(value)
    );
}
