import type { Metadata } from "next";
import Link from "next/link";
import { Mail, RefreshCcw, XCircle } from "lucide-react";
import { prisma } from "@/lib/prisma";

export const metadata: Metadata = {
    title: "Payment unsuccessful — JKA Bangladesh Shop",
    robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

type SearchParams = Promise<{
    orderId?: string;
    reason?: string;
    cancelled?: string;
}>;

export default async function ShopFailedPage({
    searchParams,
}: {
    searchParams: SearchParams;
}) {
    const params = await searchParams;
    const orderId = params.orderId?.trim() || null;
    const cancelled = params.cancelled === "1";
    const reason =
        params.reason?.trim() ||
        (cancelled
            ? "You cancelled the payment before it was completed."
            : "The payment gateway declined the transaction. No charge has been made.");

    let orderTotal: number | null = null;
    let orderCurrency = "BDT";
    if (orderId) {
        try {
            const order = await prisma.shopOrder.findUnique({
                where: { id: orderId },
                select: { total: true, currency: true, paymentStatus: true },
            });
            if (order && order.paymentStatus !== "PAID") {
                orderTotal = Number(order.total);
                orderCurrency = order.currency;
            }
        } catch {
            /* ignore */
        }
    }

    return (
        <main className="min-h-screen bg-white pb-24 pt-32">
            <div className="mx-auto max-w-xl px-6 md:px-10">
                <div className="rounded-sm border border-zinc-200 bg-white p-8 shadow-sm md:p-12">
                    <div className="flex flex-col items-center text-center">
                        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-red-50 text-red-600">
                            <XCircle size={36} />
                        </div>
                        <p className="mt-6 text-[11px] uppercase tracking-[0.4em] text-red-600">
                            {cancelled
                                ? "Payment cancelled"
                                : "Payment unsuccessful"}
                        </p>
                        <h1 className="mt-3 font-serif text-3xl text-zinc-900 md:text-4xl">
                            Your order wasn&apos;t completed
                        </h1>
                        <p className="mt-3 max-w-md text-sm text-zinc-500">
                            {reason}
                        </p>
                    </div>

                    {orderId && (
                        <div className="mt-8 border-t border-zinc-100 pt-6 text-center">
                            <p className="text-[11px] uppercase tracking-widest text-zinc-500">
                                Order reference
                            </p>
                            <p className="mt-1 font-mono text-sm text-zinc-900">
                                {orderId.slice(0, 8).toUpperCase()}
                            </p>
                            {orderTotal !== null && (
                                <p className="mt-3 text-sm text-zinc-600">
                                    Amount due:{" "}
                                    <span className="font-semibold text-zinc-900">
                                        {orderCurrency}{" "}
                                        {orderTotal.toLocaleString()}
                                    </span>
                                </p>
                            )}
                        </div>
                    )}

                    <div className="mt-8 flex flex-col gap-3">
                        <Link
                            href={
                                orderId
                                    ? `/shop/checkout?orderId=${encodeURIComponent(
                                          orderId,
                                      )}&failed=1`
                                    : "/shop/checkout"
                            }
                            className="inline-flex items-center justify-center gap-2 rounded-sm bg-zinc-900 px-6 py-3 text-xs font-semibold uppercase tracking-widest text-white transition hover:bg-accent-red"
                        >
                            <RefreshCcw size={14} />
                            Try payment again
                        </Link>
                        <Link
                            href="/shop"
                            className="inline-flex items-center justify-center rounded-sm border border-zinc-200 px-6 py-3 text-xs font-semibold uppercase tracking-widest text-zinc-700 transition hover:border-accent-red hover:text-accent-red"
                        >
                            Back to shop
                        </Link>
                        <a
                            href="mailto:support@jkabangladesh.com?subject=Shop%20payment%20issue"
                            className="inline-flex items-center justify-center gap-2 rounded-sm border border-zinc-200 px-6 py-3 text-xs font-semibold uppercase tracking-widest text-zinc-700 transition hover:border-accent-red hover:text-accent-red"
                        >
                            <Mail size={14} />
                            Contact support
                        </a>
                    </div>
                </div>
            </div>
        </main>
    );
}
