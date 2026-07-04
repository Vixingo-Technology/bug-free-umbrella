import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/admin-guard";
import { serialize } from "@/lib/serialize";
import OrdersAdminClient from "@/components/portal/admin/orders-client";

export const dynamic = "force-dynamic";

export default async function AdminOrdersPage() {
    await requireAdmin();

    const ordersRaw = await prisma.shopOrder.findMany({
        orderBy: { createdAt: "desc" },
        include: {
            user: {
                select: { id: true, fullName: true, email: true, phone: true, memberNumber: true },
            },
            orderItems: {
                include: { product: { select: { id: true, name: true } } },
            },
        },
    });
    const orders = ordersRaw.map((o) => ({
        ...o,
        member: {
            id: o.user.id,
            fullName: o.user.fullName,
            email: o.user.email,
            phone: o.user.phone,
            memberNumber: o.user.memberNumber ?? null,
        },
    }));

    return <OrdersAdminClient orders={serialize(orders) as never} />;
}
