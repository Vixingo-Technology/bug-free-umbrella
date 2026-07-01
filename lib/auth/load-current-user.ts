import { prisma } from "@/lib/prisma";

export type RoleId = "STUDENT" | "INSTRUCTOR" | "DOJO_MANAGER" | "DOJO_OWNER" | "ADMIN";

export type CurrentUser = {
    userId: string;
    role: RoleId;
    dojoId: string | null;          // set when role is INSTRUCTOR / DOJO_MANAGER / DOJO_OWNER / STUDENT (student's dojo)
    fullName: string;
    email: string;
    phone: string | null;
    avatarUrl: string | null;
};

/**
 * Load the authenticated user plus the dojo they're associated with (if any).
 * One query per call — pulls users.role_id, then a follow-up read of the
 * matching role-table to pick up dojo_id when the role is dojo-scoped.
 */
export async function loadCurrentUser(userId: string): Promise<CurrentUser | null> {
    const user = await prisma.user.findUnique({
        where: { id: userId },
        select: {
            id: true,
            roleId: true,
            fullName: true,
            email: true,
            phone: true,
            avatarUrl: true,
        },
    });
    if (!user) return null;

    const role = user.roleId as RoleId;
    let dojoId: string | null = null;

    if (role === "STUDENT") {
        const s = await prisma.student.findUnique({ where: { id: userId }, select: { dojoId: true } });
        dojoId = s?.dojoId ?? null;
    } else if (role === "INSTRUCTOR") {
        const i = await prisma.instructor.findUnique({ where: { id: userId }, select: { dojoId: true } });
        dojoId = i?.dojoId ?? null;
    } else if (role === "DOJO_MANAGER") {
        const m = await prisma.dojoManager.findUnique({ where: { id: userId }, select: { dojoId: true } });
        dojoId = m?.dojoId ?? null;
    } else if (role === "DOJO_OWNER") {
        const o = await prisma.dojoOwner.findUnique({ where: { id: userId }, select: { dojoId: true } });
        dojoId = o?.dojoId ?? null;
    }

    return {
        userId: user.id,
        role,
        dojoId,
        fullName: user.fullName,
        email: user.email,
        phone: user.phone,
        avatarUrl: user.avatarUrl,
    };
}
