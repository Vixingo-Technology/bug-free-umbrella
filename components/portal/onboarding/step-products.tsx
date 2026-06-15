"use client";

import { useState, useTransition } from "react";
import { motion, AnimatePresence } from "motion/react";
import { ShoppingBag, Check, ChevronRight, ChevronLeft, Package, AlertCircle } from "lucide-react";
import { createOnboardingOrderAction } from "@/app/portal/onboarding/actions";
import { MEMBERSHIP_FEE_BDT } from "@/lib/constants";

interface Props {
    products: any[];
    /** Controlled selected-product IDs — lifted so Back preserves selection. */
    value: Set<string>;
    onChange: (next: Set<string>) => void;
    onBack: () => void;
    onNext: (orderId: string) => void;
}

const categoryLabel: Record<string, string> = {
    gear: "Training Gear",
    equipment: "Protective Equipment",
    apparel: "Apparel & Bags",
};

const categoryIcon: Record<string, string> = {
    gear: "🥋",
    equipment: "🛡️",
    apparel: "👕",
};

export default function StepProducts({ products, value: selected, onChange, onBack, onNext }: Props) {
    const [isPending, startTransition] = useTransition();
    const [error, setError] = useState<string | null>(null);

    const grouped = products.reduce((acc: Record<string, any[]>, p) => {
        const cat = p.category ?? "other";
        if (!acc[cat]) acc[cat] = [];
        acc[cat].push(p);
        return acc;
    }, {});

    const selectedProducts = products.filter((p) => selected.has(p.id));
    const productTotal = selectedProducts.reduce((sum, p) => sum + Number(p.price), 0);
    const grandTotal = productTotal + MEMBERSHIP_FEE_BDT;

    function toggle(id: string) {
        const next = new Set(selected);
        if (next.has(id)) next.delete(id);
        else next.add(id);
        onChange(next);
    }

    function handleContinue() {
        setError(null);
        startTransition(async () => {
            const res = await createOnboardingOrderAction(Array.from(selected));
            if (res?.error) {
                setError(res.error);
            } else if (res?.orderId) {
                onNext(res.orderId);
            }
        });
    }

    return (
        <div>
            <div className="mb-6 text-center">
                <motion.div
                    initial={{ scale: 0.8, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ delay: 0.1 }}
                    className="w-14 h-14 rounded-2xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center mx-auto mb-4"
                >
                    <ShoppingBag size={24} className="text-amber-400" />
                </motion.div>
                <h1 className="text-2xl font-bold text-white">Gear Up for Your Journey</h1>
                <p className="text-white/50 text-sm mt-1">
                    Select any equipment you need. Everything will be delivered to your dojo.
                    <br />
                    <span className="text-white/30">You can skip this step and order later.</span>
                </p>
            </div>

            {error && (
                <motion.div
                    initial={{ opacity: 0, y: -8 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex items-center gap-2 bg-red-500/10 border border-red-500/30 rounded-xl px-4 py-3 mb-4 text-red-400 text-sm"
                >
                    <AlertCircle size={16} className="flex-shrink-0" />
                    {error}
                </motion.div>
            )}

            {/* Product grid by category */}
            {products.length === 0 ? (
                <div className="text-center py-12 text-white/30">
                    <Package size={40} className="mx-auto mb-3 opacity-40" />
                    <p className="text-sm">No products available yet.</p>
                </div>
            ) : (
                <div className="space-y-6 max-h-[55vh] overflow-y-auto pr-1 scrollbar-thin">
                    {Object.entries(grouped).map(([cat, items]) => (
                        <div key={cat}>
                            <p className="text-xs font-bold tracking-widest uppercase text-white/30 mb-3 flex items-center gap-2">
                                <span>{categoryIcon[cat] ?? "📦"}</span>
                                {categoryLabel[cat] ?? cat}
                            </p>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                {items.map((product, i) => {
                                    const isSelected = selected.has(product.id);
                                    return (
                                        <motion.button
                                            key={product.id}
                                            initial={{ opacity: 0, y: 12 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            transition={{ delay: i * 0.04 }}
                                            onClick={() => toggle(product.id)}
                                            className={`relative text-left p-4 rounded-2xl border transition-all ${
                                                isSelected
                                                    ? "bg-red-600/15 border-red-500/50 shadow-[0_0_20px_rgba(220,38,38,0.15)]"
                                                    : "bg-white/5 border-white/10 hover:bg-white/8 hover:border-white/20"
                                            }`}
                                        >
                                            {/* Selection check */}
                                            <div className={`absolute top-3 right-3 w-6 h-6 rounded-full flex items-center justify-center transition-all ${
                                                isSelected ? "bg-red-600" : "bg-white/10"
                                            }`}>
                                                <AnimatePresence>
                                                    {isSelected && (
                                                        <motion.div
                                                            initial={{ scale: 0 }}
                                                            animate={{ scale: 1 }}
                                                            exit={{ scale: 0 }}
                                                        >
                                                            <Check size={12} className="text-white" />
                                                        </motion.div>
                                                    )}
                                                </AnimatePresence>
                                            </div>

                                            {/* Product image placeholder */}
                                            <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center mb-3 text-xl">
                                                {categoryIcon[product.category ?? "other"] ?? "📦"}
                                            </div>

                                            <p className="text-sm font-semibold text-white pr-8 leading-tight">{product.name}</p>
                                            <p className="text-xs text-white/40 mt-1 line-clamp-2 leading-relaxed">{product.description}</p>
                                            <p className="text-sm font-bold text-amber-400 mt-2">৳{Number(product.price).toLocaleString()}</p>
                                        </motion.button>
                                    );
                                })}
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Order summary sticky bar */}
            <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="mt-6 bg-white/5 border border-white/10 rounded-2xl p-4"
            >
                <div className="space-y-1.5 text-sm">
                    <div className="flex justify-between text-white/50">
                        <span>Annual Membership Fee</span>
                        <span className="text-white/70 font-medium">৳{MEMBERSHIP_FEE_BDT.toLocaleString()}</span>
                    </div>
                    {selected.size > 0 && (
                        <div className="flex justify-between text-white/50">
                            <span>Gear ({selected.size} item{selected.size > 1 ? "s" : ""})</span>
                            <span className="text-white/70 font-medium">৳{productTotal.toLocaleString()}</span>
                        </div>
                    )}
                    <div className="pt-2 border-t border-white/10 flex justify-between font-bold text-white">
                        <span>Total</span>
                        <span className="text-amber-400">৳{grandTotal.toLocaleString()}</span>
                    </div>
                </div>
            </motion.div>

            {/* Actions */}
            <div className="flex gap-3 mt-5">
                <button
                    onClick={onBack}
                    className="flex items-center gap-1.5 px-5 py-3 rounded-xl border border-white/10 text-white/50 hover:text-white hover:border-white/20 text-sm font-medium transition-colors"
                >
                    <ChevronLeft size={16} /> Back
                </button>
                <button
                    onClick={handleContinue}
                    disabled={isPending}
                    className="flex-1 flex items-center justify-center gap-2 bg-red-600 hover:bg-red-500 disabled:opacity-60 text-white font-semibold rounded-xl px-6 py-3 transition-colors text-sm"
                >
                    {isPending ? "Saving…" : selected.size > 0 ? "Continue with Selected Items" : "Continue without Gear"}
                    {!isPending && <ChevronRight size={16} />}
                </button>
            </div>
        </div>
    );
}
