import { prisma } from "@/lib/prisma";
import { isDojoRole, type DojoRole } from "@/lib/dojo-roles";

export type ResolvedDojo = {
    id: string;
    name: string;
    address: string | null;
    city: string | null;
    phone: string | null;
    email: string | null;
    latitude: number | null;
    longitude: number | null;
    isActive: boolean;
};

export type DojoMembership = {
    dojo: ResolvedDojo;
    role: DojoRole;
};

/**
 * Resolve the dojo a user belongs to and their role inside it.
 *
 * Reads users.role_id, then the matching role-table for dojo_id.
 */
export async function getCurrentDojoForUser(
    userId: string
): Promise<DojoMembership | null> {
    const u = await prisma.user.findUnique({
        where: { id: userId },
        select: { roleId: true },
    });
    if (!u || !isDojoRole(u.roleId)) return null;

    let dojoId: string | null = null;
    if (u.roleId === "INSTRUCTOR") {
        const row = await prisma.instructor.findUnique({ where: { id: userId }, select: { dojoId: true } });
        dojoId = row?.dojoId ?? null;
    } else if (u.roleId === "DOJO_MANAGER") {
        const row = await prisma.dojoManager.findUnique({ where: { id: userId }, select: { dojoId: true } });
        dojoId = row?.dojoId ?? null;
    } else if (u.roleId === "DOJO_OWNER") {
        const row = await prisma.dojoOwner.findUnique({ where: { id: userId }, select: { dojoId: true } });
        dojoId = row?.dojoId ?? null;
    }
    if (!dojoId) return null;

    const dojo = await prisma.dojo.findUnique({
        where: { id: dojoId },
        select: dojoSelect(),
    });
    if (!dojo) return null;

    return { dojo, role: u.roleId };
}

function dojoSelect() {
    return {
        id: true,
        name: true,
        address: true,
        city: true,
        phone: true,
        email: true,
        latitude: true,
        longitude: true,
        isActive: true,
    } as const;
}
