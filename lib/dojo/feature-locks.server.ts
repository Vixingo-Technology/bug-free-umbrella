// Server-only resolver for dojo feature locks. Kept separate from
// feature-locks.ts so client components can import the constants without
// pulling `pg` into the browser bundle.
import "server-only";

import { prisma } from "@/lib/prisma";
import {
    MILESTONE_LOCKED,
    isFeatureKey,
    type DojoFeatureLocks,
    type FeatureKey,
} from "@/lib/dojo/feature-locks";

/**
 * Resolve the effective feature-lock set for a dojo.
 *
 * Milestone = # active students (user.isActive = true) at the dojo.
 * Anything below the milestone locks the MILESTONE_LOCKED features on
 * top of whatever the admin already locked via Dojo.lockedFeatures.
 */
export async function resolveDojoFeatureLocks(
    dojoId: string
): Promise<DojoFeatureLocks> {
    const [dojo, studentCount] = await Promise.all([
        prisma.dojo.findUnique({
            where: { id: dojoId },
            select: { lockedFeatures: true, studentMilestone: true },
        }),
        prisma.student.count({
            where: { dojoId, user: { isActive: true } },
        }),
    ]);

    const adminLocked = new Set<FeatureKey>(
        (dojo?.lockedFeatures ?? []).filter(isFeatureKey),
    );

    const milestone = dojo?.studentMilestone ?? 0;

    const milestoneLocked = new Set<FeatureKey>(
        studentCount < milestone ? MILESTONE_LOCKED : [],
    );

    const locked = new Set<FeatureKey>([...adminLocked, ...milestoneLocked]);

    return {
        locked,
        milestoneLocked,
        adminLocked,
        studentCount,
        milestone,
    };
}
