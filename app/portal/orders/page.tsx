import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { serialize } from "@/lib/serialize";
import OrdersClient from "@/components/portal/orders-client";

export default async function OrdersPage() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) redirect("/login");

    let orders: any[] = [];

    try {
        orders = await prisma.shopOrder.findMany({
            where: { memberId: user.id },
            include: {
                orderItems: {
                    include: { product: true },
                },
            },
            orderBy: { createdAt: "desc" },
        });
    } catch {
        // DB not configured
    }

    return <OrdersClient orders={serialize(orders)} />;
}
