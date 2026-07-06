"use client";

import { useMemo, useState, useTransition } from "react";
import Image from "next/image";
import { motion } from "motion/react";
import {
    Package, Plus, Search, X, Pencil, Trash2, ImageOff,
    ToggleRight, ToggleLeft, AlertCircle, CheckCircle2, ChevronDown,
} from "lucide-react";
import {
    createProductAction,
    updateProductAction,
    deleteProductAction,
    toggleProductActiveAction,
} from "@/app/actions/admin-products";
import ProductImageUploader from "@/components/portal/admin/product-image-uploader";

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
    const [editing, setEditing] = useState<Product | null>(null);
    const [creating, setCreating] = useState(false);
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
                <button
                    onClick={() => setCreating(true)}
                    className="inline-flex items-center gap-2 bg-accent-red hover:bg-accent-red/90 text-white text-sm font-semibold px-4 py-2.5 rounded-xl shadow-sm transition-all"
                >
                    <Plus size={16} />
                    Add Product
                </button>
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
                        onEdit={() => setEditing(p)}
                        onFlash={flash}
                    />
                ))}
                {filtered.length === 0 && (
                    <div className="col-span-full py-16 text-center text-sm text-zinc-400 bg-white border border-zinc-100 rounded-2xl">
                        No products match the current filters.
                    </div>
                )}
            </div>

            {(creating || editing) && (
                <ProductFormModal
                    product={editing}
                    onClose={() => { setCreating(false); setEditing(null); }}
                    onFlash={flash}
                />
            )}

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
    product, sold, onEdit, onFlash,
}: {
    product: Product;
    sold: number;
    onEdit: () => void;
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
                    </div>
                </div>

                <div className="flex items-center gap-2 mt-4 pt-3 border-t border-zinc-100">
                    <button
                        onClick={onEdit}
                        className="flex-1 inline-flex items-center justify-center gap-1.5 text-xs font-semibold text-zinc-700 hover:text-zinc-900 hover:bg-zinc-100 px-2 py-1.5 rounded-lg transition-colors"
                    >
                        <Pencil size={12} /> Edit
                    </button>
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

function ProductFormModal({
    product, onClose, onFlash,
}: {
    product: Product | null;
    onClose: () => void;
    onFlash: (k: "ok" | "err", m: string) => void;
}) {
    const [isPending, startTransition] = useTransition();
    const isEdit = !!product;

    const [form, setForm] = useState({
        name: product?.name ?? "",
        description: product?.description ?? "",
        price: product ? String(product.price) : "",
        stock: product ? String(product.stock) : "0",
        imageUrl: product?.imageUrl ?? "",
        category: product?.category ?? "",
        isActive: product?.isActive ?? true,
        hasSizes: product?.hasSizes ?? false,
        sizes: product?.sizes?.join(", ") ?? "",
    });

    function submit(e: React.FormEvent) {
        e.preventDefault();
        const fd = new FormData();
        if (product) fd.set("id", product.id);
        fd.set("name", form.name);
        fd.set("description", form.description);
        fd.set("price", form.price);
        fd.set("stock", form.stock);
        fd.set("imageUrl", form.imageUrl);
        fd.set("category", form.category);
        if (form.isActive) fd.set("isActive", "true");
        if (form.hasSizes) fd.set("hasSizes", "true");
        fd.set("sizes", form.sizes);

        startTransition(async () => {
            const res = isEdit ? await updateProductAction(fd) : await createProductAction(fd);
            if (res.ok) {
                onFlash("ok", isEdit ? "Product updated." : "Product created.");
                onClose();
            } else {
                onFlash("err", res.error);
            }
        });
    }

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm overflow-y-auto" onClick={onClose}>
            <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                onClick={(e) => e.stopPropagation()}
                className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden my-8"
            >
                <div className="px-6 py-5 border-b border-zinc-100 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-accent-red/10 rounded-xl">
                            <Package size={18} className="text-accent-red" />
                        </div>
                        <h2 className="text-lg font-bold text-zinc-900">
                            {isEdit ? "Edit product" : "New product"}
                        </h2>
                    </div>
                    <button onClick={onClose} className="p-1.5 rounded-lg text-zinc-400 hover:bg-zinc-100">
                        <X size={16} />
                    </button>
                </div>

                <form onSubmit={submit} className="p-6 space-y-4">
                    <Field label="Name" required>
                        <input
                            type="text"
                            value={form.name}
                            onChange={(e) => setForm({ ...form, name: e.target.value })}
                            required
                            className={inputCls}
                        />
                    </Field>

                    <Field label="Description">
                        <textarea
                            value={form.description}
                            onChange={(e) => setForm({ ...form, description: e.target.value })}
                            rows={3}
                            className={inputCls}
                        />
                    </Field>

                    <div className="grid grid-cols-2 gap-4">
                        <Field label="Price (BDT)" required>
                            <input
                                type="number"
                                step="0.01"
                                min="0"
                                value={form.price}
                                onChange={(e) => setForm({ ...form, price: e.target.value })}
                                required
                                className={inputCls}
                            />
                        </Field>
                        <Field label="Stock">
                            <input
                                type="number"
                                min="0"
                                value={form.stock}
                                onChange={(e) => setForm({ ...form, stock: e.target.value })}
                                className={inputCls}
                            />
                        </Field>
                    </div>

                    <Field label="Category">
                        <input
                            type="text"
                            value={form.category}
                            onChange={(e) => setForm({ ...form, category: e.target.value })}
                            placeholder="e.g. gear, apparel, equipment"
                            className={inputCls}
                        />
                    </Field>

                    <Field label="Product image">
                        <ProductImageUploader
                            value={form.imageUrl}
                            onChange={(url) => setForm({ ...form, imageUrl: url })}
                        />
                    </Field>

                    <div className="rounded-xl border border-zinc-200 bg-zinc-50/50 p-4 space-y-3">
                        <label className="flex items-center gap-3 cursor-pointer">
                            <input
                                type="checkbox"
                                checked={form.hasSizes}
                                onChange={(e) =>
                                    setForm({ ...form, hasSizes: e.target.checked })
                                }
                                className="w-4 h-4 rounded text-accent-red focus:ring-accent-red"
                            />
                            <span className="text-sm font-medium text-zinc-700">
                                This product has sizes
                            </span>
                        </label>
                        {form.hasSizes && (
                            <div>
                                <label className="text-xs font-semibold text-zinc-600 uppercase tracking-widest">
                                    Available sizes
                                </label>
                                <input
                                    type="text"
                                    value={form.sizes}
                                    onChange={(e) =>
                                        setForm({ ...form, sizes: e.target.value })
                                    }
                                    placeholder="e.g. S, M, L, XL"
                                    className={inputCls + " mt-1"}
                                />
                                <p className="text-[11px] text-zinc-500 mt-1.5">
                                    Comma-separated labels. Customers must pick one
                                    before adding to cart.
                                </p>
                            </div>
                        )}
                    </div>

                    <label className="flex items-center gap-3 cursor-pointer">
                        <input
                            type="checkbox"
                            checked={form.isActive}
                            onChange={(e) => setForm({ ...form, isActive: e.target.checked })}
                            className="w-4 h-4 rounded text-accent-red focus:ring-accent-red"
                        />
                        <span className="text-sm font-medium text-zinc-700">Visible in the shop</span>
                    </label>

                    <div className="flex items-center gap-3 pt-2">
                        <button
                            type="button"
                            onClick={onClose}
                            className="flex-1 px-4 py-2.5 text-sm font-semibold text-zinc-700 hover:bg-zinc-100 rounded-xl transition-colors"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={isPending}
                            className="flex-1 px-4 py-2.5 text-sm font-semibold text-white bg-accent-red hover:bg-accent-red/90 disabled:opacity-50 rounded-xl transition-colors"
                        >
                            {isPending ? "Saving…" : isEdit ? "Save changes" : "Create product"}
                        </button>
                    </div>
                </form>
            </motion.div>
        </div>
    );
}

const inputCls = "w-full px-3 py-2.5 text-sm bg-zinc-50 border border-zinc-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-accent-red/30 focus:border-accent-red focus:bg-white";

function Field({ label, children, required }: { label: string; children: React.ReactNode; required?: boolean }) {
    return (
        <div>
            <label className="block text-xs font-bold tracking-widest uppercase text-zinc-500 mb-2">
                {label}{required && <span className="text-accent-red ml-1">*</span>}
            </label>
            {children}
        </div>
    );
}
