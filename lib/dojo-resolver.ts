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
 * Resolve the dojo a member belongs to and their role inside it.
 *
 * With the unified role system this is a single row read: members.role
 * tells us the dojo-scoped role (INSTRUCTOR / DOJO_MANAGER / DOJO_OWNER)
 * and members.dojoId tells us which dojo.
 */
export async function getCurrentDojoForUser(
    userId: string
): Promise<DojoMembership | null> {
    const member = await prisma.member.findUnique({
        where: { id: userId },
        select: {
            role: true,
            dojo: { select: dojoSelect() },
        },
    });

    if (!member || !member.dojo) return null;
    if (!isDojoRole(member.role)) return null;

    return { dojo: member.dojo, role: member.role };
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
