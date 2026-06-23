import type { Metadata } from "next";
import { Send } from "lucide-react";
import DojoPageHeader from "@/components/dojo/page-header";
import { requireDojoRole } from "@/lib/dojo-session";

export const metadata: Metadata = {
    title: "Renewals — Dojo Dashboard",
};

const RENEWALS = [
    {
        name: "Ibrahim Khan",
        expires: "3 days",
        amount: "৳ 6,000",
        status: "DUE_SOON",
    },
    {
        name: "Sumaiya Chowdhury",
        expires: "7 days",
        amount: "৳ 6,000",
        status: "DUE_SOON",
    },
    {
        name: "Rahim Uddin",
        expires: "Expired 5 days ago",
        amount: "৳ 6,000",
        status: "EXPIRED",
    },
    {
        name: "Priya Akter",
        expires: "21 days",
        amount: "৳ 6,000",
        status: "ON_TRACK",
    },
];

export default async function RenewalsPage() {
    await requireDojoRole("DOJO_MANAGER");
    return (
        <>
            <DojoPageHeader
                eyebrow="Manager"
                title="Renewals"
                description="Memberships expiring within 30 days. Chase up before they lapse."
            />

            <div className="bg-white border border-zinc-200 rounded-sm shadow-sm overflow-x-auto">
                <table className="w-full text-sm">
                    <thead>
                        <tr className="text-left text-[10px] tracking-widest uppercase font-bold text-zinc-400 border-b border-zinc-200">
                            <th className="px-5 py-3">Member</th>
                            <th className="px-5 py-3">Expires</th>
                            <th className="px-5 py-3">Annual fee</th>
                            <th className="px-5 py-3 text-right">Action</th>
                        </tr>
                    </thead>
                    <tbody>
                        {RENEWALS.map((r) => (
                            <tr
                                key={r.name}
                                className="border-b border-zinc-100 hover:bg-zinc-50"
                            >
                                <td className="px-5 py-3 font-semibold text-zinc-900">
                                    {r.name}
                                </td>
                                <td className="px-5 py-3">
                                    <span
                                        className={`text-xs font-bold ${
                                            r.status === "EXPIRED"
                                                ? "text-red-600"
                                                : r.status === "DUE_SOON"
                                                ? "text-amber-600"
                                                : "text-zinc-600"
                                        }`}
                                    >
                                        {r.expires}
                                    </span>
                                </td>
                                <td className="px-5 py-3 font-mono text-zinc-700">
                                    {r.amount}
                                </td>
                                <td className="px-5 py-3 text-right">
                                    <button
                                        type="button"
                                        className="inline-flex items-center gap-2 border border-zinc-300 text-zinc-700 px-3 py-1.5 text-[10px] font-bold tracking-widest uppercase hover:border-accent-red hover:text-accent-red transition-colors rounded-sm"
                                    >
                                        <Send size={12} />
                                        Send reminder
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </>
    );
}
