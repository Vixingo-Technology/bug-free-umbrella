"use client";

import { AnimatePresence, motion } from "motion/react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { ShoppingBag, Trash2, X, ArrowRight, Minus, Plus } from "lucide-react";
import { useCart } from "./cart-context";

export default function FloatingCart() {
    const { items, totalCount, totalAmount, remove, setQuantity } = useCart();
    const [open, setOpen] = useState(false);
    const [bump, setBump] = useState(false);

    // Bounce the badge whenever the count changes.
    useEffect(() => {
        if (totalCount === 0) return;
        setBump(true);
        const t = setTimeout(() => setBump(false), 350);
        return () => clearTimeout(t);
    }, [totalCount]);

    return (
        <>
            {/* Floating trigger — bottom right */}
            <div className="fixed bottom-6 right-6 z-40">
                <motion.button
                    id="jka-cart-button"
                    onClick={() => setOpen(true)}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    aria-label={`Open cart (${totalCount} items)`}
                    className="relative flex h-14 w-14 items-center justify-center rounded-full bg-accent-red text-white shadow-[0_10px_30px_-5px_rgba(220,38,38,0.55)] transition-shadow hover:shadow-[0_15px_40px_-5px_rgba(220,38,38,0.7)]"
                >
                    <ShoppingBag size={22} strokeWidth={2.2} />
                    <AnimatePresence>
                        {totalCount > 0 && (
                            <motion.span
                                key="badge"
                                initial={{ scale: 0, opacity: 0 }}
                                animate={{
                                    scale: bump ? 1.25 : 1,
                                    opacity: 1,
                                }}
                                exit={{ scale: 0, opacity: 0 }}
                                transition={{
                                    type: "spring",
                                    stiffness: 500,
                                    damping: 18,
                                }}
                                className="absolute -top-1.5 -right-1.5 flex h-6 min-w-[1.5rem] items-center justify-center rounded-full bg-zinc-900 px-1.5 text-[11px] font-bold text-white ring-2 ring-white"
                            >
                                {totalCount}
                            </motion.span>
                        )}
                    </AnimatePresence>
                </motion.button>
            </div>

            {/* Drawer */}
            <AnimatePresence>
                {open && (
                    <>
                        <motion.div
                            key="scrim"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            transition={{ duration: 0.2 }}
                            onClick={() => setOpen(false)}
                            className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm"
                        />
                        <motion.aside
                            key="drawer"
                            initial={{ x: "100%" }}
                            animate={{ x: 0 }}
                            exit={{ x: "100%" }}
                            transition={{ type: "spring", stiffness: 260, damping: 30 }}
                            className="fixed right-0 top-0 z-50 flex h-full w-full max-w-md flex-col bg-white shadow-2xl"
                        >
                            <header className="flex items-center justify-between border-b border-zinc-200 px-6 py-5">
                                <div>
                                    <p className="text-[10px] uppercase tracking-[0.3em] text-zinc-500">
                                        Your Cart
                                    </p>
                                    <h2 className="mt-1 text-xl font-serif text-zinc-900">
                                        {totalCount}{" "}
                                        <span className="text-zinc-500">
                                            {totalCount === 1 ? "item" : "items"}
                                        </span>
                                    </h2>
                                </div>
                                <button
                                    onClick={() => setOpen(false)}
                                    aria-label="Close cart"
                                    className="rounded-full p-2 text-zinc-500 transition hover:bg-zinc-100 hover:text-zinc-900"
                                >
                                    <X size={20} />
                                </button>
                            </header>

                            <div className="flex-1 overflow-y-auto px-6 py-4">
                                {items.length === 0 ? (
                                    <div className="flex h-full flex-col items-center justify-center gap-3 text-center">
                                        <ShoppingBag
                                            size={40}
                                            className="text-zinc-300"
                                        />
                                        <p className="text-sm text-zinc-500">
                                            Your cart is empty.
                                        </p>
                                    </div>
                                ) : (
                                    <ul className="space-y-4">
                                        {items.map((item) => (
                                            <li
                                                key={`${item.productId}::${item.size ?? ""}`}
                                                className="flex gap-3 border-b border-zinc-100 pb-4"
                                            >
                                                <div className="relative h-20 w-20 flex-shrink-0 overflow-hidden rounded-sm bg-zinc-100">
                                                    {item.imageUrl ? (
                                                        // eslint-disable-next-line @next/next/no-img-element
                                                        <img
                                                            src={item.imageUrl}
                                                            alt={item.name}
                                                            className="h-full w-full object-cover"
                                                        />
                                                    ) : (
                                                        <div className="flex h-full w-full items-center justify-center text-xs text-zinc-400">
                                                            No image
                                                        </div>
                                                    )}
                                                </div>
                                                <div className="flex flex-1 flex-col justify-between">
                                                    <div className="flex justify-between gap-2">
                                                        <div className="min-w-0">
                                                            <p className="text-sm font-medium text-zinc-900 line-clamp-2">
                                                                {item.name}
                                                            </p>
                                                            {item.size && (
                                                                <p className="mt-0.5 text-[11px] uppercase tracking-widest text-zinc-500">
                                                                    Size: {item.size}
                                                                </p>
                                                            )}
                                                        </div>
                                                        <button
                                                            onClick={() =>
                                                                remove(
                                                                    item.productId,
                                                                    item.size,
                                                                )
                                                            }
                                                            className="text-zinc-400 transition hover:text-accent-red"
                                                            aria-label={`Remove ${item.name}`}
                                                        >
                                                            <Trash2 size={16} />
                                                        </button>
                                                    </div>
                                                    <div className="flex items-center justify-between">
                                                        <div className="inline-flex items-center rounded-sm border border-zinc-200">
                                                            <button
                                                                onClick={() =>
                                                                    setQuantity(
                                                                        item.productId,
                                                                        item.quantity - 1,
                                                                        item.size,
                                                                    )
                                                                }
                                                                className="p-1.5 text-zinc-500 hover:text-zinc-900"
                                                                aria-label="Decrease quantity"
                                                            >
                                                                <Minus size={14} />
                                                            </button>
                                                            <span className="min-w-[2rem] text-center text-sm font-medium">
                                                                {item.quantity}
                                                            </span>
                                                            <button
                                                                onClick={() =>
                                                                    setQuantity(
                                                                        item.productId,
                                                                        item.quantity + 1,
                                                                        item.size,
                                                                    )
                                                                }
                                                                className="p-1.5 text-zinc-500 hover:text-zinc-900"
                                                                aria-label="Increase quantity"
                                                            >
                                                                <Plus size={14} />
                                                            </button>
                                                        </div>
                                                        <p className="text-sm font-semibold text-zinc-900">
                                                            ৳{" "}
                                                            {(
                                                                item.price *
                                                                item.quantity
                                                            ).toLocaleString()}
                                                        </p>
                                                    </div>
                                                </div>
                                            </li>
                                        ))}
                                    </ul>
                                )}
                            </div>

                            <footer className="border-t border-zinc-200 px-6 py-5">
                                <div className="mb-4 flex items-center justify-between">
                                    <span className="text-sm uppercase tracking-widest text-zinc-500">
                                        Subtotal
                                    </span>
                                    <span className="text-xl font-serif text-zinc-900">
                                        ৳ {totalAmount.toLocaleString()}
                                    </span>
                                </div>
                                <Link
                                    href="/shop/checkout"
                                    onClick={() => setOpen(false)}
                                    aria-disabled={items.length === 0}
                                    className={`inline-flex w-full items-center justify-center gap-2 rounded-sm px-6 py-3 text-sm font-semibold uppercase tracking-widest text-white transition ${
                                        items.length === 0
                                            ? "pointer-events-none bg-zinc-300"
                                            : "bg-accent-red hover:bg-accent-red/90"
                                    }`}
                                >
                                    Checkout
                                    <ArrowRight size={16} />
                                </Link>
                            </footer>
                        </motion.aside>
                    </>
                )}
            </AnimatePresence>
        </>
    );
}
