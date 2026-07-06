import type { Metadata } from "next";
import Link from "next/link";
import { CheckCircle2 } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { serialize } from "@/lib/serialize";
import ClearCartOnMount from "@/components/shop/clear-cart-on-mount";

export const metadata: Metadata = {
    title: "Thank You — JKA Bangladesh Shop",
};

export const dynamic = "force-dynamic";

type OrderView = {
    id: string;
    total: number;
    currency: string;
    guestName: string | null;
    guestPhone: string | null;
    guestAddress: string | null;
    orderItems: Array<{
        id: string;
        quantity: number;
        unitPrice: number;
        size: string | null;
        product: { name: string };
    }>;
};

export default async function ThankYouPage({
    searchParams,
}: {
    searchParams: Promise<{ orderId?: string }>;
}) {
    const { orderId } = await searchParams;

    let order: OrderView | null = null;
    if (orderId) {
        try {
            const row = await prisma.shopOrder.findUnique({
                where: { id: orderId },
                include: {
                    orderItems: {
                        include: { product: { select: { name: true } } },
                    },
                },
            });
            if (row) order = serialize(row) as unknown as OrderView;
        } catch {
            order = null;
        }
    }

    return (
        <main className="min-h-screen bg-white pb-24 pt-32">
            <ClearCartOnMount />
            <div className="mx-auto max-w-2xl px-6 md:px-10">
                <div className="rounded-sm border border-zinc-200 bg-white p-8 shadow-sm md:p-12">
                    <div className="flex flex-col items-center text-center">
                        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-emerald-50 text-emerald-600">
                            <CheckCircle2 size={36} />
                        </div>
                        <p className="mt-6 text-[11px] uppercase tracking-[0.4em] text-emerald-600">
                            Order confirmed
                        </p>
                        <h1 className="mt-3 font-serif text-3xl text-zinc-900 md:text-4xl">
                            Thank you{order?.guestName ? `, ${order.guestName}` : ""}!
                        </h1>
                        <p className="mt-3 max-w-md text-sm text-zinc-500">
                            Your payment was received and we&apos;ve started
                            preparing your order. You will hear from us shortly
                            about delivery.
                        </p>
                    </div>

                    {order && (
                        <div className="mt-8 border-t border-zinc-100 pt-6">
                            <p className="text-[11px] uppercase tracking-widest text-zinc-500">
                                Order reference
                            </p>
                            <p className="mt-1 font-mono text-sm text-zinc-900">
                                {order.id.slice(0, 8).toUpperCase()}
                            </p>

                            <ul className="mt-5 space-y-2">
                                {order.orderItems.map((it) => (
                                    <li
                                        key={it.id}
                                        className="flex items-start justify-between gap-3 text-sm"
                                    >
                                        <span className="text-zinc-700">
                                            {it.product.name}
                                            {it.size && (
                                                <span className="ml-1 rounded-sm bg-zinc-100 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-widest text-zinc-600">
                                                    {it.size}
                                                </span>
                                            )}
                                            <span className="ml-1 text-zinc-400">
                                                × {it.quantity}
                                            </span>
                                        </span>
                                        <span className="font-medium text-zinc-900">
                                            ৳{" "}
                                            {(
                                                Number(it.unitPrice) * it.quantity
                                            ).toLocaleString()}
                                        </span>
                                    </li>
                                ))}
                            </ul>

                            <div className="mt-6 flex items-center justify-between border-t border-zinc-100 pt-4">
                                <span className="text-xs uppercase tracking-widest text-zinc-500">
                                    Total paid
                                </span>
                                <span className="font-serif text-xl text-zinc-900">
                                    {order.currency} {order.total.toLocaleString()}
                                </span>
                            </div>

                            {order.guestAddress && (
                                <div className="mt-6 rounded-sm bg-zinc-50 p-4 text-sm text-zinc-600">
                                    <p className="mb-1 text-[10px] uppercase tracking-widest text-zinc-500">
                                        Delivering to
                                    </p>
                                    <p className="text-zinc-800">
                                        {order.guestName}
                                    </p>
                                    <p>{order.guestAddress}</p>
                                    {order.guestPhone && (
                                        <p>Phone: {order.guestPhone}</p>
                                    )}
                                </div>
                            )}
                        </div>
                    )}

                    <div className="mt-8 flex justify-center">
                        <Link
                            href="/shop"
                            className="inline-flex items-center rounded-sm bg-zinc-900 px-6 py-3 text-xs font-semibold uppercase tracking-widest text-white transition hover:bg-accent-red"
                        >
                            Continue shopping
                        </Link>
                    </div>
                </div>
            </div>
        </main>
    );
}
