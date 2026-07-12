import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { serialize } from "@/lib/serialize";

type PreviewProduct = {
    id: string;
    name: string;
    price: number;
    imageUrl: string | null;
    category: string | null;
};

async function loadPreviewProducts(): Promise<PreviewProduct[]> {
    try {
        const rows = await prisma.shopProduct.findMany({
            where: { isActive: true },
            orderBy: [{ createdAt: "desc" }],
            take: 8,
            select: {
                id: true,
                name: true,
                price: true,
                imageUrl: true,
                category: true,
            },
        });
        return serialize(rows) as unknown as PreviewProduct[];
    } catch {
        return [];
    }
}

export default async function ShopPreview() {
    const products = await loadPreviewProducts();

    if (products.length === 0) return null;

    return (
        <section
            id="shop-preview"
            className="relative bg-bg-deep py-24 md:py-32 overflow-hidden border-b border-zinc-200"
        >
            <div className="max-w-7xl mx-auto px-6 lg:px-12">
                <div className="text-center mb-14">
                    <p className="text-[11px] uppercase tracking-[0.4em] text-accent-gold mb-3">
                        Official Store
                    </p>
                    <h2 className="font-karate text-3xl md:text-5xl text-zinc-900 mb-4 uppercase tracking-widest font-bold">
                        JKA <span className="text-accent-red">Merchandise</span>
                    </h2>
                    <div className="h-px w-24 bg-accent-red mx-auto mb-6"></div>
                    <p className="text-zinc-500 max-w-xl mx-auto text-sm md:text-base">
                        Authentic JKA-approved gear, apparel and study materials.
                        Delivered anywhere in Bangladesh.
                    </p>
                </div>

                {/* Faded preview grid */}
                <div className="relative">
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">
                        {products.map((p) => (
                            <div
                                key={p.id}
                                className="group flex flex-col overflow-hidden rounded-sm border border-zinc-200 bg-white shadow-sm"
                            >
                                <div className="relative aspect-square overflow-hidden bg-zinc-100">
                                    {p.imageUrl ? (
                                        // eslint-disable-next-line @next/next/no-img-element
                                        <img
                                            src={p.imageUrl}
                                            alt={p.name}
                                            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                                        />
                                    ) : (
                                        <div className="flex h-full w-full items-center justify-center text-xs text-zinc-400">
                                            No image
                                        </div>
                                    )}
                                    {p.category && (
                                        <span className="absolute left-2 top-2 rounded-sm bg-white/90 px-2 py-0.5 text-[9px] font-semibold uppercase tracking-widest text-zinc-700 backdrop-blur">
                                            {p.category}
                                        </span>
                                    )}
                                </div>
                                <div className="p-3 md:p-4">
                                    <h3 className="text-sm font-semibold text-zinc-900 line-clamp-1">
                                        {p.name}
                                    </h3>
                                    <p className="mt-1 text-sm font-serif text-zinc-900">
                                        ৳ {Number(p.price).toLocaleString()}
                                    </p>
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Fade-out overlay */}
                    <div
                        aria-hidden
                        className="pointer-events-none absolute inset-x-0 bottom-0 h-2/3 bg-gradient-to-b from-transparent via-bg-deep/85 to-bg-deep"
                    />

                    {/* CTA button anchored to the fade */}
                    <div className="pointer-events-none absolute inset-x-0 bottom-0 flex justify-center pb-6 md:pb-10">
                        <Link href="/shop" className="pointer-events-auto">
                            <button className="inline-flex items-center gap-2 px-8 md:px-10 py-4 md:py-5 bg-accent-red hover:bg-red-700 text-white font-bold tracking-[0.2em] uppercase text-xs md:text-sm rounded-sm transition-colors shadow-lg">
                                Browse Shop
                                <ArrowRight size={16} />
                            </button>
                        </Link>
                    </div>
                </div>
            </div>
        </section>
    );
}
