import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/admin-guard";
import { serialize } from "@/lib/serialize";
import ProductsAdminClient from "@/components/portal/admin/products-client";

export const dynamic = "force-dynamic";

export default async function AdminProductsPage() {
    await requireAdmin();

    const [products, orderCounts] = await Promise.all([
        prisma.shopProduct.findMany({ orderBy: { createdAt: "desc" } }),
        prisma.shopOrderItem.groupBy({
            by: ["productId"],
            _sum: { quantity: true },
        }),
    ]);

    const soldByProduct: Record<string, number> = {};
    for (const r of orderCounts) {
        soldByProduct[r.productId] = r._sum.quantity ?? 0;
    }

    return (
        <ProductsAdminClient
            products={serialize(products) as never}
            soldByProduct={soldByProduct}
        />
    );
}
