import type { Metadata } from "next";
import { Plus, Wallet } from "lucide-react";
import DojoPageHeader from "@/components/dojo/page-header";
import { requireDojoRole } from "@/lib/dojo-roles";

export const metadata: Metadata = {
    title: "Shop & dues — Dojo Dashboard",
};

const PRODUCTS = [
    {
        name: "Gi (cotton, white)",
        price: "৳ 2,200",
        stock: 14,
        note: "Branded with JKA emblem",
    },
    { name: "Belt — coloured ranks", price: "৳ 350", stock: 42, note: "All kyu colours" },
    { name: "Belt — black", price: "৳ 850", stock: 6, note: "Embroidered" },
    { name: "Mitts (pair)", price: "৳ 1,500", stock: 9, note: "Adult sizes only" },
];

const DUES = [
    { period: "May 2026", collected: "৳ 1,38,000", outstanding: "৳ 12,500" },
    { period: "June 2026", collected: "৳ 1,42,500", outstanding: "৳ 16,200" },
];

export default async function ShopPage() {
    await requireDojoRole("DOJO_MANAGER");
    return (
        <>
            <DojoPageHeader
                eyebrow="Manager"
                title="Shop & dues"
                description="Run the dojo merchandise counter and track monthly training dues."
                actions={
                    <button
                        type="button"
                        className="inline-flex items-center gap-2 bg-accent-red text-white px-4 py-2.5 text-xs font-bold tracking-widest uppercase hover:bg-accent-red/90 transition-colors rounded-sm"
                    >
                        <Plus size={14} />
                        Add product
                    </button>
                }
            />

            <div className="grid lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 bg-white border border-zinc-200 rounded-sm shadow-sm">
                    <div className="px-5 py-4 border-b border-zinc-200">
                        <h3 className="text-xs tracking-widest uppercase font-bold text-zinc-500">
                            Inventory
                        </h3>
                    </div>
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="text-left text-[10px] tracking-widest uppercase font-bold text-zinc-400 border-b border-zinc-200">
                                <th className="px-5 py-3">Product</th>
                                <th className="px-5 py-3">Price</th>
                                <th className="px-5 py-3 text-center">Stock</th>
                            </tr>
                        </thead>
                        <tbody>
                            {PRODUCTS.map((p) => (
                                <tr
                                    key={p.name}
                                    className="border-b border-zinc-100 hover:bg-zinc-50"
                                >
                                    <td className="px-5 py-3">
                                        <p className="font-semibold text-zinc-900">
                                            {p.name}
                                        </p>
                                        <p className="text-xs text-zinc-500">
                                            {p.note}
                                        </p>
                                    </td>
                                    <td className="px-5 py-3 font-mono text-zinc-700">
                                        {p.price}
                                    </td>
                                    <td className="px-5 py-3 text-center">
                                        <span
                                            className={`font-mono font-bold ${
                                                p.stock < 10
                                                    ? "text-amber-600"
                                                    : "text-zinc-900"
                                            }`}
                                        >
                                            {p.stock}
                                        </span>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                <div className="bg-white border border-zinc-200 rounded-sm shadow-sm">
                    <div className="px-5 py-4 border-b border-zinc-200 flex items-center gap-2">
                        <Wallet size={14} className="text-accent-red" />
                        <h3 className="text-xs tracking-widest uppercase font-bold text-zinc-500">
                            Monthly dues
                        </h3>
                    </div>
                    <ul className="divide-y divide-zinc-200">
                        {DUES.map((d) => (
                            <li key={d.period} className="px-5 py-4">
                                <p className="text-[10px] tracking-widest uppercase font-bold text-zinc-400">
                                    {d.period}
                                </p>
                                <p className="font-karate text-lg font-bold text-zinc-900 mt-1">
                                    {d.collected}
                                </p>
                                <p className="text-xs text-amber-700 mt-1">
                                    {d.outstanding} outstanding
                                </p>
                            </li>
                        ))}
                    </ul>
                </div>
            </div>
        </>
    );
}
