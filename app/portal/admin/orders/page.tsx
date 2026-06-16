import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/admin-guard";
import { serialize } from "@/lib/serialize";
import OrdersAdminClient from "@/components/portal/admin/orders-client";

export const dynamic = "force-dynamic";

export default async function AdminOrdersPage() {
    await requireAdmin();

    const orders = await prisma.shopOrder.findMany({
        orderBy: { createdAt: "desc" },
        include: {
            member: {
                select: { id: true, fullName: true, email: true, phone: true, memberNumber: true },
            },
            orderItems: {
                include: { product: { select: { id: true, name: true } } },
            },
        },
    });

    return <OrdersAdminClient orders={serialize(orders) as never} />;
}
