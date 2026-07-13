import { prisma } from "@/lib/prisma";
import {
    DOJO_ENLISTMENT_FEE_BDT,
    DOJO_RENEWAL_FEE_BDT,
    MEMBERSHIP_FEE_BDT,
} from "@/lib/constants";

export type Fees = {
    dojoEnlistmentFeeBDT: number;
    dojoRenewalFeeBDT: number;
    membershipFeeBDT: number;
};

/**
 * Load the current subscription fees. Any NULL column in
 * `system_settings` falls back to the built-in default from
 * `lib/constants` — so the app keeps working before an admin has
 * ever visited the subscriptions page.
 *
 * The singleton row is upserted so the admin form always has a
 * target to write to.
 */
export async function getFees(): Promise<Fees> {
    const row = await prisma.systemSettings.upsert({
        where: { id: "default" },
        update: {},
        create: { id: "default" },
        select: {
            dojoEnlistmentFeeBDT: true,
            dojoRenewalFeeBDT: true,
            membershipFeeBDT: true,
        },
    });

    return {
        dojoEnlistmentFeeBDT:
            row.dojoEnlistmentFeeBDT != null
                ? Number(row.dojoEnlistmentFeeBDT)
                : DOJO_ENLISTMENT_FEE_BDT,
        dojoRenewalFeeBDT:
            row.dojoRenewalFeeBDT != null
                ? Number(row.dojoRenewalFeeBDT)
                : DOJO_RENEWAL_FEE_BDT,
        membershipFeeBDT:
            row.membershipFeeBDT != null
                ? Number(row.membershipFeeBDT)
                : MEMBERSHIP_FEE_BDT,
    };
}
