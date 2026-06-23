import { prisma } from "@/lib/prisma";
import type { DojoRole } from "@/lib/dojo-roles";

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
    headInstructorId: string | null;
};

export type DojoMembership = {
    dojo: ResolvedDojo;
    role: DojoRole;
};

/**
 * Find the Dojo this Supabase user belongs to and their role inside it.
 *
 * Resolution order:
 *   1. Member is the head instructor of a Dojo → DOJO_OWNER
 *   2. Member is a registered Instructor with a dojoId → DOJO_INSTRUCTOR
 *   3. Otherwise null (no active membership; e.g. application still pending)
 */
export async function getCurrentDojoForUser(
    userId: string
): Promise<DojoMembership | null> {
    const member = await prisma.member.findUnique({
        where: { id: userId },
        select: {
            id: true,
            role: true,
            dojoHeadOf: {
                where: { isActive: true },
                select: dojoSelect(),
                take: 1,
            },
            instructor: {
                select: {
                    dojo: { select: dojoSelect() },
                },
            },
        },
    });

    if (!member) return null;

    if (member.dojoHeadOf.length > 0) {
        return { dojo: member.dojoHeadOf[0], role: "DOJO_OWNER" };
    }

    if (member.instructor?.dojo) {
        return { dojo: member.instructor.dojo, role: "DOJO_INSTRUCTOR" };
    }

    return null;
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
        headInstructorId: true,
    } as const;
}
