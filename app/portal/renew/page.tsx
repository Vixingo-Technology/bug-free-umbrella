import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import RenewClient from "@/components/portal/renew-client";
import { getFees } from "@/lib/settings/fees";
import { extendExpiry } from "@/lib/renewals/extend-expiry";

export const metadata = { title: "Renew Membership — JKA Bangladesh" };

type SearchParams = Promise<{
    status?: string;
    reason?: string;
    orderId?: string;
    expiry?: string;
    dev?: string;
}>;

export default async function RenewPage({
    searchParams,
}: {
    searchParams: SearchParams;
}) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    const params = await searchParams;

    // Unauthenticated visitors are only allowed here when they're returning
    // from an SSLCommerz post-payment redirect (the middleware lets those
    // through so the popup can render). Everyone else gets bounced to login.
    if (!user && !params.status) redirect("/login");

    // Dev bypass — mark the linked order paid + extend expiry, mirroring the
    // SSLCommerz success webhook. Only runs when we still have a session (the
    // real webhook does the same work without needing one).
    if (
        user &&
        params.dev === "1" &&
        params.orderId &&
        params.status === "success"
    ) {
        try {
            const order = await prisma.shopOrder.findUnique({
                where: { id: params.orderId, userId: user.id },
                select: { paymentStatus: true, includesMembership: true },
            });
            if (order && order.paymentStatus !== "PAID" && order.includesMembership) {
                const existing = await prisma.student.findUnique({
                    where: { id: user.id },
                    select: { expiryDate: true },
                });
                const nextExpiry = extendExpiry(existing?.expiryDate ?? null);
                await prisma.$transaction([
                    prisma.shopOrder.update({
                        where: { id: params.orderId },
                        data: { paymentStatus: "PAID" },
                    }),
                    prisma.student.update({
                        where: { id: user.id },
                        data: {
                            membershipStatus: "ACTIVE",
                            onboardingComplete: true,
                            expiryDate: nextExpiry,
                        },
                    }),
                ]);
            }
        } catch {
            // silent — banner still renders with existing data
        }
    }

    let member: any = null;

    try {
        if (user) {
            const student = await prisma.student.findUnique({
                where: { id: user.id },
                include: { dojo: true, user: true },
            });
            if (student) {
                member = {
                    ...student,
                    fullName: student.user.fullName,
                    email: student.user.email,
                    phone: student.user.phone,
                    avatarUrl: student.user.avatarUrl,
                    role: student.user.roleId,
                };
            }
        } else if (params.orderId) {
            // Anonymous return-from-SSLCommerz: fetch the member linked to
            // the order so the popup can quote the new expiry date.
            const order = await prisma.shopOrder.findUnique({
                where: { id: params.orderId },
                select: { userId: true },
            });
            if (order?.userId) {
                const student = await prisma.student.findUnique({
                    where: { id: order.userId },
                    include: { dojo: true, user: true },
                });
                if (student) {
                    member = {
                        ...student,
                        fullName: student.user.fullName,
                        email: student.user.email,
                        phone: student.user.phone,
                        avatarUrl: student.user.avatarUrl,
                        role: student.user.roleId,
                    };
                }
            }
        }
    } catch {
        // DB not configured
    }

    const feedback =
        params.status === "success"
            ? {
                  kind: "success" as const,
                  expiry:
                      params.expiry ??
                      (member?.expiryDate
                          ? new Date(member.expiryDate).toISOString()
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

    const { membershipFeeBDT } = await getFees();

    return (
        <RenewClient
            member={member}
            membershipFeeBDT={membershipFeeBDT}
            userId={user?.id ?? ""}
            feedback={feedback}
        />
    );
}
