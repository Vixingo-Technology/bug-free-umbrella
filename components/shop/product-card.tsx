"use client";

import { AnimatePresence, motion } from "motion/react";
import { useRef, useState } from "react";
import { Plus, Check } from "lucide-react";
import { useCart } from "./cart-context";

type FlyingItem = {
    id: number;
    startX: number;
    startY: number;
    endX: number;
    endY: number;
    imageUrl: string | null;
    name: string;
};

let flyCounter = 0;

export type ProductCardData = {
    id: string;
    name: string;
    description: string | null;
    price: number;
    stock: number;
    imageUrl: string | null;
    category: string | null;
    hasSizes: boolean;
    sizes: string[];
    memberDiscountPercent: number;
};

export default function ProductCard({
    product,
    isMember = false,
}: {
    product: ProductCardData;
    isMember?: boolean;
}) {
    const { add } = useCart();
    const discountActive = isMember && product.memberDiscountPercent > 0;
    const effectivePrice = discountActive
        ? Math.round(product.price * (1 - product.memberDiscountPercent / 100) * 100) / 100
        : product.price;
    const imageRef = useRef<HTMLDivElement | null>(null);
    const [fliers, setFliers] = useState<FlyingItem[]>([]);
    const [justAdded, setJustAdded] = useState(false);
    const [selectedSize, setSelectedSize] = useState<string | null>(null);
    const [sizeError, setSizeError] = useState(false);
    const outOfStock = product.stock <= 0;
    const requiresSize = product.hasSizes && product.sizes.length > 0;

    const handleAdd = () => {
        if (outOfStock) return;
        if (requiresSize && !selectedSize) {
            setSizeError(true);
            setTimeout(() => setSizeError(false), 1500);
            return;
        }

        const rect = imageRef.current?.getBoundingClientRect();
        const cartEl = document.getElementById("jka-cart-button");
        const cartRect = cartEl?.getBoundingClientRect();

        if (rect && cartRect) {
            const startX = rect.left + rect.width / 2;
            const startY = rect.top + rect.height / 2;
            const endX = cartRect.left + cartRect.width / 2;
            const endY = cartRect.top + cartRect.height / 2;
            const id = ++flyCounter;
            setFliers((prev) => [
                ...prev,
                { id, startX, startY, endX, endY, imageUrl: product.imageUrl, name: product.name },
            ]);
            setTimeout(() => {
                setFliers((prev) => prev.filter((f) => f.id !== id));
            }, 750);
        }

        add({
            productId: product.id,
            name: product.name,
            price: effectivePrice,
            imageUrl: product.imageUrl,
            size: selectedSize,
        });

        setJustAdded(true);
        setTimeout(() => setJustAdded(false), 900);
    };

    return (
        <>
            <motion.div
                whileHover={{ y: -4 }}
                transition={{ type: "spring", stiffness: 300, damping: 22 }}
                className="group flex flex-col overflow-hidden rounded-sm border border-zinc-200 bg-white shadow-sm transition-shadow hover:shadow-lg"
            >
                <div
                    ref={imageRef}
                    className="relative aspect-square overflow-hidden bg-zinc-100"
                >
                    {product.imageUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                            src={product.imageUrl}
                            alt={product.name}
                            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                        />
                    ) : (
                        <div className="flex h-full w-full items-center justify-center text-sm text-zinc-400">
                            No image
                        </div>
                    )}
                    {product.category && (
                        <span className="absolute left-3 top-3 rounded-sm bg-white/90 px-2 py-1 text-[10px] font-semibold uppercase tracking-widest text-zinc-700 backdrop-blur">
                            {product.category}
                        </span>
                    )}
                    {discountActive && (
                        <span className="absolute right-3 top-3 rounded-sm bg-emerald-600 px-2 py-1 text-[10px] font-semibold uppercase tracking-widest text-white shadow">
                            Member −{product.memberDiscountPercent}%
                        </span>
                    )}
                    {outOfStock && (
                        <div className="absolute inset-0 flex items-center justify-center bg-white/70 backdrop-blur-sm">
                            <span className="rounded-sm bg-zinc-900 px-3 py-1 text-[11px] font-semibold uppercase tracking-widest text-white">
                                Out of stock
                            </span>
                        </div>
                    )}
                </div>

                <div className="flex flex-1 flex-col gap-3 p-5">
                    <div>
                        <h3 className="text-base font-semibold text-zinc-900 line-clamp-2">
                            {product.name}
                        </h3>
                        {product.description && (
                            <p className="mt-1 text-sm text-zinc-500 line-clamp-2">
                                {product.description}
                            </p>
                        )}
                    </div>

                    {requiresSize && (
                        <div>
                            <p
                                className={`mb-1.5 text-[10px] font-semibold uppercase tracking-widest transition-colors ${
                                    sizeError ? "text-accent-red" : "text-zinc-500"
                                }`}
                            >
                                {sizeError ? "Please choose a size" : "Choose size"}
                            </p>
                            <div className="flex flex-wrap gap-1.5">
                                {product.sizes.map((s) => (
                                    <button
                                        key={s}
                                        type="button"
                                        onClick={() => {
                                            setSelectedSize(s);
                                            setSizeError(false);
                                        }}
                                        className={`min-w-[2.25rem] rounded-sm border px-2.5 py-1 text-xs font-semibold transition ${
                                            selectedSize === s
                                                ? "border-accent-red bg-accent-red text-white"
                                                : "border-zinc-200 bg-white text-zinc-700 hover:border-zinc-400"
                                        }`}
                                    >
                                        {s}
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}

                    <div className="mt-auto flex items-center justify-between">
                        <div>
                            {discountActive ? (
                                <>
                                    <p className="text-lg font-serif text-zinc-900">
                                        ৳ {effectivePrice.toLocaleString()}
                                    </p>
                                    <p className="text-xs text-zinc-500 line-through">
                                        ৳ {product.price.toLocaleString()}
                                    </p>
                                </>
                            ) : (
                                <p className="text-lg font-serif text-zinc-900">
                                    ৳ {product.price.toLocaleString()}
                                </p>
                            )}
                            {!discountActive && product.memberDiscountPercent > 0 && (
                                <p className="text-[10px] uppercase tracking-widest text-emerald-700">
                                    Members save {product.memberDiscountPercent}%
                                </p>
                            )}
                            {!outOfStock && product.stock <= 5 && (
                                <p className="text-[10px] uppercase tracking-widest text-amber-600">
                                    Only {product.stock} left
                                </p>
                            )}
                        </div>
                        <motion.button
                            onClick={handleAdd}
                            disabled={outOfStock}
                            whileTap={{ scale: 0.92 }}
                            className={`inline-flex items-center gap-1.5 rounded-sm px-3 py-2 text-xs font-semibold uppercase tracking-widest transition ${
                                outOfStock
                                    ? "bg-zinc-200 text-zinc-400"
                                    : justAdded
                                        ? "bg-emerald-600 text-white"
                                        : "bg-zinc-900 text-white hover:bg-accent-red"
                            }`}
                        >
                            <AnimatePresence mode="wait" initial={false}>
                                {justAdded ? (
                                    <motion.span
                                        key="added"
                                        initial={{ opacity: 0, y: 4 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        exit={{ opacity: 0, y: -4 }}
                                        className="inline-flex items-center gap-1.5"
                                    >
                                        <Check size={14} />
                                        Added
                                    </motion.span>
                                ) : (
                                    <motion.span
                                        key="add"
                                        initial={{ opacity: 0, y: 4 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        exit={{ opacity: 0, y: -4 }}
                                        className="inline-flex items-center gap-1.5"
                                    >
                                        <Plus size={14} />
                                        Add
                                    </motion.span>
                                )}
                            </AnimatePresence>
                        </motion.button>
                    </div>
                </div>
            </motion.div>

            {/* Fly-to-cart animation layer */}
            <AnimatePresence>
                {fliers.map((f) => (
                    <motion.div
                        key={f.id}
                        initial={{
                            top: f.startY,
                            left: f.startX,
                            opacity: 1,
                            scale: 1,
                        }}
                        animate={{
                            top: f.endY,
                            left: f.endX,
                            opacity: 0.5,
                            scale: 0.2,
                        }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.7, ease: [0.5, -0.2, 0.7, 1] }}
                        className="pointer-events-none fixed z-[60] h-16 w-16 -translate-x-1/2 -translate-y-1/2 overflow-hidden rounded-full bg-white shadow-2xl ring-2 ring-accent-red"
                        aria-hidden
                    >
                        {f.imageUrl ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                                src={f.imageUrl}
                                alt=""
                                className="h-full w-full object-cover"
                            />
                        ) : (
                            <div className="flex h-full w-full items-center justify-center bg-accent-red text-white">
                                <Plus size={20} />
                            </div>
                        )}
                    </motion.div>
                ))}
            </AnimatePresence>
        </>
    );
}
