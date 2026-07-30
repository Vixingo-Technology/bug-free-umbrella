"use client";

import { useMemo, useState, useTransition } from "react";
import Image from "next/image";
import Link from "next/link";
import { motion } from "motion/react";
import {
    Plus, Search, Pencil, Trash2, ImageOff,
    ToggleRight, ToggleLeft, AlertCircle, CheckCircle2, ChevronDown,
} from "lucide-react";
import {
    deleteProductAction,
    toggleProductActiveAction,
} from "@/app/actions/admin-products";

type Product = {
    id: string;
    name: string;
    description: string | null;
    price: number;
    stock: number;
    imageUrl: string | null;
    category: string | null;
    isActive: boolean;
    hasSizes: boolean;
    sizes: string[];
    memberDiscountPercent: number;
    createdAt: string | Date;
};

export default function ProductsAdminClient({
    products, soldByProduct,
}: {
    products: Product[];
    soldByProduct: Record<string, number>;
}) {
    const [search, setSearch] = useState("");
    const [activeFilter, setActiveFilter] = useState<"ALL" | "ACTIVE" | "INACTIVE">("ALL");
    const [toast, setToast] = useState<{ kind: "ok" | "err"; msg: string } | null>(null);

    const categories = useMemo(() => {
        const s = new Set<string>();
        products.forEach((p) => p.category && s.add(p.category));
        return Array.from(s).sort();
    }, [products]);
    const [categoryFilter, setCategoryFilter] = useState<"ALL" | string>("ALL");

    const filtered = useMemo(() => {
        const q = search.trim().toLowerCase();
        return products.filter((p) => {
            if (activeFilter === "ACTIVE" && !p.isActive) return false;
            if (activeFilter === "INACTIVE" && p.isActive) return false;
            if (categoryFilter !== "ALL" && p.category !== categoryFilter) return false;
            if (!q) return true;
            return p.name.toLowerCase().includes(q) || (p.description ?? "").toLowerCase().includes(q);
        });
    }, [products, search, activeFilter, categoryFilter]);

    function flash(kind: "ok" | "err", msg: string) {
        setToast({ kind, msg });
        setTimeout(() => setToast(null), 3500);
    }

    return (
        <div className="max-w-7xl mx-auto">
            <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-6">
                <div>
                    <h1 className="text-2xl font-bold text-zinc-900">Products</h1>
                    <p className="text-sm text-zinc-500 mt-1">
                        {filtered.length} of {products.length} products
                    </p>
                </div>
                <Link
                    href="/portal/admin/products/new"
                    className="inline-flex items-center gap-2 bg-accent-red hover:bg-accent-red/90 text-white text-sm font-semibold px-4 py-2.5 rounded-xl shadow-sm transition-all"
                >
                    <Plus size={16} />
                    Add Product
                </Link>
            </div>

            {/* Filters */}
            <div className="flex flex-col md:flex-row gap-3 mb-6">
                <div className="relative flex-1">
                    <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
                    <input
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        placeholder="Search by name or description…"
                        className="w-full pl-9 pr-3 py-2.5 text-sm bg-white border border-zinc-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-accent-red/30 focus:border-accent-red"
                    />
                </div>
                <FilterSelect
                    value={activeFilter}
                    onChange={(v) => setActiveFilter(v as "ALL" | "ACTIVE" | "INACTIVE")}
                    options={[
                        { v: "ALL", l: "All visibility" },
                        { v: "ACTIVE", l: "Active" },
                        { v: "INACTIVE", l: "Inactive" },
                    ]}
                />
                {categories.length > 0 && (
                    <FilterSelect
                        value={categoryFilter}
                        onChange={(v) => setCategoryFilter(v)}
                        options={[
                            { v: "ALL", l: "All categories" },
                            ...categories.map((c) => ({ v: c, l: c })),
                        ]}
                    />
                )}
            </div>

            {/* Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {filtered.map((p) => (
                    <ProductCard
                        key={p.id}
                        product={p}
                        sold={soldByProduct[p.id] ?? 0}
                        onFlash={flash}
                    />
                ))}
                {filtered.length === 0 && (
                    <div className="col-span-full py-16 text-center text-sm text-zinc-400 bg-white border border-zinc-100 rounded-2xl">
                        No products match the current filters.
                    </div>
                )}
            </div>

            {toast && (
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={`fixed bottom-6 right-6 z-50 flex items-center gap-2 px-4 py-3 rounded-xl shadow-lg text-sm font-medium ${
                        toast.kind === "ok" ? "bg-emerald-600 text-white" : "bg-red-600 text-white"
                    }`}
                >
                    {toast.kind === "ok" ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
                    {toast.msg}
                </motion.div>
            )}
        </div>
    );
}

function FilterSelect({
    value, onChange, options,
}: {
    value: string;
    onChange: (v: string) => void;
    options: { v: string; l: string }[];
}) {
    return (
        <div className="relative">
            <select
                value={value}
                onChange={(e) => onChange(e.target.value)}
                className="appearance-none pl-3 pr-9 py-2.5 text-sm bg-white border border-zinc-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-accent-red/30 focus:border-accent-red min-w-[170px]"
            >
                {options.map((o) => <option key={o.v} value={o.v}>{o.l}</option>)}
            </select>
            <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 pointer-events-none" />
        </div>
    );
}

function ProductCard({
    product, sold, onFlash,
}: {
    product: Product;
    sold: number;
    onFlash: (k: "ok" | "err", m: string) => void;
}) {
    const [isPending, startTransition] = useTransition();

    function toggleActive() {
        const fd = new FormData();
        fd.set("id", product.id);
        fd.set("isActive", String(!product.isActive));
        startTransition(async () => {
            const res = await toggleProductActiveAction(fd);
            if (res.ok) onFlash("ok", `Product ${product.isActive ? "hidden" : "made active"}.`);
            else onFlash("err", res.error);
        });
    }

    function handleDelete() {
        if (!confirm(`Delete "${product.name}"? This cannot be undone.`)) return;
        const fd = new FormData();
        fd.set("id", product.id);
        startTransition(async () => {
            const res = await deleteProductAction(fd);
            if (res.ok) onFlash("ok", "Product deleted.");
            else onFlash("err", res.error);
        });
    }

    return (
        <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            className={`bg-white border border-zinc-100 rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-all ${
                !product.isActive ? "opacity-70" : ""
            } ${isPending ? "opacity-50" : ""}`}
        >
            <div className="aspect-square bg-zinc-100 relative">
                {product.imageUrl ? (
                    <Image
                        src={product.imageUrl}
                        alt={product.name}
                        fill
                        sizes="(max-width:768px) 100vw, 25vw"
                        className="object-cover"
                    />
                ) : (
                    <div className="absolute inset-0 flex items-center justify-center text-zinc-300">
                        <ImageOff size={32} />
                    </div>
                )}
                {!product.isActive && (
                    <span className="absolute top-2 left-2 text-[10px] font-bold tracking-widest uppercase px-2 py-0.5 rounded-full bg-zinc-900/80 text-white">
                        Hidden
                    </span>
                )}
                {product.category && (
                    <span className="absolute top-2 right-2 text-[10px] font-bold tracking-widest uppercase px-2 py-0.5 rounded-full bg-white/90 text-zinc-700">
                        {product.category}
                    </span>
                )}
            </div>

            <div className="p-4">
                <h3 className="font-bold text-zinc-900 text-sm line-clamp-1">{product.name}</h3>
                {product.description && (
                    <p className="text-xs text-zinc-500 mt-1 line-clamp-2">{product.description}</p>
                )}

                <div className="flex items-end justify-between mt-3">
                    <div>
                        <p className="text-lg font-bold text-zinc-900">৳{product.price.toLocaleString()}</p>
                        <p className="text-[11px] text-zinc-500">
                            Stock: <span className="font-medium text-zinc-700">{product.stock}</span>
                            {sold > 0 && <> · <span className="text-zinc-700">{sold} sold</span></>}
                        </p>
                        {product.memberDiscountPercent > 0 && (
                            <p className="text-[11px] font-semibold text-emerald-700 mt-0.5">
                                Member discount: {product.memberDiscountPercent}%
                            </p>
                        )}
                    </div>
                </div>

                <div className="flex items-center gap-2 mt-4 pt-3 border-t border-zinc-100">
                    <Link
                        href={`/portal/admin/products/${product.id}/edit`}
                        className="flex-1 inline-flex items-center justify-center gap-1.5 text-xs font-semibold text-zinc-700 hover:text-zinc-900 hover:bg-zinc-100 px-2 py-1.5 rounded-lg transition-colors"
                    >
                        <Pencil size={12} /> Edit
                    </Link>
                    <button
                        onClick={toggleActive}
                        disabled={isPending}
                        className="inline-flex items-center justify-center gap-1.5 text-xs font-semibold text-zinc-700 hover:text-zinc-900 hover:bg-zinc-100 px-2 py-1.5 rounded-lg transition-colors"
                    >
                        {product.isActive ? <ToggleRight size={14} /> : <ToggleLeft size={14} />}
                    </button>
                    <button
                        onClick={handleDelete}
                        disabled={isPending}
                        className="inline-flex items-center justify-center text-xs font-semibold text-red-600 hover:text-red-800 hover:bg-red-50 px-2 py-1.5 rounded-lg transition-colors"
                    >
                        <Trash2 size={12} />
                    </button>
                </div>
            </div>
        </motion.div>
    );
}
