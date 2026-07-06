import { prisma } from "@/lib/prisma";
import { isProfileComplete } from "@/lib/profile";

/**
 * Resolve where a freshly-authenticated user should land.
 *
 * Callers (set-password, invite completion) redirect here directly instead
 * of bouncing through `/portal` and letting the portal layout re-decide —
 * that double-hop occasionally lands the router on a stale RSC tree, leaving
 * the onboarding screen blank until a manual reload.
 */
export async function resolvePostAuthLanding(userId: string): Promise<string> {
    try {
        const user = await prisma.user.findUnique({
            where: { id: userId },
            select: {
                roleId: true,
                phone: true,
                student: { select: { onboardingComplete: true, dojoId: true } },
            },
        });

        if (!user) return "/portal";

        if (user.roleId === "STUDENT") {
            const student = user.student;
            const needsOnboarding =
                !student ||
                !student.onboardingComplete ||
                !isProfileComplete({
                    phone: user.phone,
                    dojoId: student.dojoId,
                });
            if (needsOnboarding) return "/portal/onboarding";
        }

        return "/portal";
    } catch {
        return "/portal";
    }
}
