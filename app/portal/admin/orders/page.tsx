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
                select: {
                    id: true, fullName: true, email: true, phone: true, memberNumber: true,
                    student: { select: { address: true } },
                },
            },
            orderItems: {
                include: { product: { select: { id: true, name: true } } },
            },
        },
    });
    const orders = ordersRaw.map((o) => {
        const hasShopItems = o.orderItems.length > 0;
        const isMembershipish = o.includesMembership || o.includesDojoRenewal;
        const category: "SHOP" | "CERTIFICATE" | "MEMBERSHIP" =
            o.includesCertificates
                ? "CERTIFICATE"
                : isMembershipish && !hasShopItems
                    ? "MEMBERSHIP"
                    : "SHOP";
        return {
        ...o,
        category,
        member: o.user
            ? {
                id: o.user.id,
                fullName: o.user.fullName,
                email: o.user.email,
                phone: o.user.phone,
                address: o.user.student?.address ?? null,
                memberNumber: o.user.memberNumber ?? null,
                isGuest: false,
            }
            : {
                id: null,
                fullName: o.guestName ?? "Guest",
                email: o.guestEmail ?? "",
                phone: o.guestPhone ?? null,
                address: o.guestAddress ?? null,
                memberNumber: null,
                isGuest: true,
            },
        };
    });

    return <OrdersAdminClient orders={serialize(orders) as never} />;
}
