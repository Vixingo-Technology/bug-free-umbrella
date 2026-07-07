import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { serialize } from "@/lib/serialize";
import PaymentSuccessClient from "@/components/portal/payment-success-client";

export const metadata = { title: "Welcome to JKA Bangladesh!" };

export default async function PaymentSuccessPage({
    searchParams,
}: {
    searchParams: Promise<{ orderId?: string; dev?: string }>;
}) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    const { orderId, dev } = await searchParams;

    // Post-payment landing is public: if there's no session, we still show
    // the receipt for the passed-in orderId. Deep links without either get
    // sent home.
    if (!user && !orderId) redirect("/");

    let order = null;
    let member = null;

    const loadMemberById = async (userId: string) => {
        const u = await prisma.user.findUnique({
            where: { id: userId },
            include: { student: { include: { dojo: true } } },
        });
        if (!u) return null;
        return {
            ...u,
            ...(u.student ?? {}),
            role: u.roleId,
            dojo: u.student?.dojo ?? null,
        };
    };

    try {
        if (user) member = await loadMemberById(user.id);

        if (orderId) {
            order = await prisma.shopOrder.findUnique({
                where: user
                    ? { id: orderId, userId: user.id }
                    : { id: orderId },
                include: { orderItems: { include: { product: true } } },
            });
            // If we didn't have a session, pull the member off the order.
            if (!member && order?.userId) {
                member = await loadMemberById(order.userId);
            }
        }

        // Dev bypass: mark paid right here. Needs an authenticated session
        // — production uses the SSLCommerz IPN + service role, so no auth is
        // required there.
        if (user && dev === "1" && order && order.paymentStatus !== "PAID") {
            const existing = await prisma.student.findUnique({
                where: { id: user.id },
                select: { expiryDate: true },
            });
            const { extendExpiry } = await import(
                "@/lib/renewals/extend-expiry"
            );
            const expiry = extendExpiry(existing?.expiryDate ?? null);
            const writes: any[] = [
                prisma.shopOrder.update({ where: { id: orderId! }, data: { paymentStatus: "PAID" } }),
            ];
            if (order.includesMembership) {
                writes.push(prisma.student.update({
                    where: { id: user.id },
                    data: { membershipStatus: "ACTIVE", onboardingComplete: true, expiryDate: expiry },
                }));
            }
            if (order.includesTransferRequest) {
                const linkedReq = await prisma.studentTransferRequest.findFirst({
                    where: { orderId: orderId!, status: "PENDING_PAYMENT" },
                    select: { id: true },
                });
                if (linkedReq) {
                    writes.push(prisma.studentTransferRequest.update({
                        where: { id: linkedReq.id },
                        data: { status: "AWAITING_DOJO", paidAt: new Date() },
                    }));
                }
            }
            await prisma.$transaction(writes);
            member = await loadMemberById(user.id);
        }
    } catch {
        // silent
    }

    const hasProducts = (order?.orderItems?.length ?? 0) > 0;

    return (
        <PaymentSuccessClient
            member={serialize(member)}
            order={serialize(order)}
            hasProducts={hasProducts}
        />
    );
}
