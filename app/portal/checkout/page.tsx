import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { serialize } from "@/lib/serialize";
import CheckoutClient from "@/components/portal/checkout-client";

export const metadata = { title: "Checkout — JKA Bangladesh" };

export default async function CheckoutPage({
    searchParams,
}: {
    searchParams: Promise<{ orderId?: string; failed?: string }>;
}) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) redirect("/login");

    const { orderId, failed } = await searchParams;

    let order = null;
    let member = null;

    try {
        const u = await prisma.user.findUnique({
            where: { id: user.id },
            include: { student: { include: { dojo: true } } },
        });
        if (u) {
            member = {
                ...u,
                ...(u.student ?? {}),
                role: u.roleId,
                dojo: u.student?.dojo ?? null,
            };
        }

        if (orderId) {
            order = await prisma.shopOrder.findUnique({
                where: { id: orderId, userId: user.id },
                include: {
                    orderItems: {
                        include: { product: true },
                    },
                    certificateRequests: {
                        select: {
                            id: true,
                            memberName: true,
                            rankName: true,
                            price: true,
                        },
                    },
                },
            });
        }

        // If no orderId, look for the latest pending membership order
        if (!order) {
            order = await prisma.shopOrder.findFirst({
                where: {
                    userId: user.id,
                    paymentStatus: "PENDING",
                    includesMembership: true,
                },
                include: {
                    orderItems: { include: { product: true } },
                },
                orderBy: { createdAt: "desc" },
            });
        }

        if (!order) redirect("/portal");
    } catch (err: any) {
        if (err?.digest?.startsWith("NEXT_REDIRECT")) throw err;
        redirect("/portal");
    }

    return (
        <CheckoutClient
            order={serialize(order)}
            member={serialize(member)}
            paymentFailed={failed === "1"}
        />
    );
}
