import type { Metadata } from "next";
import { Download } from "lucide-react";
import DojoPageHeader from "@/components/dojo/page-header";
import { requireDojoRole } from "@/lib/dojo-roles";

export const metadata: Metadata = {
    title: "Payments — Dojo Dashboard",
};

const TX = [
    {
        date: "Jun 22",
        student: "Tahmid Rahman",
        type: "Monthly dues",
        amount: "৳ 2,500",
        method: "bKash",
        status: "PAID",
    },
    {
        date: "Jun 22",
        student: "Anika Hossain",
        type: "Belt test fee",
        amount: "৳ 1,200",
        method: "Cash",
        status: "PAID",
    },
    {
        date: "Jun 21",
        student: "Ibrahim Khan",
        type: "Gi purchase",
        amount: "৳ 2,200",
        method: "Card",
        status: "PAID",
    },
    {
        date: "Jun 20",
        student: "Sumaiya Chowdhury",
        type: "Monthly dues",
        amount: "৳ 2,500",
        method: "SSLCommerz",
        status: "PAID",
    },
    {
        date: "Jun 19",
        student: "Rahim Uddin",
        type: "Monthly dues",
        amount: "৳ 2,500",
        method: "Cash",
        status: "REFUNDED",
    },
];

export default async function PaymentsPage() {
    await requireDojoRole("DOJO_MANAGER");
    return (
        <>
            <DojoPageHeader
                eyebrow="Manager"
                title="Payment history"
                description="Every dues payment, belt test fee, and merchandise sale recorded against your dojo."
                actions={
                    <button
                        type="button"
                        className="inline-flex items-center gap-2 border border-zinc-300 text-zinc-700 px-4 py-2.5 text-xs font-bold tracking-widest uppercase hover:border-accent-red hover:text-accent-red transition-colors rounded-sm"
                    >
                        <Download size={14} />
                        Export CSV
                    </button>
                }
            />

            <div className="bg-white border border-zinc-200 rounded-sm shadow-sm overflow-x-auto">
                <table className="w-full text-sm">
                    <thead>
                        <tr className="text-left text-[10px] tracking-widest uppercase font-bold text-zinc-400 border-b border-zinc-200">
                            <th className="px-5 py-3">Date</th>
                            <th className="px-5 py-3">Student</th>
                            <th className="px-5 py-3">Type</th>
                            <th className="px-5 py-3">Method</th>
                            <th className="px-5 py-3 text-right">Amount</th>
                            <th className="px-5 py-3 text-center">Status</th>
                        </tr>
                    </thead>
                    <tbody>
                        {TX.map((t, i) => (
                            <tr
                                key={i}
                                className="border-b border-zinc-100 hover:bg-zinc-50"
                            >
                                <td className="px-5 py-3 text-zinc-500 font-mono text-xs">
                                    {t.date}
                                </td>
                                <td className="px-5 py-3 font-semibold text-zinc-900">
                                    {t.student}
                                </td>
                                <td className="px-5 py-3 text-zinc-600">
                                    {t.type}
                                </td>
                                <td className="px-5 py-3 text-zinc-500">
                                    {t.method}
                                </td>
                                <td className="px-5 py-3 text-right font-mono text-zinc-900">
                                    {t.amount}
                                </td>
                                <td className="px-5 py-3 text-center">
                                    <span
                                        className={`text-[10px] tracking-widest uppercase font-bold px-2 py-1 rounded-full border ${
                                            t.status === "PAID"
                                                ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                                                : "bg-zinc-50 text-zinc-600 border-zinc-200"
                                        }`}
                                    >
                                        {t.status}
                                    </span>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </>
    );
}
