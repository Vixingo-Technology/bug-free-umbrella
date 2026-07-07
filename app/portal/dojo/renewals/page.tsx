import type { Metadata } from "next";
import { redirect } from "next/navigation";
import DojoPageHeader from "@/components/dojo/page-header";
import DojoMembershipCard from "@/components/dojo/settings/dojo-membership-card";
import { getDojoSession } from "@/lib/dojo-session";
import { hasAtLeast } from "@/lib/dojo-roles";
import { prisma } from "@/lib/prisma";
import { MEMBERSHIP_FEE_BDT } from "@/lib/constants";
import { extendExpiry } from "@/lib/renewals/extend-expiry";

export const metadata: Metadata = {
    title: "Renewals — Dojo Dashboard",
};

const fmtDate = new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
});

function computeRenewalAnchor(
    expiryDate: Date | null,
    createdAt: Date,
): Date {
    if (expiryDate) return expiryDate;
    const anchor = new Date(createdAt);
    anchor.setFullYear(anchor.getFullYear() + 1);
    return anchor;
}

type SearchParams = Promise<{
    status?: string;
    reason?: string;
    orderId?: string;
    expiry?: string;
    dev?: string;
}>;

export default async function RenewalsPage({
    searchParams,
}: {
    searchParams: SearchParams;
}) {
    const params = await searchParams;
    const session = await getDojoSession();

    // Unauthenticated visitors are only allowed here when they're returning
    // from an SSLCommerz post-payment redirect. Everyone else → /login.
    if (!session && !params.status) {
        redirect("/login?next=/portal/dojo/renewals");
    }
    if (session && !hasAtLeast(session.role, "DOJO_MANAGER")) {
        redirect("/portal?denied=1");
    }

    let dojoId: string | null = session?.dojo?.id ?? null;
    if (!dojoId && params.orderId) {
        // Anonymous post-payment return — look up the dojo via the order.
        const order = await prisma.shopOrder.findUnique({
            where: { id: params.orderId },
            select: { dojoId: true },
        });
        dojoId = order?.dojoId ?? null;
    }

    let dojo = dojoId
        ? await prisma.dojo.findUnique({
              where: { id: dojoId },
              select: {
                  id: true,
                  name: true,
                  annualFee: true,
                  expiryDate: true,
                  createdAt: true,
              },
          })
        : null;

    if (
        session &&
        params.dev === "1" &&
        params.orderId &&
        params.status === "success" &&
        dojo
    ) {
        try {
            const order = await prisma.shopOrder.findUnique({
                where: { id: params.orderId, userId: session.userId },
                select: {
                    paymentStatus: true,
                    includesDojoRenewal: true,
                    dojoId: true,
                },
            });
            if (
                order &&
                order.paymentStatus !== "PAID" &&
                order.includesDojoRenewal &&
                order.dojoId
            ) {
                const nextExpiry = extendExpiry(dojo.expiryDate);
                await prisma.$transaction([
                    prisma.shopOrder.update({
                        where: { id: params.orderId },
                        data: { paymentStatus: "PAID" },
                    }),
                    prisma.dojo.update({
                        where: { id: order.dojoId },
                        data: { expiryDate: nextExpiry, isActive: true },
                    }),
                    prisma.user.update({
                        where: { id: session.userId },
                        data: { isActive: true },
                    }),
                ]);
                dojo = { ...dojo, expiryDate: nextExpiry };
            }
        } catch {
            // silent
        }
    }

    const feedback =
        params.status === "success"
            ? {
                  kind: "success" as const,
                  expiry:
                      params.expiry ??
                      (dojo?.expiryDate
                          ? dojo.expiryDate.toISOString()
                          : null),
              }
            : params.status === "failed"
                ? {
                      kind: "failed" as const,
                      reason:
                          params.reason ||
                          "The payment gateway declined the transaction.",
                  }
                : null;

    if (!dojo) {
        return (
            <>
                <DojoPageHeader
                    eyebrow="Owner"
                    title="Dojo renewal"
                    description="Pay the annual federation fee to keep this dojo listed."
                />
                <div className="max-w-2xl">
                    <DojoMembershipCard
                        annualFeeBDT={MEMBERSHIP_FEE_BDT}
                        storedAnnualFee=""
                        expiryDate={null}
                        canEdit={false}
                        feedback={feedback}
                    />
                </div>
                <div className="bg-white border border-zinc-200 rounded-sm shadow-sm px-5 py-10 text-center text-sm text-zinc-500 mt-6">
                    Dojo renewal becomes available once your dojo is approved by
                    the federation.
                </div>
            </>
        );
    }

    const anchor = computeRenewalAnchor(dojo.expiryDate, dojo.createdAt);
    const registeredOn = fmtDate.format(dojo.createdAt);
    const populatedFeedback =
        feedback?.kind === "success" && !feedback.expiry
            ? { ...feedback, expiry: anchor.toISOString() }
            : feedback;

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
                    feedback={populatedFeedback}
                />
            </div>
        </>
    );
}
