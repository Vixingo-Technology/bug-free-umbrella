import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { requireDojoRole } from "@/lib/dojo-session";
import { prisma } from "@/lib/prisma";
import { serialize } from "@/lib/serialize";
import ReceiptPrintButton from "@/components/dojo/shop/receipt-print-button";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
    title: "Receipt — Dojo Dashboard",
};

export default async function ReceiptPage({
    params,
}: {
    params: Promise<{ id: string }>;
}) {
    const { id } = await params;
    const session = await requireDojoRole("INSTRUCTOR");
    if (!session.dojo) redirect("/portal/dojo/shop");

    const saleRaw = await prisma.dojoSale.findUnique({
        where: { id },
        include: {
            items: true,
            buyer: {
                select: { id: true, fullName: true, memberNumber: true, student: { select: { currentRank: true } } },
            },
            dojo: {
                select: {
                    id: true,
                    name: true,
                    address: true,
                    city: true,
                    phone: true,
                    email: true,
                    logoUrl: true,
                },
            },
        },
    });
    if (!saleRaw) notFound();
    if (saleRaw.dojoId !== session.dojo.id) notFound();
    const sale = {
        ...saleRaw,
        member: saleRaw.buyer
            ? {
                id: saleRaw.buyer.id,
                fullName: saleRaw.buyer.fullName,
                memberNumber: saleRaw.buyer.memberNumber ?? null,
                currentRank: saleRaw.buyer.student?.currentRank ?? "—",
            }
            : null,
    };

    const s = serialize(sale) as typeof sale & {
        subtotal: number;
        discount: number;
        total: number;
        items: Array<{
            id: string;
            productName: string;
            quantity: number;
            unitPrice: number;
            lineTotal: number;
        }>;
    };

    const created = new Date(s.createdAt).toLocaleString(undefined, {
        dateStyle: "medium",
        timeStyle: "short",
    });

    return (
        <>
            <style>{`
                @media print {
                    .no-print { display: none !important; }
                    body { background: white !important; }
                    .receipt-sheet { box-shadow: none !important; border: none !important; }
                }
            `}</style>

            <div className="no-print flex items-center justify-between mb-6">
                <Link
                    href="/portal/dojo/shop"
                    className="inline-flex items-center gap-2 text-xs font-bold tracking-widest uppercase text-zinc-500 hover:text-zinc-900"
                >
                    <ArrowLeft size={14} />
                    Back to shop
                </Link>
                <ReceiptPrintButton />
            </div>

            <div className="receipt-sheet max-w-2xl mx-auto bg-white border border-zinc-200 shadow-sm rounded-sm p-8 md:p-10">
                <header className="flex items-start justify-between gap-6 pb-6 border-b-2 border-zinc-900">
                    <div>
                        <p className="text-[10px] tracking-[0.4em] uppercase text-accent-red font-bold mb-1">
                            JKA Bangladesh
                        </p>
                        <h1 className="font-karate text-2xl font-bold text-zinc-900 uppercase tracking-wider">
                            {s.dojo.name}
                        </h1>
                        {s.dojo.address && (
                            <p className="text-xs text-zinc-500 mt-1">
                                {s.dojo.address}
                                {s.dojo.city && `, ${s.dojo.city}`}
                            </p>
                        )}
                        <p className="text-xs text-zinc-500">
                            {s.dojo.phone && <span>{s.dojo.phone}</span>}
                            {s.dojo.phone && s.dojo.email && <span> · </span>}
                            {s.dojo.email && <span>{s.dojo.email}</span>}
                        </p>
                    </div>
                    <div className="text-right">
                        <p className="text-[10px] tracking-widest uppercase text-zinc-400 font-bold">
                            Receipt
                        </p>
                        <p className="font-mono text-lg font-bold text-zinc-900">
                            {s.receiptNo}
                        </p>
                        <p className="text-xs text-zinc-500 mt-1">{created}</p>
                    </div>
                </header>

                <section className="grid grid-cols-2 gap-6 py-6 border-b border-zinc-200">
                    <div>
                        <p className="text-[10px] tracking-widest uppercase text-zinc-400 font-bold mb-1">
                            Buyer
                        </p>
                        <p className="font-semibold text-zinc-900">{s.buyerName}</p>
                        {s.member && (
                            <p className="text-xs text-zinc-500 mt-0.5">
                                {s.member.currentRank}
                                {s.member.memberNumber && ` · #${s.member.memberNumber}`}
                            </p>
                        )}
                    </div>
                    <div>
                        <p className="text-[10px] tracking-widest uppercase text-zinc-400 font-bold mb-1">
                            Issued by
                        </p>
                        <p className="font-semibold text-zinc-900">
                            {s.soldByName ?? "—"}
                        </p>
                        {s.paymentMethod && (
                            <p className="text-xs text-zinc-500 mt-0.5">
                                Payment: {s.paymentMethod}
                            </p>
                        )}
                    </div>
                </section>

                <table className="w-full text-sm my-6">
                    <thead>
                        <tr className="text-left text-[10px] tracking-widest uppercase font-bold text-zinc-400 border-b border-zinc-200">
                            <th className="py-2">Item</th>
                            <th className="py-2 text-center">Qty</th>
                            <th className="py-2 text-right">Unit</th>
                            <th className="py-2 text-right">Total</th>
                        </tr>
                    </thead>
                    <tbody>
                        {s.items.map((line) => (
                            <tr
                                key={line.id}
                                className="border-b border-zinc-100"
                            >
                                <td className="py-2.5 text-zinc-900">
                                    {line.productName}
                                </td>
                                <td className="py-2.5 text-center font-mono">
                                    {line.quantity}
                                </td>
                                <td className="py-2.5 text-right font-mono text-zinc-700">
                                    ৳ {line.unitPrice.toLocaleString()}
                                </td>
                                <td className="py-2.5 text-right font-mono font-semibold text-zinc-900">
                                    ৳ {line.lineTotal.toLocaleString()}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>

                <div className="ml-auto max-w-xs text-sm space-y-1.5">
                    <div className="flex justify-between text-zinc-500">
                        <span>Subtotal</span>
                        <span className="font-mono">
                            ৳ {Number(s.subtotal).toLocaleString()}
                        </span>
                    </div>
                    {Number(s.discount) > 0 && (
                        <div className="flex justify-between text-zinc-500">
                            <span>Discount</span>
                            <span className="font-mono">
                                − ৳ {Number(s.discount).toLocaleString()}
                            </span>
                        </div>
                    )}
                    <div className="flex justify-between font-karate text-lg font-bold text-zinc-900 pt-2 border-t border-zinc-900">
                        <span>Total</span>
                        <span className="font-mono">
                            ৳ {Number(s.total).toLocaleString()}
                        </span>
                    </div>
                </div>

                {s.notes && (
                    <div className="mt-6 pt-4 border-t border-zinc-200">
                        <p className="text-[10px] tracking-widest uppercase text-zinc-400 font-bold mb-1">
                            Notes
                        </p>
                        <p className="text-sm text-zinc-700 whitespace-pre-wrap">
                            {s.notes}
                        </p>
                    </div>
                )}

                <footer className="mt-10 pt-6 border-t border-zinc-200 text-center text-[11px] text-zinc-400">
                    Thank you · Osu! · jkabangladesh.com
                </footer>
            </div>
        </>
    );
}
