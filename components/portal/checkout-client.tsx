"use client";

import { useTransition, useState } from "react";
import { motion } from "motion/react";
import {
    ShieldCheck, CreditCard, Package, Star,
    AlertCircle, Loader2, ChevronRight, MapPin,
} from "lucide-react";
import { initiatePaymentAction } from "@/app/portal/checkout/actions";

interface Props {
    order: any;
    member: any;
    paymentFailed: boolean;
}

export default function CheckoutClient({ order, member, paymentFailed }: Props) {
    const [isPending, startTransition] = useTransition();
    const [error, setError] = useState<string | null>(paymentFailed ? "Your previous payment attempt failed. Please try again." : null);

    const productItems: any[] = order?.orderItems ?? [];
    const membershipFee = Number(order?.membershipFee ?? 0);
    const productTotal = productItems.reduce((s: number, i: any) => s + Number(i.unitPrice) * i.quantity, 0);
    const grandTotal = Number(order?.total ?? 0);

    function handlePay() {
        setError(null);
        startTransition(async () => {
            const res = await initiatePaymentAction(order.id);
            if (res?.error) setError(res.error);
        });
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-zinc-950 via-zinc-900 to-zinc-950 flex items-start justify-center px-4 py-12">
            <div className="w-full max-w-lg">
                {/* Header */}
                <motion.div
                    initial={{ opacity: 0, y: -16 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="text-center mb-8"
                >
                    <div className="w-14 h-14 rounded-2xl bg-red-600/20 border border-red-600/30 flex items-center justify-center mx-auto mb-4">
                        <CreditCard size={24} className="text-red-400" />
                    </div>
                    <h1 className="text-2xl font-bold text-white">Complete Your Payment</h1>
                    <p className="text-white/40 text-sm mt-1">
                        Secure checkout via SSLCommerz
                    </p>
                </motion.div>

                {/* Payment failed notice */}
                {error && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="flex items-start gap-3 bg-red-500/10 border border-red-500/30 rounded-2xl px-4 py-3.5 mb-6 text-red-400 text-sm"
                    >
                        <AlertCircle size={16} className="flex-shrink-0 mt-0.5" />
                        {error}
                    </motion.div>
                )}

                {/* Order summary card */}
                <motion.div
                    initial={{ opacity: 0, y: 16 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 }}
                    className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden mb-4"
                >
                    {/* Membership fee */}
                    {order?.includesMembership && (
                        <div className="flex items-center gap-4 px-5 py-4 border-b border-white/5">
                            <div className="w-10 h-10 rounded-xl bg-red-600/20 flex items-center justify-center flex-shrink-0">
                                <Star size={18} className="text-red-400" />
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className="text-sm font-semibold text-white">Annual Membership</p>
                                <p className="text-xs text-white/40 mt-0.5">JKA Bangladesh · 1 year access</p>
                            </div>
                            <p className="text-sm font-bold text-white flex-shrink-0">৳{membershipFee.toLocaleString()}</p>
                        </div>
                    )}

                    {/* Product items */}
                    {productItems.map((item: any, i: number) => (
                        <div key={item.id} className={`flex items-center gap-4 px-5 py-4 ${i < productItems.length - 1 ? "border-b border-white/5" : ""}`}>
                            <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center flex-shrink-0">
                                <Package size={16} className="text-white/40" />
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className="text-sm font-semibold text-white truncate">{item.product?.name}</p>
                                <p className="text-xs text-white/40 mt-0.5">Qty: {item.quantity}</p>
                            </div>
                            <p className="text-sm font-bold text-white flex-shrink-0">
                                ৳{(Number(item.unitPrice) * item.quantity).toLocaleString()}
                            </p>
                        </div>
                    ))}
                </motion.div>

                {/* Totals */}
                <motion.div
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                    className="bg-white/5 border border-white/10 rounded-2xl px-5 py-4 mb-4 space-y-2 text-sm"
                >
                    {order?.includesMembership && (
                        <div className="flex justify-between text-white/50">
                            <span>Membership</span>
                            <span>৳{membershipFee.toLocaleString()}</span>
                        </div>
                    )}
                    {productTotal > 0 && (
                        <div className="flex justify-between text-white/50">
                            <span>Gear ({productItems.length} item{productItems.length !== 1 ? "s" : ""})</span>
                            <span>৳{productTotal.toLocaleString()}</span>
                        </div>
                    )}
                    <div className="pt-2 border-t border-white/10 flex justify-between font-bold text-white text-base">
                        <span>Total</span>
                        <span className="text-amber-400">৳{grandTotal.toLocaleString()}</span>
                    </div>
                </motion.div>

                {/* Delivery note */}
                {productItems.length > 0 && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.25 }}
                        className="flex items-center gap-2.5 bg-blue-500/10 border border-blue-500/20 rounded-xl px-4 py-3 mb-6 text-blue-400 text-xs"
                    >
                        <MapPin size={14} className="flex-shrink-0" />
                        Your gear will be delivered to your selected dojo in 1–2 business days.
                    </motion.div>
                )}

                {/* Pay button */}
                <motion.button
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3 }}
                    onClick={handlePay}
                    disabled={isPending}
                    className="w-full flex items-center justify-center gap-3 bg-red-600 hover:bg-red-500 disabled:opacity-60 text-white font-bold rounded-2xl px-6 py-4 text-base transition-all shadow-[0_8px_30px_rgba(220,38,38,0.4)] hover:shadow-[0_8px_40px_rgba(220,38,38,0.6)] hover:-translate-y-0.5"
                >
                    {isPending ? (
                        <>
                            <Loader2 size={18} className="animate-spin" />
                            Redirecting to SSLCommerz…
                        </>
                    ) : (
                        <>
                            <ShieldCheck size={18} />
                            Pay ৳{grandTotal.toLocaleString()} Securely
                            <ChevronRight size={16} />
                        </>
                    )}
                </motion.button>

                {/* Security badges */}
                <motion.p
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.4 }}
                    className="text-center text-white/20 text-xs mt-4 flex items-center justify-center gap-1.5"
                >
                    <ShieldCheck size={12} />
                    Secured by SSLCommerz · bKash · Nagad · Cards
                </motion.p>
            </div>
        </div>
    );
}
