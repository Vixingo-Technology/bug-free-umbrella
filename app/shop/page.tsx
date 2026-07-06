import type { Metadata } from "next";
import { prisma } from "@/lib/prisma";
import { serialize } from "@/lib/serialize";
import ProductCard, {
    type ProductCardData,
} from "@/components/shop/product-card";

export const metadata: Metadata = {
    title: "Shop — JKA Bangladesh",
    description:
        "Official JKA Bangladesh gear and merchandise. Order online with cash-on-delivery or SSLCommerz secure payment.",
};

export const dynamic = "force-dynamic";

export default async function ShopPage() {
    let products: ProductCardData[] = [];
    try {
        const rows = await prisma.shopProduct.findMany({
            where: { isActive: true },
            orderBy: [{ category: "asc" }, { createdAt: "desc" }],
        });
        products = serialize(rows) as ProductCardData[];
    } catch {
        products = [];
    }

    return (
        <main className="min-h-screen bg-white pb-24">
            {/* Hero */}
            <section className="relative bg-bg-deep pb-16 pt-40 text-white">
                <div className="mx-auto max-w-7xl px-6 md:px-12">
                    <p className="text-[11px] uppercase tracking-[0.4em] text-accent-gold">
                        Official Store
                    </p>
                    <h1 className="mt-3 font-serif text-4xl md:text-6xl">
                        JKA Bangladesh <span className="text-accent-red">Shop</span>
                    </h1>
                    <p className="mt-4 max-w-2xl text-sm text-zinc-300 md:text-base">
                        Authentic JKA-approved gear, apparel and study materials.
                        Order online — pay securely with SSLCommerz. Delivery
                        anywhere in Bangladesh.
                    </p>
                </div>
            </section>

            {/* Products grid */}
            <section className="mx-auto max-w-7xl px-6 py-14 md:px-12">
                {products.length === 0 ? (
                    <div className="rounded-sm border border-dashed border-zinc-300 bg-white py-20 text-center">
                        <p className="text-sm text-zinc-500">
                            No products available at the moment. Please check back
                            soon.
                        </p>
                    </div>
                ) : (
                    <>
                        <div className="mb-8 flex items-center justify-between">
                            <h2 className="font-serif text-2xl text-zinc-900">
                                All products
                            </h2>
                            <span className="text-xs uppercase tracking-widest text-zinc-500">
                                {products.length}{" "}
                                {products.length === 1 ? "item" : "items"}
                            </span>
                        </div>
                        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                            {products.map((p) => (
                                <ProductCard key={p.id} product={p} />
                            ))}
                        </div>
                    </>
                )}
            </section>
        </main>
    );
}
