"use client";

import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import Image from "next/image";
import { motion } from "motion/react";
import {
    Boxes,
    CheckCircle2,
    ImageOff,
    Minus,
    Package,
    PackagePlus,
    Plus,
    Receipt,
    Search,
    ShoppingCart,
    Trash2,
    X,
    AlertCircle,
    Pencil,
    Eye,
} from "lucide-react";
import DojoPageHeader from "@/components/dojo/page-header";
import { ROLE_LABEL, hasAtLeast, type DojoRole } from "@/lib/dojo-roles";
import {
    stockProductAction,
    adjustInventoryAction,
    setInventoryPriceAction,
    removeInventoryAction,
    recordSaleAction,
} from "@/app/actions/dojo-shop";

type CatalogProduct = {
    id: string;
    name: string;
    description: string | null;
    price: number;
    stock: number;
    imageUrl: string | null;
    category: string | null;
};

type InventoryRow = {
    id: string;
    quantityOnHand: number;
    unitPrice: number;
    updatedAt: string;
    product: {
        id: string;
        name: string;
        description: string | null;
        imageUrl: string | null;
        category: string | null;
        price: number;
    };
};

type StudentOption = {
    id: string;
    fullName: string;
    currentRank: string;
    memberNumber: string | null;
};

type RecentSale = {
    id: string;
    receiptNo: string;
    buyerName: string;
    total: number;
    createdAt: string;
    member: { id: string; fullName: string } | null;
    items: { id: string; productName: string; quantity: number }[];
};

type Tab = "inventory" | "catalog" | "receipts";
type Toast = { kind: "ok" | "err"; msg: string };

export default function DojoShopClient({
    dojo,
    sellerRole,
    catalog,
    inventory,
    students,
    recentSales,
}: {
    dojo: { id: string; name: string };
    sellerRole: DojoRole;
    catalog: CatalogProduct[];
    inventory: InventoryRow[];
    students: StudentOption[];
    recentSales: RecentSale[];
}) {
    const [tab, setTab] = useState<Tab>("inventory");
    const [toast, setToast] = useState<Toast | null>(null);

    // Modal state
    const [stockProduct, setStockProduct] = useState<CatalogProduct | null>(null);
    const [editingItem, setEditingItem] = useState<InventoryRow | null>(null);
    const [sellingFrom, setSellingFrom] = useState<InventoryRow | null>(null);
    const [opensCartFor, setOpensCartFor] = useState(false);

    const canManage = hasAtLeast(sellerRole, "DOJO_MANAGER");

    function flash(kind: Toast["kind"], msg: string) {
        setToast({ kind, msg });
        setTimeout(() => setToast(null), 3500);
    }

    const inventoryByProduct = useMemo(
        () => new Map(inventory.map((i) => [i.product.id, i] as const)),
        [inventory]
    );

    const totalStock = inventory.reduce((acc, i) => acc + i.quantityOnHand, 0);
    const totalSkus = inventory.length;
    const todayCount = recentSales.filter(
        (s) =>
            new Date(s.createdAt).toDateString() === new Date().toDateString()
    ).length;
    const todayRevenue = recentSales
        .filter((s) => new Date(s.createdAt).toDateString() === new Date().toDateString())
        .reduce((acc, s) => acc + s.total, 0);

    return (
        <>
            <DojoPageHeader
                eyebrow={ROLE_LABEL[sellerRole]}
                title="Shop & inventory"
                description={`Stock JKA merchandise for ${dojo.name} and issue receipts when you hand items to your students.`}
                actions={
                    <button
                        type="button"
                        onClick={() => setOpensCartFor(true)}
                        disabled={inventory.length === 0}
                        className="inline-flex items-center gap-2 bg-accent-red text-white px-4 py-2.5 text-xs font-bold tracking-widest uppercase hover:bg-accent-red/90 disabled:opacity-40 disabled:cursor-not-allowed transition-colors rounded-sm"
                    >
                        <ShoppingCart size={14} />
                        New sale
                    </button>
                }
            />

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                <StatCard icon={<Boxes size={14} />} label="SKUs in stock" value={String(totalSkus)} />
                <StatCard icon={<Package size={14} />} label="Units on hand" value={String(totalStock)} />
                <StatCard icon={<Receipt size={14} />} label="Sales today" value={String(todayCount)} />
                <StatCard
                    icon={<Receipt size={14} />}
                    label="Today's revenue"
                    value={`৳ ${todayRevenue.toLocaleString()}`}
                />
            </div>

            <div className="border-b border-zinc-200 mb-6">
                <nav className="flex gap-1">
                    <TabBtn current={tab} value="inventory" onClick={setTab}>
                        Inventory ({inventory.length})
                    </TabBtn>
                    <TabBtn current={tab} value="catalog" onClick={setTab}>
                        JKA catalog ({catalog.length})
                    </TabBtn>
                    <TabBtn current={tab} value="receipts" onClick={setTab}>
                        Receipts ({recentSales.length})
                    </TabBtn>
                </nav>
            </div>

            {tab === "inventory" && (
                <InventoryTab
                    inventory={inventory}
                    canManage={canManage}
                    onSellFrom={(r) => setSellingFrom(r)}
                    onEdit={(r) => setEditingItem(r)}
                    onFlash={flash}
                />
            )}
            {tab === "catalog" && (
                <CatalogTab
                    catalog={catalog}
                    inventoryByProduct={inventoryByProduct}
                    canManage={canManage}
                    onStock={(p) => setStockProduct(p)}
                />
            )}
            {tab === "receipts" && <ReceiptsTab sales={recentSales} />}

            {stockProduct && (
                <StockProductModal
                    product={stockProduct}
                    existing={inventoryByProduct.get(stockProduct.id) ?? null}
                    onClose={() => setStockProduct(null)}
                    onFlash={flash}
                />
            )}
            {editingItem && (
                <EditInventoryModal
                    item={editingItem}
                    onClose={() => setEditingItem(null)}
                    onFlash={flash}
                />
            )}
            {(opensCartFor || sellingFrom) && (
                <SellModal
                    inventory={inventory}
                    students={students}
                    initialItem={sellingFrom}
                    onClose={() => {
                        setOpensCartFor(false);
                        setSellingFrom(null);
                    }}
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
        </>
    );
}

function StatCard({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
    return (
        <div className="bg-white border border-zinc-200 rounded-sm shadow-sm p-4">
            <div className="flex items-center gap-2 text-zinc-500 mb-1">
                {icon}
                <span className="text-[10px] tracking-widest uppercase font-bold">{label}</span>
            </div>
            <p className="font-karate text-2xl font-bold text-zinc-900">{value}</p>
        </div>
    );
}

function TabBtn({
    current,
    value,
    onClick,
    children,
}: {
    current: Tab;
    value: Tab;
    onClick: (v: Tab) => void;
    children: React.ReactNode;
}) {
    const active = current === value;
    return (
        <button
            type="button"
            onClick={() => onClick(value)}
            className={`px-4 py-3 text-xs font-bold tracking-widest uppercase border-b-2 transition-colors -mb-px ${
                active
                    ? "text-accent-red border-accent-red"
                    : "text-zinc-500 border-transparent hover:text-zinc-800"
            }`}
        >
            {children}
        </button>
    );
}

// ──────────────────────────────────────────────────────────────────
// INVENTORY TAB
// ──────────────────────────────────────────────────────────────────

function InventoryTab({
    inventory,
    canManage,
    onSellFrom,
    onEdit,
    onFlash,
}: {
    inventory: InventoryRow[];
    canManage: boolean;
    onSellFrom: (r: InventoryRow) => void;
    onEdit: (r: InventoryRow) => void;
    onFlash: (k: Toast["kind"], m: string) => void;
}) {
    if (inventory.length === 0) {
        return (
            <div className="bg-white border border-dashed border-zinc-300 rounded-sm p-12 text-center">
                <Boxes className="mx-auto text-zinc-300 mb-3" size={32} />
                <p className="font-semibold text-zinc-700">Your inventory is empty.</p>
                <p className="text-sm text-zinc-500 mt-1">
                    Switch to the JKA catalog tab to stock up on merchandise.
                </p>
            </div>
        );
    }

    return (
        <div className="bg-white border border-zinc-200 rounded-sm shadow-sm overflow-x-auto">
            <table className="w-full text-sm min-w-[720px]">
                <thead>
                    <tr className="text-left text-[10px] tracking-widest uppercase font-bold text-zinc-400 border-b border-zinc-200">
                        <th className="px-5 py-3">Product</th>
                        <th className="px-5 py-3">Your price</th>
                        <th className="px-5 py-3 text-center">On hand</th>
                        <th className="px-5 py-3 text-right">Actions</th>
                    </tr>
                </thead>
                <tbody>
                    {inventory.map((row) => (
                        <InventoryRowView
                            key={row.id}
                            row={row}
                            canManage={canManage}
                            onSell={() => onSellFrom(row)}
                            onEdit={() => onEdit(row)}
                            onFlash={onFlash}
                        />
                    ))}
                </tbody>
            </table>
        </div>
    );
}

function InventoryRowView({
    row,
    canManage,
    onSell,
    onEdit,
    onFlash,
}: {
    row: InventoryRow;
    canManage: boolean;
    onSell: () => void;
    onEdit: () => void;
    onFlash: (k: Toast["kind"], m: string) => void;
}) {
    const [isPending, startTransition] = useTransition();
    const low = row.quantityOnHand < 5;
    const out = row.quantityOnHand === 0;

    function remove() {
        if (row.quantityOnHand > 0) {
            onFlash("err", "Reduce stock to 0 before removing.");
            return;
        }
        if (!confirm(`Remove ${row.product.name} from your inventory?`)) return;
        const fd = new FormData();
        fd.set("itemId", row.id);
        startTransition(async () => {
            const res = await removeInventoryAction(fd);
            if (res.ok) onFlash("ok", "Removed from inventory.");
            else onFlash("err", res.error);
        });
    }

    return (
        <tr className={`border-b border-zinc-100 hover:bg-zinc-50 ${isPending ? "opacity-50" : ""}`}>
            <td className="px-5 py-3">
                <div className="flex items-center gap-3">
                    <ProductThumb src={row.product.imageUrl} alt={row.product.name} />
                    <div>
                        <p className="font-semibold text-zinc-900">{row.product.name}</p>
                        {row.product.category && (
                            <p className="text-[10px] tracking-widest uppercase text-zinc-400 font-bold mt-0.5">
                                {row.product.category}
                            </p>
                        )}
                    </div>
                </div>
            </td>
            <td className="px-5 py-3 font-mono text-zinc-700">
                ৳ {row.unitPrice.toLocaleString()}
                {row.unitPrice !== row.product.price && (
                    <span className="block text-[10px] text-zinc-400">
                        JKA ৳ {row.product.price.toLocaleString()}
                    </span>
                )}
            </td>
            <td className="px-5 py-3 text-center">
                <span
                    className={`font-mono font-bold ${
                        out ? "text-red-600" : low ? "text-amber-600" : "text-zinc-900"
                    }`}
                >
                    {row.quantityOnHand}
                </span>
            </td>
            <td className="px-5 py-3">
                <div className="flex items-center gap-1 justify-end">
                    <button
                        type="button"
                        onClick={onSell}
                        disabled={out}
                        className="inline-flex items-center gap-1 text-xs font-semibold text-white bg-accent-red hover:bg-accent-red/90 disabled:opacity-40 disabled:cursor-not-allowed px-3 py-1.5 rounded-sm"
                    >
                        <ShoppingCart size={12} />
                        Sell
                    </button>
                    {canManage && (
                        <>
                            <button
                                type="button"
                                onClick={onEdit}
                                className="p-1.5 text-zinc-500 hover:text-zinc-800 hover:bg-zinc-100 rounded-sm"
                                title="Adjust stock or price"
                            >
                                <Pencil size={14} />
                            </button>
                            <button
                                type="button"
                                onClick={remove}
                                disabled={isPending}
                                className="p-1.5 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-sm disabled:opacity-50"
                                title="Remove from inventory"
                            >
                                <Trash2 size={14} />
                            </button>
                        </>
                    )}
                </div>
            </td>
        </tr>
    );
}

// ──────────────────────────────────────────────────────────────────
// CATALOG TAB
// ──────────────────────────────────────────────────────────────────

function CatalogTab({
    catalog,
    inventoryByProduct,
    canManage,
    onStock,
}: {
    catalog: CatalogProduct[];
    inventoryByProduct: Map<string, InventoryRow>;
    canManage: boolean;
    onStock: (p: CatalogProduct) => void;
}) {
    const [search, setSearch] = useState("");
    const [category, setCategory] = useState<"ALL" | string>("ALL");

    const categories = useMemo(() => {
        const s = new Set<string>();
        catalog.forEach((p) => p.category && s.add(p.category));
        return Array.from(s).sort();
    }, [catalog]);

    const filtered = useMemo(() => {
        const q = search.trim().toLowerCase();
        return catalog.filter((p) => {
            if (category !== "ALL" && p.category !== category) return false;
            if (!q) return true;
            return (
                p.name.toLowerCase().includes(q) ||
                (p.description ?? "").toLowerCase().includes(q)
            );
        });
    }, [catalog, search, category]);

    if (catalog.length === 0) {
        return (
            <div className="bg-white border border-dashed border-zinc-300 rounded-sm p-12 text-center text-sm text-zinc-500">
                The JKA federation has not uploaded any products yet.
            </div>
        );
    }

    return (
        <>
            <div className="flex flex-col md:flex-row gap-3 mb-4">
                <div className="relative flex-1">
                    <Search
                        size={14}
                        className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400"
                    />
                    <input
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        placeholder="Search catalog…"
                        className="w-full pl-9 pr-3 py-2 text-sm bg-white border border-zinc-200 rounded-sm focus:outline-none focus:ring-2 focus:ring-accent-red/30 focus:border-accent-red"
                    />
                </div>
                {categories.length > 0 && (
                    <select
                        value={category}
                        onChange={(e) => setCategory(e.target.value)}
                        className="px-3 py-2 text-sm bg-white border border-zinc-200 rounded-sm focus:outline-none focus:ring-2 focus:ring-accent-red/30"
                    >
                        <option value="ALL">All categories</option>
                        {categories.map((c) => (
                            <option key={c} value={c}>
                                {c}
                            </option>
                        ))}
                    </select>
                )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {filtered.map((p) => {
                    const inStock = inventoryByProduct.get(p.id);
                    return (
                        <div
                            key={p.id}
                            className="bg-white border border-zinc-200 rounded-sm shadow-sm overflow-hidden flex flex-col"
                        >
                            <div className="aspect-square bg-zinc-100 relative">
                                {p.imageUrl ? (
                                    <Image
                                        src={p.imageUrl}
                                        alt={p.name}
                                        fill
                                        sizes="(max-width: 768px) 50vw, 25vw"
                                        className="object-cover"
                                    />
                                ) : (
                                    <div className="absolute inset-0 flex items-center justify-center text-zinc-300">
                                        <ImageOff size={32} />
                                    </div>
                                )}
                                {p.category && (
                                    <span className="absolute top-2 left-2 text-[10px] font-bold tracking-widest uppercase px-2 py-0.5 rounded-sm bg-white/90 text-zinc-700">
                                        {p.category}
                                    </span>
                                )}
                                {inStock && (
                                    <span className="absolute top-2 right-2 text-[10px] font-bold tracking-widest uppercase px-2 py-0.5 rounded-sm bg-emerald-600 text-white">
                                        In stock · {inStock.quantityOnHand}
                                    </span>
                                )}
                            </div>
                            <div className="p-4 flex-1 flex flex-col">
                                <h3 className="font-semibold text-sm text-zinc-900 line-clamp-1">
                                    {p.name}
                                </h3>
                                {p.description && (
                                    <p className="text-xs text-zinc-500 mt-1 line-clamp-2">
                                        {p.description}
                                    </p>
                                )}
                                <div className="mt-3 flex items-center justify-between">
                                    <p className="font-mono font-bold text-zinc-900">
                                        ৳ {p.price.toLocaleString()}
                                    </p>
                                    <button
                                        type="button"
                                        onClick={() => onStock(p)}
                                        disabled={!canManage}
                                        className="inline-flex items-center gap-1 text-xs font-semibold text-accent-red hover:text-accent-red/80 disabled:opacity-30 disabled:cursor-not-allowed"
                                        title={
                                            canManage
                                                ? undefined
                                                : "Only the dojo manager / owner can stock products."
                                        }
                                    >
                                        <PackagePlus size={14} />
                                        {inStock ? "Add more" : "Stock this"}
                                    </button>
                                </div>
                            </div>
                        </div>
                    );
                })}
                {filtered.length === 0 && (
                    <div className="col-span-full py-12 text-center text-sm text-zinc-400 bg-white border border-zinc-200 rounded-sm">
                        No products match those filters.
                    </div>
                )}
            </div>
        </>
    );
}

// ──────────────────────────────────────────────────────────────────
// RECEIPTS TAB
// ──────────────────────────────────────────────────────────────────

function ReceiptsTab({ sales }: { sales: RecentSale[] }) {
    if (sales.length === 0) {
        return (
            <div className="bg-white border border-dashed border-zinc-300 rounded-sm p-12 text-center">
                <Receipt className="mx-auto text-zinc-300 mb-3" size={32} />
                <p className="font-semibold text-zinc-700">No receipts yet.</p>
                <p className="text-sm text-zinc-500 mt-1">
                    Sales you record show up here and on the buyer&rsquo;s portal.
                </p>
            </div>
        );
    }

    return (
        <div className="bg-white border border-zinc-200 rounded-sm shadow-sm overflow-x-auto">
            <table className="w-full text-sm min-w-[640px]">
                <thead>
                    <tr className="text-left text-[10px] tracking-widest uppercase font-bold text-zinc-400 border-b border-zinc-200">
                        <th className="px-5 py-3">Receipt</th>
                        <th className="px-5 py-3">Buyer</th>
                        <th className="px-5 py-3">Items</th>
                        <th className="px-5 py-3">Date</th>
                        <th className="px-5 py-3 text-right">Total</th>
                        <th className="px-5 py-3"></th>
                    </tr>
                </thead>
                <tbody>
                    {sales.map((s) => (
                        <tr key={s.id} className="border-b border-zinc-100 hover:bg-zinc-50">
                            <td className="px-5 py-3 font-mono text-xs text-zinc-700">
                                {s.receiptNo}
                            </td>
                            <td className="px-5 py-3">
                                <p className="font-semibold text-zinc-900">{s.buyerName}</p>
                                {s.member && (
                                    <p className="text-[10px] tracking-widest uppercase text-zinc-400 font-bold mt-0.5">
                                        Member
                                    </p>
                                )}
                            </td>
                            <td className="px-5 py-3 text-xs text-zinc-500">
                                {s.items
                                    .map((i) => `${i.productName} ×${i.quantity}`)
                                    .join(", ")}
                            </td>
                            <td className="px-5 py-3 text-xs text-zinc-500">
                                {new Date(s.createdAt).toLocaleString(undefined, {
                                    month: "short",
                                    day: "numeric",
                                    hour: "2-digit",
                                    minute: "2-digit",
                                })}
                            </td>
                            <td className="px-5 py-3 text-right font-mono font-bold text-zinc-900">
                                ৳ {s.total.toLocaleString()}
                            </td>
                            <td className="px-5 py-3">
                                <Link
                                    href={`/portal/dojo/shop/receipts/${s.id}`}
                                    className="inline-flex items-center gap-1 text-xs font-semibold text-accent-red hover:text-accent-red/80"
                                >
                                    <Eye size={12} />
                                    View
                                </Link>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}

// ──────────────────────────────────────────────────────────────────
// STOCK MODAL — add inventory from a JKA catalog product
// ──────────────────────────────────────────────────────────────────

function StockProductModal({
    product,
    existing,
    onClose,
    onFlash,
}: {
    product: CatalogProduct;
    existing: InventoryRow | null;
    onClose: () => void;
    onFlash: (k: Toast["kind"], m: string) => void;
}) {
    const [quantity, setQuantity] = useState("1");
    const [unitPrice, setUnitPrice] = useState(
        existing ? String(existing.unitPrice) : String(product.price)
    );
    const [isPending, startTransition] = useTransition();

    function submit(e: React.FormEvent) {
        e.preventDefault();
        const fd = new FormData();
        fd.set("productId", product.id);
        fd.set("quantity", quantity);
        if (unitPrice.trim() !== "") fd.set("unitPrice", unitPrice);
        startTransition(async () => {
            const res = await stockProductAction(fd);
            if (res.ok) {
                onFlash(
                    "ok",
                    existing ? "Added to your inventory." : "Product stocked."
                );
                onClose();
            } else {
                onFlash("err", res.error);
            }
        });
    }

    return (
        <Modal onClose={onClose} title={existing ? "Add more stock" : "Stock this product"}>
            <form onSubmit={submit} className="p-6 space-y-4">
                <div className="flex items-center gap-3 p-3 bg-zinc-50 rounded-sm">
                    <ProductThumb src={product.imageUrl} alt={product.name} />
                    <div>
                        <p className="font-semibold text-zinc-900">{product.name}</p>
                        <p className="text-xs text-zinc-500">
                            JKA price ৳ {product.price.toLocaleString()}
                            {existing && (
                                <> · on hand {existing.quantityOnHand}</>
                            )}
                        </p>
                    </div>
                </div>

                <Field label="Quantity to add" required>
                    <input
                        type="number"
                        min="1"
                        value={quantity}
                        onChange={(e) => setQuantity(e.target.value)}
                        required
                        className={inputCls}
                    />
                </Field>

                <Field
                    label="Selling price at your dojo (BDT)"
                    hint="Defaults to the JKA price. Change if your dojo charges a different amount."
                >
                    <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={unitPrice}
                        onChange={(e) => setUnitPrice(e.target.value)}
                        className={inputCls}
                    />
                </Field>

                <ModalActions onClose={onClose} pending={isPending} label="Save" />
            </form>
        </Modal>
    );
}

// ──────────────────────────────────────────────────────────────────
// EDIT INVENTORY MODAL — adjust qty / price
// ──────────────────────────────────────────────────────────────────

function EditInventoryModal({
    item,
    onClose,
    onFlash,
}: {
    item: InventoryRow;
    onClose: () => void;
    onFlash: (k: Toast["kind"], m: string) => void;
}) {
    const [delta, setDelta] = useState("0");
    const [unitPrice, setUnitPrice] = useState(String(item.unitPrice));
    const [isPending, startTransition] = useTransition();

    function submit(e: React.FormEvent) {
        e.preventDefault();
        const deltaN = Number(delta);
        const priceN = Number(unitPrice);
        startTransition(async () => {
            if (Number.isFinite(deltaN) && deltaN !== 0) {
                const fd = new FormData();
                fd.set("itemId", item.id);
                fd.set("delta", String(deltaN));
                const res = await adjustInventoryAction(fd);
                if (!res.ok) {
                    onFlash("err", res.error);
                    return;
                }
            }
            if (Number.isFinite(priceN) && priceN !== item.unitPrice) {
                const fd = new FormData();
                fd.set("itemId", item.id);
                fd.set("unitPrice", String(priceN));
                const res = await setInventoryPriceAction(fd);
                if (!res.ok) {
                    onFlash("err", res.error);
                    return;
                }
            }
            onFlash("ok", "Inventory updated.");
            onClose();
        });
    }

    return (
        <Modal onClose={onClose} title={item.product.name}>
            <form onSubmit={submit} className="p-6 space-y-4">
                <Field
                    label="Adjust on-hand count"
                    hint={`Currently ${item.quantityOnHand}. Use a negative number to reduce.`}
                >
                    <div className="flex items-center gap-2">
                        <button
                            type="button"
                            onClick={() => setDelta(String((Number(delta) || 0) - 1))}
                            className="p-2 bg-zinc-100 hover:bg-zinc-200 rounded-sm"
                        >
                            <Minus size={14} />
                        </button>
                        <input
                            type="number"
                            value={delta}
                            onChange={(e) => setDelta(e.target.value)}
                            className={`${inputCls} text-center font-mono`}
                        />
                        <button
                            type="button"
                            onClick={() => setDelta(String((Number(delta) || 0) + 1))}
                            className="p-2 bg-zinc-100 hover:bg-zinc-200 rounded-sm"
                        >
                            <Plus size={14} />
                        </button>
                    </div>
                </Field>

                <Field label="Selling price (BDT)">
                    <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={unitPrice}
                        onChange={(e) => setUnitPrice(e.target.value)}
                        className={inputCls}
                    />
                </Field>

                <ModalActions onClose={onClose} pending={isPending} label="Save" />
            </form>
        </Modal>
    );
}

// ──────────────────────────────────────────────────────────────────
// SELL MODAL — multi-item cart + member picker, generates a receipt
// ──────────────────────────────────────────────────────────────────

type CartLine = { productId: string; quantity: number };

function SellModal({
    inventory,
    students,
    initialItem,
    onClose,
    onFlash,
}: {
    inventory: InventoryRow[];
    students: StudentOption[];
    initialItem: InventoryRow | null;
    onClose: () => void;
    onFlash: (k: Toast["kind"], m: string) => void;
}) {
    const [memberId, setMemberId] = useState<string>("");
    const [guestName, setGuestName] = useState("");
    const [memberSearch, setMemberSearch] = useState("");
    const [paymentMethod, setPaymentMethod] = useState("Cash");
    const [discount, setDiscount] = useState("0");
    const [notes, setNotes] = useState("");
    const [lines, setLines] = useState<CartLine[]>(
        initialItem
            ? [{ productId: initialItem.product.id, quantity: 1 }]
            : []
    );
    const [isPending, startTransition] = useTransition();

    const inventoryById = useMemo(
        () => new Map(inventory.map((i) => [i.product.id, i] as const)),
        [inventory]
    );

    const filteredStudents = useMemo(() => {
        const q = memberSearch.trim().toLowerCase();
        if (!q) return students.slice(0, 8);
        return students
            .filter(
                (s) =>
                    s.fullName.toLowerCase().includes(q) ||
                    (s.memberNumber ?? "").toLowerCase().includes(q)
            )
            .slice(0, 8);
    }, [students, memberSearch]);

    const selectedMember = students.find((s) => s.id === memberId);

    const subtotal = lines.reduce((acc, l) => {
        const row = inventoryById.get(l.productId);
        if (!row) return acc;
        return acc + Number(row.unitPrice) * l.quantity;
    }, 0);
    const discountN = Math.max(0, Math.min(Number(discount) || 0, subtotal));
    const total = subtotal - discountN;

    function addLine(productId: string) {
        setLines((prev) => {
            const existing = prev.find((l) => l.productId === productId);
            if (existing) {
                const inv = inventoryById.get(productId);
                if (inv && existing.quantity >= inv.quantityOnHand) return prev;
                return prev.map((l) =>
                    l.productId === productId ? { ...l, quantity: l.quantity + 1 } : l
                );
            }
            return [...prev, { productId, quantity: 1 }];
        });
    }

    function setQty(productId: string, quantity: number) {
        setLines((prev) =>
            quantity <= 0
                ? prev.filter((l) => l.productId !== productId)
                : prev.map((l) =>
                      l.productId === productId ? { ...l, quantity } : l
                  )
        );
    }

    function submit(e: React.FormEvent) {
        e.preventDefault();
        if (lines.length === 0) {
            onFlash("err", "Add at least one item to the cart.");
            return;
        }
        if (!memberId && !guestName.trim()) {
            onFlash("err", "Pick a member or enter a buyer name.");
            return;
        }
        startTransition(async () => {
            const res = await recordSaleAction({
                memberId: memberId || undefined,
                guestName: memberId ? undefined : guestName,
                discount: discountN,
                paymentMethod,
                notes,
                items: lines,
            });
            if (res.ok) {
                onFlash("ok", `Receipt ${res.receiptNo} created.`);
                onClose();
                window.location.href = `/portal/dojo/shop/receipts/${res.saleId}`;
            } else {
                onFlash("err", res.error);
            }
        });
    }

    return (
        <Modal onClose={onClose} title="New sale" wide>
            <form onSubmit={submit} className="p-6 grid md:grid-cols-2 gap-6 max-h-[80vh] overflow-y-auto">
                {/* Left: pick items */}
                <div className="space-y-3">
                    <h3 className="text-xs font-bold tracking-widest uppercase text-zinc-500">
                        Items
                    </h3>
                    <div className="max-h-72 overflow-y-auto border border-zinc-200 rounded-sm divide-y divide-zinc-100">
                        {inventory
                            .filter((i) => i.quantityOnHand > 0)
                            .map((row) => {
                                const inCart = lines.find(
                                    (l) => l.productId === row.product.id
                                );
                                return (
                                    <button
                                        key={row.id}
                                        type="button"
                                        onClick={() => addLine(row.product.id)}
                                        disabled={
                                            inCart
                                                ? inCart.quantity >= row.quantityOnHand
                                                : false
                                        }
                                        className="w-full text-left px-3 py-2.5 hover:bg-zinc-50 disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-between gap-3"
                                    >
                                        <div className="flex items-center gap-3">
                                            <ProductThumb
                                                src={row.product.imageUrl}
                                                alt={row.product.name}
                                                size="sm"
                                            />
                                            <div>
                                                <p className="text-sm font-semibold text-zinc-900">
                                                    {row.product.name}
                                                </p>
                                                <p className="text-[11px] text-zinc-500">
                                                    ৳ {row.unitPrice.toLocaleString()} · {row.quantityOnHand} on hand
                                                </p>
                                            </div>
                                        </div>
                                        <Plus size={14} className="text-accent-red shrink-0" />
                                    </button>
                                );
                            })}
                        {inventory.filter((i) => i.quantityOnHand > 0).length === 0 && (
                            <p className="px-3 py-6 text-sm text-zinc-400 text-center">
                                Nothing in stock.
                            </p>
                        )}
                    </div>

                    {lines.length > 0 && (
                        <div className="border-t border-zinc-200 pt-3">
                            <h3 className="text-xs font-bold tracking-widest uppercase text-zinc-500 mb-2">
                                Cart
                            </h3>
                            <ul className="space-y-2">
                                {lines.map((l) => {
                                    const row = inventoryById.get(l.productId);
                                    if (!row) return null;
                                    return (
                                        <li
                                            key={l.productId}
                                            className="flex items-center gap-2"
                                        >
                                            <div className="flex-1">
                                                <p className="text-sm font-semibold text-zinc-900">
                                                    {row.product.name}
                                                </p>
                                                <p className="text-[11px] text-zinc-500 font-mono">
                                                    ৳ {row.unitPrice.toLocaleString()} ×{" "}
                                                    {l.quantity} = ৳{" "}
                                                    {(
                                                        row.unitPrice * l.quantity
                                                    ).toLocaleString()}
                                                </p>
                                            </div>
                                            <button
                                                type="button"
                                                onClick={() => setQty(l.productId, l.quantity - 1)}
                                                className="p-1 bg-zinc-100 hover:bg-zinc-200 rounded-sm"
                                            >
                                                <Minus size={12} />
                                            </button>
                                            <span className="font-mono text-sm w-6 text-center">
                                                {l.quantity}
                                            </span>
                                            <button
                                                type="button"
                                                onClick={() =>
                                                    setQty(
                                                        l.productId,
                                                        Math.min(
                                                            l.quantity + 1,
                                                            row.quantityOnHand
                                                        )
                                                    )
                                                }
                                                className="p-1 bg-zinc-100 hover:bg-zinc-200 rounded-sm"
                                            >
                                                <Plus size={12} />
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => setQty(l.productId, 0)}
                                                className="p-1 text-red-500 hover:bg-red-50 rounded-sm"
                                            >
                                                <X size={12} />
                                            </button>
                                        </li>
                                    );
                                })}
                            </ul>
                        </div>
                    )}
                </div>

                {/* Right: buyer + totals */}
                <div className="space-y-4">
                    <div>
                        <h3 className="text-xs font-bold tracking-widest uppercase text-zinc-500 mb-2">
                            Buyer
                        </h3>
                        {selectedMember ? (
                            <div className="flex items-center gap-3 p-3 bg-emerald-50 border border-emerald-200 rounded-sm">
                                <div className="flex-1">
                                    <p className="font-semibold text-zinc-900">
                                        {selectedMember.fullName}
                                    </p>
                                    <p className="text-xs text-zinc-500">
                                        {selectedMember.currentRank}
                                        {selectedMember.memberNumber &&
                                            ` · #${selectedMember.memberNumber}`}
                                    </p>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => {
                                        setMemberId("");
                                        setMemberSearch("");
                                    }}
                                    className="p-1 text-zinc-500 hover:bg-zinc-100 rounded-sm"
                                >
                                    <X size={14} />
                                </button>
                            </div>
                        ) : (
                            <>
                                <div className="relative">
                                    <Search
                                        size={14}
                                        className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400"
                                    />
                                    <input
                                        value={memberSearch}
                                        onChange={(e) => setMemberSearch(e.target.value)}
                                        placeholder="Search members…"
                                        className={`${inputCls} pl-9`}
                                    />
                                </div>
                                {memberSearch && (
                                    <ul className="border border-zinc-200 rounded-sm divide-y divide-zinc-100 mt-2 max-h-40 overflow-y-auto">
                                        {filteredStudents.map((s) => (
                                            <li key={s.id}>
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        setMemberId(s.id);
                                                        setGuestName("");
                                                    }}
                                                    className="w-full text-left px-3 py-2 hover:bg-zinc-50"
                                                >
                                                    <p className="text-sm font-semibold text-zinc-900">
                                                        {s.fullName}
                                                    </p>
                                                    <p className="text-[11px] text-zinc-500">
                                                        {s.currentRank}
                                                        {s.memberNumber &&
                                                            ` · #${s.memberNumber}`}
                                                    </p>
                                                </button>
                                            </li>
                                        ))}
                                        {filteredStudents.length === 0 && (
                                            <li className="px-3 py-2 text-xs text-zinc-400">
                                                No matches.
                                            </li>
                                        )}
                                    </ul>
                                )}
                                <p className="text-[11px] text-zinc-400 mt-2 mb-1">
                                    Or sell to a non-member:
                                </p>
                                <input
                                    value={guestName}
                                    onChange={(e) => setGuestName(e.target.value)}
                                    placeholder="Buyer name"
                                    className={inputCls}
                                />
                            </>
                        )}
                    </div>

                    <Field label="Payment method">
                        <select
                            value={paymentMethod}
                            onChange={(e) => setPaymentMethod(e.target.value)}
                            className={inputCls}
                        >
                            <option>Cash</option>
                            <option>bKash</option>
                            <option>Nagad</option>
                            <option>Bank transfer</option>
                            <option>On credit</option>
                        </select>
                    </Field>

                    <Field label="Discount (BDT)">
                        <input
                            type="number"
                            min="0"
                            step="0.01"
                            value={discount}
                            onChange={(e) => setDiscount(e.target.value)}
                            className={inputCls}
                        />
                    </Field>

                    <Field label="Notes (optional)">
                        <textarea
                            value={notes}
                            onChange={(e) => setNotes(e.target.value)}
                            rows={2}
                            className={inputCls}
                        />
                    </Field>

                    <div className="border-t border-zinc-200 pt-3 space-y-1 text-sm">
                        <div className="flex justify-between text-zinc-500">
                            <span>Subtotal</span>
                            <span className="font-mono">
                                ৳ {subtotal.toLocaleString()}
                            </span>
                        </div>
                        {discountN > 0 && (
                            <div className="flex justify-between text-zinc-500">
                                <span>Discount</span>
                                <span className="font-mono">
                                    − ৳ {discountN.toLocaleString()}
                                </span>
                            </div>
                        )}
                        <div className="flex justify-between font-karate text-lg font-bold text-zinc-900">
                            <span>Total</span>
                            <span className="font-mono">
                                ৳ {total.toLocaleString()}
                            </span>
                        </div>
                    </div>

                    <ModalActions
                        onClose={onClose}
                        pending={isPending}
                        label="Record sale & print receipt"
                    />
                </div>
            </form>
        </Modal>
    );
}

// ──────────────────────────────────────────────────────────────────
// Helpers
// ──────────────────────────────────────────────────────────────────

function Modal({
    title,
    children,
    onClose,
    wide,
}: {
    title: string;
    children: React.ReactNode;
    onClose: () => void;
    wide?: boolean;
}) {
    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm overflow-y-auto"
            onClick={onClose}
        >
            <motion.div
                initial={{ opacity: 0, scale: 0.96 }}
                animate={{ opacity: 1, scale: 1 }}
                onClick={(e) => e.stopPropagation()}
                className={`bg-white rounded-sm shadow-2xl w-full ${
                    wide ? "max-w-3xl" : "max-w-md"
                } my-8`}
            >
                <div className="px-5 py-4 border-b border-zinc-200 flex items-center justify-between">
                    <h2 className="text-sm font-bold tracking-widest uppercase text-zinc-700">
                        {title}
                    </h2>
                    <button
                        onClick={onClose}
                        type="button"
                        className="p-1.5 text-zinc-400 hover:bg-zinc-100 rounded-sm"
                    >
                        <X size={16} />
                    </button>
                </div>
                {children}
            </motion.div>
        </div>
    );
}

function ModalActions({
    onClose,
    pending,
    label,
}: {
    onClose: () => void;
    pending: boolean;
    label: string;
}) {
    return (
        <div className="flex items-center gap-3 pt-2">
            <button
                type="button"
                onClick={onClose}
                className="flex-1 px-4 py-2.5 text-xs font-bold tracking-widest uppercase text-zinc-700 hover:bg-zinc-100 rounded-sm"
            >
                Cancel
            </button>
            <button
                type="submit"
                disabled={pending}
                className="flex-1 px-4 py-2.5 text-xs font-bold tracking-widest uppercase text-white bg-accent-red hover:bg-accent-red/90 disabled:opacity-50 rounded-sm"
            >
                {pending ? "Saving…" : label}
            </button>
        </div>
    );
}

function Field({
    label,
    hint,
    required,
    children,
}: {
    label: string;
    hint?: string;
    required?: boolean;
    children: React.ReactNode;
}) {
    return (
        <div>
            <label className="block text-[10px] font-bold tracking-widest uppercase text-zinc-500 mb-2">
                {label}
                {required && <span className="text-accent-red ml-1">*</span>}
            </label>
            {children}
            {hint && <p className="text-[11px] text-zinc-400 mt-1.5">{hint}</p>}
        </div>
    );
}

function ProductThumb({
    src,
    alt,
    size = "md",
}: {
    src: string | null;
    alt: string;
    size?: "sm" | "md";
}) {
    const cls = size === "sm" ? "h-9 w-9" : "h-12 w-12";
    return (
        <div
            className={`${cls} shrink-0 bg-zinc-100 rounded-sm overflow-hidden relative`}
        >
            {src ? (
                <Image src={src} alt={alt} fill sizes="48px" className="object-cover" />
            ) : (
                <div className="absolute inset-0 flex items-center justify-center text-zinc-300">
                    <ImageOff size={16} />
                </div>
            )}
        </div>
    );
}

const inputCls =
    "w-full px-3 py-2 text-sm bg-zinc-50 border border-zinc-200 rounded-sm focus:outline-none focus:ring-2 focus:ring-accent-red/30 focus:border-accent-red focus:bg-white";
