import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { serialize } from "@/lib/serialize";
import { getFees } from "@/lib/settings/fees";
import { extendExpiry } from "@/lib/renewals/extend-expiry";
import JoiningClient from "@/components/portal/joining-client";

export const metadata = { title: "Joining — JKA Bangladesh" };

type SearchParams = Promise<{
    status?: string;
    orderId?: string;
    reason?: string;
    dev?: string;
}>;

/**
 * Dev bypass — mirrors the SSLCommerz success webhook for the two joining
 * payments so the flow advances without a live gateway. Only runs with a
 * session; the real webhook uses the service role and needs none.
 */
async function applyDevBypass(userId: string, orderId: string) {
    const order = await prisma.shopOrder.findUnique({
        where: { id: orderId, userId },
        select: {
            paymentStatus: true,
            includesMembership: true,
            includesPastBeltFee: true,
        },
    });
    if (!order || order.paymentStatus === "PAID") return;

    const student = await prisma.student.findUnique({
        where: { id: userId },
        select: { expiryDate: true, joinStage: true, assignedRank: true },
    });
    if (!student) return;

    const writes: any[] = [
        prisma.shopOrder.update({
            where: { id: orderId },
            data: { paymentStatus: "PAID" },
        }),
    ];

    if (order.includesMembership) {
        writes.push(
            prisma.student.update({
                where: { id: userId },
                data: {
                    membershipStatus: "ACTIVE",
                    onboardingComplete: true,
                    expiryDate: extendExpiry(student.expiryDate ?? null),
                    ...(student.joinStage === "FEE_UNPAID"
                        ? { joinStage: "AWAITING_APPROVAL" as const }
                        : {}),
                },
            }),
        );
    }

    if (order.includesPastBeltFee && student.joinStage === "PAST_BELT_UNPAID") {
        writes.push(
            prisma.student.update({
                where: { id: userId },
                data: {
                    joinStage: "JOINED",
                    joinedAt: new Date(),
                    currentRank: student.assignedRank ?? undefined,
                },
            }),
        );
    }

    await prisma.$transaction(writes);
}

export default async function JoiningPage({
    searchParams,
}: {
    searchParams: SearchParams;
}) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    const params = await searchParams;

    // Unauthenticated visitors are only allowed here when they're returning
    // from a post-payment redirect (the middleware lets those through so the
    // popup can render). Everyone else gets bounced to login.
    if (!user && !params.status) redirect("/login");

    if (user && params.dev === "1" && params.orderId && params.status === "success") {
        try {
            await applyDevBypass(user.id, params.orderId);
        } catch {
            // silent — the popup still renders with existing data
        }
    }

    const { membershipFeeBDT } = await getFees();

    const postPaymentStatus =
        params.status === "success"
            ? ("success" as const)
            : params.status === "failed"
                ? ("failed" as const)
                : null;

    // Resolve whose joining flow this is: the session user, or — when the
    // cross-site redirect dropped the auth cookie — the buyer on the order.
    let ownerId = user?.id ?? null;
    if (!ownerId && params.orderId) {
        const order = await prisma.shopOrder.findUnique({
            where: { id: params.orderId },
            select: { userId: true },
        });
        ownerId = order?.userId ?? null;
    }

    if (!ownerId) {
        return (
            <JoiningClient
                member={null}
                membershipFeeBDT={membershipFeeBDT}
                postPaymentStatus={postPaymentStatus}
                postPaymentReason={params.reason ?? null}
            />
        );
    }

    const u = await prisma.user.findUnique({
        where: { id: ownerId },
        include: {
            student: { include: { dojo: true } },
        },
    });

    // Non-students shouldn't be here.
    if (!u || u.roleId !== "STUDENT" || !u.student) {
        if (!user) {
            return (
                <JoiningClient
                    member={null}
                    membershipFeeBDT={membershipFeeBDT}
                    postPaymentStatus={postPaymentStatus}
                    postPaymentReason={params.reason ?? null}
                />
            );
        }
        redirect("/portal");
    }

    // Already fully joined — bounce to the dashboard.
    // Exception: keep them here to show the "you've joined" popup if they
    // just returned from the past-belt payment success.
    if (user && u.student.joinStage === "JOINED" && params.status !== "success") {
        redirect("/portal");
    }

    return (
        <JoiningClient
            member={serialize({
                fullName: u.fullName,
                email: u.email,
                phone: u.phone,
                memberNumber: u.memberNumber,
                joinStage: u.student.joinStage,
                requestedRank: u.student.requestedRank,
                assignedRank: u.student.assignedRank,
                pastBeltFeeBDT: u.student.pastBeltFeeBDT,
                dojo: u.student.dojo
                    ? {
                          id: u.student.dojo.id,
                          name: u.student.dojo.name,
                          city: u.student.dojo.city,
                          address: u.student.dojo.address,
                          latitude: u.student.dojo.latitude,
                          longitude: u.student.dojo.longitude,
                      }
                    : null,
            })}
            membershipFeeBDT={membershipFeeBDT}
            postPaymentStatus={postPaymentStatus}
            postPaymentReason={params.reason ?? null}
            authenticated={Boolean(user)}
        />
    );
}
