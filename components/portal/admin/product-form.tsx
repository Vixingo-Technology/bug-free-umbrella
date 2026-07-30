"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { AlertCircle, ArrowLeft, Package } from "lucide-react";
import {
    createProductAction,
    updateProductAction,
} from "@/app/actions/admin-products";
import ProductImageUploader from "@/components/portal/admin/product-image-uploader";

export type ProductFormValues = {
    id?: string;
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
};

export default function ProductForm({
    product,
    backHref = "/portal/admin/products",
}: {
    product?: ProductFormValues;
    backHref?: string;
}) {
    const router = useRouter();
    const isEdit = !!product?.id;
    const [isPending, startTransition] = useTransition();
    const [error, setError] = useState<string | null>(null);

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
        memberDiscountPercent: product
            ? String(product.memberDiscountPercent ?? 0)
            : "0",
    });

    function submit(e: React.FormEvent) {
        e.preventDefault();
        setError(null);

        const fd = new FormData();
        if (product?.id) fd.set("id", product.id);
        fd.set("name", form.name);
        fd.set("description", form.description);
        fd.set("price", form.price);
        fd.set("stock", form.stock);
        fd.set("imageUrl", form.imageUrl);
        fd.set("category", form.category);
        if (form.isActive) fd.set("isActive", "true");
        if (form.hasSizes) fd.set("hasSizes", "true");
        fd.set("sizes", form.sizes);
        fd.set("memberDiscountPercent", form.memberDiscountPercent);

        startTransition(async () => {
            const res = isEdit
                ? await updateProductAction(fd)
                : await createProductAction(fd);
            if (res.ok) {
                router.push(backHref);
                router.refresh();
            } else {
                setError(res.error);
            }
        });
    }

    return (
        <div className="max-w-3xl mx-auto">
            <Link
                href={backHref}
                className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-widest text-zinc-500 hover:text-zinc-900 mb-6"
            >
                <ArrowLeft size={12} />
                Back to products
            </Link>

            <div className="flex items-center gap-3 mb-6">
                <div className="p-2 bg-accent-red/10 rounded-xl">
                    <Package size={18} className="text-accent-red" />
                </div>
                <h1 className="text-2xl font-bold text-zinc-900">
                    {isEdit ? "Edit product" : "New product"}
                </h1>
            </div>

            <form
                onSubmit={submit}
                className="bg-white border border-zinc-200 rounded-2xl shadow-sm p-6 md:p-8 space-y-5"
            >
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
                        onChange={(e) =>
                            setForm({ ...form, description: e.target.value })
                        }
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
                            onChange={(e) =>
                                setForm({ ...form, price: e.target.value })
                            }
                            required
                            className={inputCls}
                        />
                    </Field>
                    <Field label="Stock">
                        <input
                            type="number"
                            min="0"
                            value={form.stock}
                            onChange={(e) =>
                                setForm({ ...form, stock: e.target.value })
                            }
                            className={inputCls}
                        />
                    </Field>
                </div>

                <Field label="Category">
                    <input
                        type="text"
                        value={form.category}
                        onChange={(e) =>
                            setForm({ ...form, category: e.target.value })
                        }
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

                <Field label="Member discount (%)">
                    <input
                        type="number"
                        min="0"
                        max="100"
                        step="1"
                        value={form.memberDiscountPercent}
                        onChange={(e) =>
                            setForm({
                                ...form,
                                memberDiscountPercent: e.target.value.replace(
                                    /[^0-9]/g,
                                    "",
                                ),
                            })
                        }
                        placeholder="0"
                        className={inputCls}
                    />
                    <p className="text-[11px] text-zinc-500 mt-1.5">
                        Applied automatically for signed-in JKA members with an active membership. Leave 0 for no discount.
                    </p>
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
                                Comma-separated labels. Customers must pick one before adding to cart.
                            </p>
                        </div>
                    )}
                </div>

                <label className="flex items-center gap-3 cursor-pointer">
                    <input
                        type="checkbox"
                        checked={form.isActive}
                        onChange={(e) =>
                            setForm({ ...form, isActive: e.target.checked })
                        }
                        className="w-4 h-4 rounded text-accent-red focus:ring-accent-red"
                    />
                    <span className="text-sm font-medium text-zinc-700">
                        Visible in the shop
                    </span>
                </label>

                {error && (
                    <div className="flex items-start gap-2 rounded-xl bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-800">
                        <AlertCircle size={16} className="mt-0.5 shrink-0" />
                        {error}
                    </div>
                )}

                <div className="flex items-center gap-3 pt-2">
                    <Link
                        href={backHref}
                        className="flex-1 px-4 py-2.5 text-sm font-semibold text-zinc-700 hover:bg-zinc-100 rounded-xl transition-colors text-center"
                    >
                        Cancel
                    </Link>
                    <button
                        type="submit"
                        disabled={isPending}
                        className="flex-1 px-4 py-2.5 text-sm font-semibold text-white bg-accent-red hover:bg-accent-red/90 disabled:opacity-50 rounded-xl transition-colors"
                    >
                        {isPending
                            ? "Saving…"
                            : isEdit
                              ? "Save changes"
                              : "Create product"}
                    </button>
                </div>
            </form>
        </div>
    );
}

const inputCls =
    "w-full px-3 py-2.5 text-sm bg-zinc-50 border border-zinc-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-accent-red/30 focus:border-accent-red focus:bg-white";

function Field({
    label,
    children,
    required,
}: {
    label: string;
    children: React.ReactNode;
    required?: boolean;
}) {
    return (
        <div>
            <label className="block text-xs font-bold tracking-widest uppercase text-zinc-500 mb-2">
                {label}
                {required && <span className="text-accent-red ml-1">*</span>}
            </label>
            {children}
        </div>
    );
}
