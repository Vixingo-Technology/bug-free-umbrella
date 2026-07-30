"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/admin-guard";
import { uploadToCloudinary, CLOUDINARY_FOLDERS } from "@/lib/cloudinary";

type ActionResult = { ok: true; id?: string } | { ok: false; error: string };

const MAX_IMAGE_BYTES = 8 * 1024 * 1024; // 8 MB
const ALLOWED_IMAGE_TYPES = new Set([
    "image/jpeg",
    "image/png",
    "image/webp",
    "image/heic",
    "image/avif",
]);

export async function uploadProductImageAction(
    formData: FormData
): Promise<{ url?: string; error?: string }> {
    await requireAdmin();

    const file = formData.get("image");
    if (!(file instanceof File) || file.size === 0) {
        return { error: "Please choose an image to upload." };
    }
    if (file.size > MAX_IMAGE_BYTES) {
        return { error: "Image is larger than 8 MB. Please pick a smaller file." };
    }
    if (file.type && !ALLOWED_IMAGE_TYPES.has(file.type)) {
        return { error: "Only JPG, PNG, WebP, HEIC or AVIF images are accepted." };
    }

    try {
        const buffer = Buffer.from(await file.arrayBuffer());
        const dataUri = `data:${file.type || "image/jpeg"};base64,${buffer.toString("base64")}`;

        // No publicId — each upload gets a fresh asset so previous images
        // (used by past orders or product history) stay intact.
        const { url } = await uploadToCloudinary(dataUri, {
            folder: CLOUDINARY_FOLDERS.products,
            resourceType: "image",
        });

        return { url };
    } catch (err: unknown) {
        const message = err instanceof Error ? err.message : "Upload failed.";
        return { error: message };
    }
}

function parseDecimal(v: FormDataEntryValue | null): number | null {
    if (v === null) return null;
    const n = Number(String(v).trim());
    return Number.isFinite(n) ? n : null;
}

function parseInt(v: FormDataEntryValue | null): number | null {
    if (v === null) return null;
    const n = Number.parseInt(String(v).trim(), 10);
    return Number.isFinite(n) ? n : null;
}

function parseDiscountPercent(v: FormDataEntryValue | null): number | null {
    if (v === null || String(v).trim() === "") return 0;
    const n = Number.parseInt(String(v).trim(), 10);
    if (!Number.isFinite(n) || n < 0 || n > 100) return null;
    return n;
}

function parseSizes(v: FormDataEntryValue | null): string[] {
    if (!v) return [];
    return String(v)
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);
}

export async function createProductAction(formData: FormData): Promise<ActionResult> {
    await requireAdmin();

    const name = ((formData.get("name") as string) ?? "").trim();
    const description = ((formData.get("description") as string) ?? "").trim() || null;
    const price = parseDecimal(formData.get("price"));
    const stock = parseInt(formData.get("stock")) ?? 0;
    const imageUrl = ((formData.get("imageUrl") as string) ?? "").trim() || null;
    const category = ((formData.get("category") as string) ?? "").trim() || null;
    const isActive = formData.get("isActive") === "on" || formData.get("isActive") === "true";
    const hasSizes = formData.get("hasSizes") === "on" || formData.get("hasSizes") === "true";
    const sizes = hasSizes ? parseSizes(formData.get("sizes")) : [];
    const memberDiscountPercent = parseDiscountPercent(formData.get("memberDiscountPercent"));

    if (!name) return { ok: false, error: "Name is required." };
    if (price === null || price < 0) return { ok: false, error: "Valid price is required." };
    if (hasSizes && sizes.length === 0)
        return { ok: false, error: "Add at least one size, or turn off sizing." };
    if (memberDiscountPercent === null)
        return { ok: false, error: "Member discount must be a whole number between 0 and 100." };

    const product = await prisma.shopProduct.create({
        data: {
            name,
            description,
            price,
            stock,
            imageUrl,
            category,
            isActive,
            hasSizes,
            sizes,
            memberDiscountPercent,
        },
    });

    revalidatePath("/portal/admin/products");
    return { ok: true, id: product.id };
}

export async function updateProductAction(formData: FormData): Promise<ActionResult> {
    await requireAdmin();

    const id = formData.get("id") as string;
    if (!id) return { ok: false, error: "Product id is required." };

    const name = ((formData.get("name") as string) ?? "").trim();
    const description = ((formData.get("description") as string) ?? "").trim() || null;
    const price = parseDecimal(formData.get("price"));
    const stock = parseInt(formData.get("stock")) ?? 0;
    const imageUrl = ((formData.get("imageUrl") as string) ?? "").trim() || null;
    const category = ((formData.get("category") as string) ?? "").trim() || null;
    const isActive = formData.get("isActive") === "on" || formData.get("isActive") === "true";
    const hasSizes = formData.get("hasSizes") === "on" || formData.get("hasSizes") === "true";
    const sizes = hasSizes ? parseSizes(formData.get("sizes")) : [];
    const memberDiscountPercent = parseDiscountPercent(formData.get("memberDiscountPercent"));

    if (!name) return { ok: false, error: "Name is required." };
    if (price === null || price < 0) return { ok: false, error: "Valid price is required." };
    if (hasSizes && sizes.length === 0)
        return { ok: false, error: "Add at least one size, or turn off sizing." };
    if (memberDiscountPercent === null)
        return { ok: false, error: "Member discount must be a whole number between 0 and 100." };

    await prisma.shopProduct.update({
        where: { id },
        data: {
            name,
            description,
            price,
            stock,
            imageUrl,
            category,
            isActive,
            hasSizes,
            sizes,
            memberDiscountPercent,
        },
    });

    revalidatePath("/portal/admin/products");
    return { ok: true };
}

export async function toggleProductActiveAction(formData: FormData): Promise<ActionResult> {
    await requireAdmin();
    const id = formData.get("id") as string;
    const next = formData.get("isActive") === "true";
    if (!id) return { ok: false, error: "Product id is required." };

    await prisma.shopProduct.update({
        where: { id },
        data: { isActive: next },
    });

    revalidatePath("/portal/admin/products");
    return { ok: true };
}

export async function deleteProductAction(formData: FormData): Promise<ActionResult> {
    await requireAdmin();
    const id = formData.get("id") as string;
    if (!id) return { ok: false, error: "Product id is required." };

    const orderCount = await prisma.shopOrderItem.count({ where: { productId: id } });
    if (orderCount > 0) {
        // Don't break order history — soft-disable instead.
        await prisma.shopProduct.update({ where: { id }, data: { isActive: false } });
        revalidatePath("/portal/admin/products");
        return { ok: false, error: "Product has past orders. It has been deactivated instead of deleted." };
    }

    await prisma.shopProduct.delete({ where: { id } });
    revalidatePath("/portal/admin/products");
    return { ok: true };
}
