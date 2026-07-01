import { prisma } from "@/lib/prisma";
import type { RoleId } from "@/lib/auth/load-current-user";

type AssignRoleOptions = {
    /** Required for INSTRUCTOR / DOJO_MANAGER / DOJO_OWNER (and used to set Student.dojoId). */
    dojoId?: string | null;
    /** Pass-through bits for Student creation when promoting from another role to STUDENT. */
    studentDefaults?: Partial<{
        currentRank: string;
        onboardingComplete: boolean;
        membershipStatus: "PENDING" | "ACTIVE" | "EXPIRED" | "SUSPENDED";
    }>;
};

/**
 * Change a user's role atomically.
 *
 * - Removes their row from any role-specific table they currently occupy.
 * - Inserts (or updates dojo_id on) the matching role table for the new role.
 * - Updates users.role_id.
 *
 * Idempotent: assigning the same role twice with the same dojoId is a no-op.
 */
export async function assignRole(
    userId: string,
    newRole: RoleId,
    options: AssignRoleOptions = {},
): Promise<void> {
    const { dojoId = null, studentDefaults = {} } = options;

    await prisma.$transaction(async (tx) => {
        // 1. Delete from any role tables that aren't the new role.
        const otherRoles: RoleId[] = (["STUDENT", "INSTRUCTOR", "DOJO_MANAGER", "DOJO_OWNER", "ADMIN"] as const)
            .filter((r) => r !== newRole);

        for (const r of otherRoles) {
            switch (r) {
                case "STUDENT":      await tx.student.deleteMany({ where: { id: userId } }); break;
                case "INSTRUCTOR":   await tx.instructor.deleteMany({ where: { id: userId } }); break;
                case "DOJO_MANAGER": await tx.dojoManager.deleteMany({ where: { id: userId } }); break;
                case "DOJO_OWNER":   await tx.dojoOwner.deleteMany({ where: { id: userId } }); break;
                case "ADMIN":        await tx.admin.deleteMany({ where: { id: userId } }); break;
            }
        }

        // 2. Upsert into the new role's table.
        switch (newRole) {
            case "STUDENT":
                await tx.student.upsert({
                    where: { id: userId },
                    create: {
                        id: userId,
                        dojoId,
                        currentRank: studentDefaults.currentRank ?? "White Belt",
                        onboardingComplete: studentDefaults.onboardingComplete ?? false,
                        membershipStatus: studentDefaults.membershipStatus ?? "PENDING",
                    },
                    update: { dojoId },
                });
                break;
            case "INSTRUCTOR":
                await tx.instructor.upsert({
                    where: { id: userId },
                    create: { id: userId, dojoId },
                    update: { dojoId },
                });
                break;
            case "DOJO_MANAGER":
                await tx.dojoManager.upsert({
                    where: { id: userId },
                    create: { id: userId, dojoId },
                    update: { dojoId },
                });
                break;
            case "DOJO_OWNER":
                await tx.dojoOwner.upsert({
                    where: { id: userId },
                    create: { id: userId, dojoId },
                    update: { dojoId },
                });
                break;
            case "ADMIN":
                await tx.admin.upsert({
                    where: { id: userId },
                    create: { id: userId },
                    update: {},
                });
                break;
        }

        // 3. Update users.role_id.
        await tx.user.update({
            where: { id: userId },
            data: { roleId: newRole },
        });
    });
}
