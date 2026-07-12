"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { motion } from "motion/react";
import { AlertTriangle, ArrowLeft, ArrowRight, ShoppingBag } from "lucide-react";
import { useCart } from "./cart-context";
import { placeGuestOrderAction } from "@/app/shop/actions";
import { validatePhone } from "@/lib/validation/phone";

export default function CheckoutClient({
    paymentFailed,
}: {
    paymentFailed: boolean;
}) {
    const { items, totalCount, totalAmount, clear } = useCart();
    const [error, setError] = useState<string | null>(null);
    const [pending, startTransition] = useTransition();
    const [form, setForm] = useState({
        fullName: "",
        phone: "",
        address: "",
        email: "",
        notes: "",
    });

    const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setError(null);
        if (items.length === 0) {
            setError("Your cart is empty.");
            return;
        }
        const phoneError = validatePhone(form.phone);
        if (phoneError) {
            setError(phoneError);
            return;
        }
        const payload = {
            ...form,
            items: items.map((i) => ({
                productId: i.productId,
                quantity: i.quantity,
                size: i.size ?? null,
            })),
        };

        // Stash cart snapshot for the thank-you page (server can't read the
        // browser cart, so we save it before it gets cleared).
        try {
            sessionStorage.setItem(
                "jka:shop:last-order-items",
                JSON.stringify(items),
            );
        } catch {
            /* ignore */
        }

        startTransition(async () => {
            const result = await placeGuestOrderAction(payload);
            if (result?.error) {
                setError(result.error);
                return;
            }
            // If we reach here without an error, the server should have
            // redirected. If somehow we didn't, clear the cart anyway.
            clear();
        });
    };

    return (
        <main className="min-h-screen bg-zinc-50 pt-32 pb-24">
            <div className="mx-auto max-w-5xl px-6 md:px-10">
                <Link
                    href="/shop"
                    className="mb-8 inline-flex items-center gap-2 text-xs uppercase tracking-widest text-zinc-500 transition hover:text-accent-red"
                >
                    <ArrowLeft size={14} />
                    Continue shopping
                </Link>

                <div className="grid grid-cols-1 gap-8 lg:grid-cols-[1fr_400px]">
                    {/* Form */}
                    <motion.section
                        initial={{ opacity: 0, y: 12 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="rounded-sm border border-zinc-200 bg-white p-6 md:p-10"
                    >
                        <p className="text-[11px] uppercase tracking-[0.4em] text-zinc-500">
                            Checkout
                        </p>
                        <h1 className="mt-2 font-serif text-3xl text-zinc-900">
                            Delivery details
                        </h1>
                        <p className="mt-2 text-sm text-zinc-500">
                            We&apos;ll deliver your order to the address below.
                            Payment is processed securely by SSLCommerz.
                        </p>

                        {paymentFailed && (
                            <div className="mt-6 flex items-start gap-3 rounded-sm border border-red-200 bg-red-50 p-4 text-sm text-red-800">
                                <AlertTriangle size={16} className="mt-0.5" />
                                <div>
                                    Payment did not complete. Please review your
                                    details and try again.
                                </div>
                            </div>
                        )}

                        {error && (
                            <div className="mt-6 rounded-sm border border-red-200 bg-red-50 p-4 text-sm text-red-800">
                                {error}
                            </div>
                        )}

                        <form onSubmit={handleSubmit} className="mt-8 space-y-5">
                            <Field
                                label="Full name"
                                required
                                value={form.fullName}
                                onChange={(v) =>
                                    setForm((f) => ({ ...f, fullName: v }))
                                }
                                placeholder="e.g. Rahim Uddin"
                            />
                            <Field
                                label="Phone number"
                                required
                                type="tel"
                                inputMode="numeric"
                                pattern="\d{11}"
                                maxLength={11}
                                minLength={11}
                                title="Phone number must be exactly 11 digits."
                                value={form.phone}
                                onChange={(v) =>
                                    setForm((f) => ({
                                        ...f,
                                        phone: v.replace(/\D/g, "").slice(0, 11),
                                    }))
                                }
                                placeholder="01XXXXXXXXX"
                            />
                            <Field
                                label="Delivery address"
                                required
                                multiline
                                value={form.address}
                                onChange={(v) =>
                                    setForm((f) => ({ ...f, address: v }))
                                }
                                placeholder="House / road / area, city"
                            />
                            <Field
                                label="Email (optional)"
                                type="email"
                                value={form.email}
                                onChange={(v) =>
                                    setForm((f) => ({ ...f, email: v }))
                                }
                                placeholder="you@example.com"
                            />
                            <Field
                                label="Order notes (optional)"
                                multiline
                                value={form.notes}
                                onChange={(v) =>
                                    setForm((f) => ({ ...f, notes: v }))
                                }
                                placeholder="Anything we should know?"
                            />

                            <button
                                type="submit"
                                disabled={pending || items.length === 0}
                                className="inline-flex w-full items-center justify-center gap-2 rounded-sm bg-accent-red px-6 py-3.5 text-sm font-semibold uppercase tracking-widest text-white transition hover:bg-accent-red/90 disabled:cursor-not-allowed disabled:bg-zinc-300"
                            >
                                {pending
                                    ? "Redirecting to payment…"
                                    : `Pay ৳ ${totalAmount.toLocaleString()}`}
                                {!pending && <ArrowRight size={16} />}
                            </button>
                            <p className="text-center text-[11px] text-zinc-500">
                                Secure payment powered by SSLCommerz.
                            </p>
                        </form>
                    </motion.section>

                    {/* Summary */}
                    <motion.aside
                        initial={{ opacity: 0, y: 12 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.05 }}
                        className="h-fit rounded-sm border border-zinc-200 bg-white p-6"
                    >
                        <p className="text-[11px] uppercase tracking-[0.4em] text-zinc-500">
                            Order summary
                        </p>
                        <h2 className="mt-2 font-serif text-xl text-zinc-900">
                            {totalCount}{" "}
                            <span className="text-zinc-500">
                                {totalCount === 1 ? "item" : "items"}
                            </span>
                        </h2>

                        {items.length === 0 ? (
                            <div className="mt-6 flex flex-col items-center gap-2 rounded-sm bg-zinc-50 py-8 text-center">
                                <ShoppingBag className="text-zinc-300" size={28} />
                                <p className="text-sm text-zinc-500">
                                    Your cart is empty.
                                </p>
                                <Link
                                    href="/shop"
                                    className="mt-2 text-xs uppercase tracking-widest text-accent-red"
                                >
                                    Browse products
                                </Link>
                            </div>
                        ) : (
                            <>
                                <ul className="mt-4 space-y-3">
                                    {items.map((it) => (
                                        <li
                                            key={`${it.productId}::${it.size ?? ""}`}
                                            className="flex items-center gap-3"
                                        >
                                            <div className="relative h-12 w-12 flex-shrink-0 overflow-hidden rounded-sm bg-zinc-100">
                                                {it.imageUrl && (
                                                    // eslint-disable-next-line @next/next/no-img-element
                                                    <img
                                                        src={it.imageUrl}
                                                        alt={it.name}
                                                        className="h-full w-full object-cover"
                                                    />
                                                )}
                                                <span className="absolute -right-1 -top-1 flex h-5 min-w-[1.25rem] items-center justify-center rounded-full bg-zinc-900 px-1 text-[10px] font-bold text-white">
                                                    {it.quantity}
                                                </span>
                                            </div>
                                            <div className="min-w-0 flex-1">
                                                <p className="truncate text-sm text-zinc-900">
                                                    {it.name}
                                                </p>
                                                <p className="text-xs text-zinc-500">
                                                    {it.size && (
                                                        <span className="mr-1 uppercase tracking-widest">
                                                            {it.size} ·
                                                        </span>
                                                    )}
                                                    ৳ {it.price.toLocaleString()} ×{" "}
                                                    {it.quantity}
                                                </p>
                                            </div>
                                            <p className="text-sm font-semibold text-zinc-900">
                                                ৳{" "}
                                                {(
                                                    it.price * it.quantity
                                                ).toLocaleString()}
                                            </p>
                                        </li>
                                    ))}
                                </ul>
                                <div className="mt-6 flex items-center justify-between border-t border-zinc-100 pt-4">
                                    <span className="text-xs uppercase tracking-widest text-zinc-500">
                                        Total
                                    </span>
                                    <span className="font-serif text-2xl text-zinc-900">
                                        ৳ {totalAmount.toLocaleString()}
                                    </span>
                                </div>
                            </>
                        )}
                    </motion.aside>
                </div>
            </div>
        </main>
    );
}

function Field({
    label,
    value,
    onChange,
    type = "text",
    placeholder,
    required,
    multiline,
    pattern,
    maxLength,
    minLength,
    inputMode,
    title,
}: {
    label: string;
    value: string;
    onChange: (v: string) => void;
    type?: string;
    placeholder?: string;
    required?: boolean;
    multiline?: boolean;
    pattern?: string;
    maxLength?: number;
    minLength?: number;
    inputMode?: "numeric" | "text" | "tel" | "email" | "url" | "search" | "none" | "decimal";
    title?: string;
}) {
    return (
        <label className="block">
            <span className="mb-1.5 block text-[11px] font-semibold uppercase tracking-widest text-zinc-600">
                {label}
                {required && <span className="ml-1 text-accent-red">*</span>}
            </span>
            {multiline ? (
                <textarea
                    value={value}
                    onChange={(e) => onChange(e.target.value)}
                    placeholder={placeholder}
                    required={required}
                    rows={3}
                    className="w-full resize-none rounded-sm border border-zinc-200 bg-white px-3 py-2.5 text-sm text-zinc-900 outline-none transition focus:border-accent-red focus:ring-2 focus:ring-accent-red/20"
                />
            ) : (
                <input
                    type={type}
                    value={value}
                    onChange={(e) => onChange(e.target.value)}
                    placeholder={placeholder}
                    required={required}
                    pattern={pattern}
                    maxLength={maxLength}
                    minLength={minLength}
                    inputMode={inputMode}
                    title={title}
                    className="w-full rounded-sm border border-zinc-200 bg-white px-3 py-2.5 text-sm text-zinc-900 outline-none transition focus:border-accent-red focus:ring-2 focus:ring-accent-red/20"
                />
            )}
        </label>
    );
}
