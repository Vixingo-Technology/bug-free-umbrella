import { prisma } from "@/lib/prisma";
import type { RoleId } from "@/lib/auth/load-current-user";

/**
 * Look up user ids for every member of one or more roles. Optionally
 * filter dojo-scoped roles by dojo.
 */
export async function findUserIdsByRoles(
    roles: RoleId[],
    options: { dojoId?: string | null } = {},
): Promise<string[]> {
    const { dojoId = null } = options;
    if (roles.length === 0) return [];

    const ids = new Set<string>();

    for (const role of roles) {
        switch (role) {
            case "ADMIN": {
                const rows = await prisma.user.findMany({
                    where: { roleId: "ADMIN", isActive: true },
                    select: { id: true },
                });
                rows.forEach((r) => ids.add(r.id));
                break;
            }
            case "STUDENT": {
                const rows = await prisma.student.findMany({
                    where: dojoId ? { dojoId } : undefined,
                    select: { id: true },
                });
                rows.forEach((r) => ids.add(r.id));
                break;
            }
            case "INSTRUCTOR": {
                const rows = await prisma.instructor.findMany({
                    where: dojoId ? { dojoId } : undefined,
                    select: { id: true },
                });
                rows.forEach((r) => ids.add(r.id));
                break;
            }
            case "DOJO_MANAGER": {
                const rows = await prisma.dojoManager.findMany({
                    where: dojoId ? { dojoId } : undefined,
                    select: { id: true },
                });
                rows.forEach((r) => ids.add(r.id));
                break;
            }
            case "DOJO_OWNER": {
                const rows = await prisma.dojoOwner.findMany({
                    where: dojoId ? { dojoId } : undefined,
                    select: { id: true },
                });
                rows.forEach((r) => ids.add(r.id));
                break;
            }
        }
    }

    return Array.from(ids);
}
