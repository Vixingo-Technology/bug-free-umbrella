import type { Metadata } from "next";
import DojoPageHeader from "@/components/dojo/page-header";
import DojoMembershipCard from "@/components/dojo/settings/dojo-membership-card";
import { requireDojoRole } from "@/lib/dojo-session";
import { prisma } from "@/lib/prisma";
import { MEMBERSHIP_FEE_BDT } from "@/lib/constants";

export const metadata: Metadata = {
    title: "Renewals — Dojo Dashboard",
};

const fmtDate = new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
});

/**
 * The first annual fee falls due one year after the dojo was registered
 * (i.e. the day the one-time enlistment fee was paid and the dojo row
 * was created). Once a renewal has been paid, `dojo.expiryDate` becomes
 * the source of truth and we use that instead.
 */
function computeRenewalAnchor(
    expiryDate: Date | null,
    createdAt: Date,
): Date {
    if (expiryDate) return expiryDate;
    const anchor = new Date(createdAt);
    anchor.setFullYear(anchor.getFullYear() + 1);
    return anchor;
}

export default async function RenewalsPage() {
    const session = await requireDojoRole("DOJO_MANAGER");

    const dojo = session.dojo
        ? await prisma.dojo.findUnique({
              where: { id: session.dojo.id },
              select: {
                  id: true,
                  name: true,
                  annualFee: true,
                  expiryDate: true,
                  createdAt: true,
              },
          })
        : null;

    if (!dojo) {
        return (
            <>
                <DojoPageHeader
                    eyebrow="Owner"
                    title="Dojo renewal"
                    description="Pay the annual federation fee to keep this dojo listed."
                />
                <div className="bg-white border border-zinc-200 rounded-sm shadow-sm px-5 py-10 text-center text-sm text-zinc-500">
                    Dojo renewal becomes available once your dojo is approved by
                    the federation.
                </div>
            </>
        );
    }

    const anchor = computeRenewalAnchor(dojo.expiryDate, dojo.createdAt);
    const registeredOn = fmtDate.format(dojo.createdAt);

    return (
        <>
            <DojoPageHeader
                eyebrow="Owner"
                title="Dojo renewal"
                description={`Annual federation fee for ${dojo.name}. Counts down from the day this dojo was registered (${registeredOn}).`}
            />

            <div className="max-w-2xl">
                <DojoMembershipCard
                    annualFeeBDT={MEMBERSHIP_FEE_BDT}
                    storedAnnualFee={
                        dojo.annualFee != null ? dojo.annualFee.toString() : ""
                    }
                    expiryDate={anchor.toISOString()}
                    canEdit={false}
                />
            </div>
        </>
    );
}
