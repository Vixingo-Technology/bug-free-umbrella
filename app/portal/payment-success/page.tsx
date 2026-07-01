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
    if (!user) redirect("/login");

    const { orderId, dev } = await searchParams;

    let order = null;
    let member = null;

    const loadMember = async () => {
        const u = await prisma.user.findUnique({
            where: { id: user.id },
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
        member = await loadMember();

        if (orderId) {
            order = await prisma.shopOrder.findUnique({
                where: { id: orderId, userId: user.id },
                include: { orderItems: { include: { product: true } } },
            });
        }

        // Dev bypass: mark paid right here
        if (dev === "1" && order && order.paymentStatus !== "PAID") {
            const expiry = new Date();
            expiry.setFullYear(expiry.getFullYear() + 1);
            await prisma.$transaction([
                prisma.shopOrder.update({ where: { id: orderId! }, data: { paymentStatus: "PAID" } }),
                prisma.student.update({
                    where: { id: user.id },
                    data: { membershipStatus: "ACTIVE", onboardingComplete: true, expiryDate: expiry },
                }),
            ]);
            member = await loadMember();
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
