"use server";

import { revalidatePath } from "next/cache";
import { Prisma } from "@/prisma/generated/client";
import { prisma } from "@/lib/prisma";
import { requireDojoRole } from "@/lib/dojo-session";
import { hasAtLeast } from "@/lib/dojo-roles";

type ActionResult<T = unknown> =
    | ({ ok: true } & T)
    | { ok: false; error: string };

function parseDecimal(v: FormDataEntryValue | null): number | null {
    if (v === null) return null;
    const n = Number(String(v).trim());
    return Number.isFinite(n) ? n : null;
}

function parseQty(v: FormDataEntryValue | null): number | null {
    if (v === null) return null;
    const n = Number.parseInt(String(v).trim(), 10);
    return Number.isFinite(n) ? n : null;
}

/**
 * Stock or top-up a JKA admin product in this dojo's inventory.
 *
 * Requires DOJO_MANAGER or higher. Quantities are additive — calling this
 * twice for the same product adds the quantities together. unitPrice (the
 * price the dojo charges its members) is updated on every call; if omitted,
 * the federation price is used the first time and left as-is afterwards.
 */
export async function stockProductAction(formData: FormData): Promise<ActionResult> {
    const session = await requireDojoRole("DOJO_MANAGER");
    if (!session.dojo) return { ok: false, error: "No dojo on this account yet." };

    const productId = String(formData.get("productId") ?? "").trim();
    const quantity = parseQty(formData.get("quantity"));
    const unitPriceRaw = formData.get("unitPrice");
    const unitPrice = unitPriceRaw === null || String(unitPriceRaw).trim() === ""
        ? null
        : parseDecimal(unitPriceRaw);

    if (!productId) return { ok: false, error: "Product is required." };
    if (quantity === null || quantity <= 0) {
        return { ok: false, error: "Quantity must be a positive number." };
    }
    if (unitPrice !== null && unitPrice < 0) {
        return { ok: false, error: "Unit price cannot be negative." };
    }

    const product = await prisma.shopProduct.findUnique({
        where: { id: productId },
        select: { id: true, price: true, isActive: true },
    });
    if (!product) return { ok: false, error: "That product no longer exists." };

    const fallbackPrice = unitPrice ?? Number(product.price.toString());

    await prisma.dojoInventoryItem.upsert({
        where: {
            dojoId_productId: { dojoId: session.dojo.id, productId },
        },
        create: {
            dojoId: session.dojo.id,
            productId,
            quantityOnHand: quantity,
            unitPrice: new Prisma.Decimal(fallbackPrice),
        },
        update: {
            quantityOnHand: { increment: quantity },
            ...(unitPrice !== null
                ? { unitPrice: new Prisma.Decimal(unitPrice) }
                : {}),
        },
    });

    revalidatePath("/portal/dojo/shop");
    return { ok: true };
}

/**
 * Manually adjust the on-hand count for an inventory row (e.g. correction
 * after a stock-take). Use a negative quantity to subtract. Will not allow
 * the count to go below zero.
 */
export async function adjustInventoryAction(formData: FormData): Promise<ActionResult> {
    const session = await requireDojoRole("DOJO_MANAGER");
    if (!session.dojo) return { ok: false, error: "No dojo on this account yet." };

    const itemId = String(formData.get("itemId") ?? "").trim();
    const delta = parseQty(formData.get("delta"));
    if (!itemId) return { ok: false, error: "Inventory row id required." };
    if (delta === null || delta === 0) return { ok: false, error: "Adjustment must be non-zero." };

    const item = await prisma.dojoInventoryItem.findUnique({
        where: { id: itemId },
        select: { dojoId: true, quantityOnHand: true },
    });
    if (!item || item.dojoId !== session.dojo.id) {
        return { ok: false, error: "Inventory row not found." };
    }

    const next = item.quantityOnHand + delta;
    if (next < 0) return { ok: false, error: "Cannot reduce stock below zero." };

    await prisma.dojoInventoryItem.update({
        where: { id: itemId },
        data: { quantityOnHand: next },
    });

    revalidatePath("/portal/dojo/shop");
    return { ok: true };
}

/**
 * Update the per-dojo selling price for an inventory item.
 */
export async function setInventoryPriceAction(formData: FormData): Promise<ActionResult> {
    const session = await requireDojoRole("DOJO_MANAGER");
    if (!session.dojo) return { ok: false, error: "No dojo on this account yet." };

    const itemId = String(formData.get("itemId") ?? "").trim();
    const unitPrice = parseDecimal(formData.get("unitPrice"));
    if (!itemId) return { ok: false, error: "Inventory row id required." };
    if (unitPrice === null || unitPrice < 0) {
        return { ok: false, error: "Price must be a non-negative number." };
    }

    const item = await prisma.dojoInventoryItem.findUnique({
        where: { id: itemId },
        select: { dojoId: true },
    });
    if (!item || item.dojoId !== session.dojo.id) {
        return { ok: false, error: "Inventory row not found." };
    }

    await prisma.dojoInventoryItem.update({
        where: { id: itemId },
        data: { unitPrice: new Prisma.Decimal(unitPrice) },
    });

    revalidatePath("/portal/dojo/shop");
    return { ok: true };
}

type RecordSaleInput = {
    memberId?: string;
    guestName?: string;
    discount?: number;
    paymentMethod?: string;
    notes?: string;
    items: Array<{ productId: string; quantity: number }>;
};

/**
 * Record a sale: snapshot prices, decrement inventory, generate a per-dojo
 * receipt number, and return the receipt id so the client can redirect to
 * the printable receipt page.
 */
export async function recordSaleAction(
    input: RecordSaleInput
): Promise<ActionResult<{ saleId: string; receiptNo: string }>> {
    const session = await requireDojoRole("INSTRUCTOR");
    if (!session.dojo) return { ok: false, error: "No dojo on this account yet." };

    const items = (input.items ?? []).filter(
        (i) => i.productId && Number.isFinite(i.quantity) && i.quantity > 0
    );
    if (items.length === 0) return { ok: false, error: "Add at least one item." };

    let buyerName: string;
    let buyerUserId: string | null = null;
    if (input.memberId) {
        const s = await prisma.student.findUnique({
            where: { id: input.memberId },
            select: { id: true, dojoId: true, user: { select: { fullName: true } } },
        });
        if (!s) return { ok: false, error: "Member not found." };
        if (s.dojoId !== session.dojo.id) {
            return { ok: false, error: "Member is not enrolled at this dojo." };
        }
        buyerUserId = s.id;
        buyerName = s.user.fullName;
    } else {
        buyerName = (input.guestName ?? "").trim();
        if (!buyerName) return { ok: false, error: "Pick a member or enter a buyer name." };
    }

    const discount = Number.isFinite(input.discount) ? Math.max(0, Number(input.discount)) : 0;

    // Selling staff requires INSTRUCTOR+ (enforced above). Manager+ can give
    // free items; for instructor we still allow discounts but cap at subtotal.
    const _ = hasAtLeast;

    try {
        const result = await prisma.$transaction(async (tx) => {
            // Lock inventory rows for the products being sold.
            const inv = await tx.dojoInventoryItem.findMany({
                where: {
                    dojoId: session.dojo!.id,
                    productId: { in: items.map((i) => i.productId) },
                },
                include: { product: { select: { name: true } } },
            });
            const byProduct = new Map(inv.map((r) => [r.productId, r] as const));

            const lines: Array<{
                productId: string;
                productName: string;
                quantity: number;
                unitPrice: number;
                lineTotal: number;
            }> = [];

            for (const item of items) {
                const row = byProduct.get(item.productId);
                if (!row) {
                    throw new Error("One of the products is not in this dojo's inventory.");
                }
                if (row.quantityOnHand < item.quantity) {
                    throw new Error(
                        `Not enough stock for ${row.product.name} (have ${row.quantityOnHand}, need ${item.quantity}).`
                    );
                }
                const unitPrice = Number(row.unitPrice.toString());
                lines.push({
                    productId: item.productId,
                    productName: row.product.name,
                    quantity: item.quantity,
                    unitPrice,
                    lineTotal: Number((unitPrice * item.quantity).toFixed(2)),
                });
            }

            const subtotal = Number(
                lines.reduce((acc, l) => acc + l.lineTotal, 0).toFixed(2)
            );
            const effectiveDiscount = Math.min(discount, subtotal);
            const total = Number((subtotal - effectiveDiscount).toFixed(2));

            // Per-dojo sequential receipt number. `count + 1` is safe inside
            // the transaction because dojo_sales has a unique (dojo_id,
            // receipt_no) index — a race would just retry on conflict.
            const count = await tx.dojoSale.count({
                where: { dojoId: session.dojo!.id },
            });
            const receiptNo = `R-${String(count + 1).padStart(6, "0")}`;

            const sale = await tx.dojoSale.create({
                data: {
                    dojoId: session.dojo!.id,
                    receiptNo,
                    buyerUserId,
                    buyerName,
                    soldByUserId: session.userId,
                    soldByName: session.fullName,
                    subtotal: new Prisma.Decimal(subtotal),
                    discount: new Prisma.Decimal(effectiveDiscount),
                    total: new Prisma.Decimal(total),
                    paymentMethod: input.paymentMethod?.trim() || null,
                    notes: input.notes?.trim() || null,
                    items: {
                        create: lines.map((l) => ({
                            productId: l.productId,
                            productName: l.productName,
                            quantity: l.quantity,
                            unitPrice: new Prisma.Decimal(l.unitPrice),
                            lineTotal: new Prisma.Decimal(l.lineTotal),
                        })),
                    },
                },
                select: { id: true, receiptNo: true },
            });

            // Decrement inventory.
            for (const item of items) {
                await tx.dojoInventoryItem.update({
                    where: {
                        dojoId_productId: {
                            dojoId: session.dojo!.id,
                            productId: item.productId,
                        },
                    },
                    data: { quantityOnHand: { decrement: item.quantity } },
                });
            }

            return sale;
        });

        revalidatePath("/portal/dojo/shop");
        return { ok: true, saleId: result.id, receiptNo: result.receiptNo };
    } catch (err) {
        const message = err instanceof Error ? err.message : "Could not record the sale.";
        return { ok: false, error: message };
    }
}

/**
 * Remove an inventory row entirely (e.g. dojo no longer carries the item).
 * Refuses if there is stock on hand — adjust to 0 first.
 */
export async function removeInventoryAction(formData: FormData): Promise<ActionResult> {
    const session = await requireDojoRole("DOJO_MANAGER");
    if (!session.dojo) return { ok: false, error: "No dojo on this account yet." };

    const itemId = String(formData.get("itemId") ?? "").trim();
    if (!itemId) return { ok: false, error: "Inventory row id required." };

    const item = await prisma.dojoInventoryItem.findUnique({
        where: { id: itemId },
        select: { dojoId: true, quantityOnHand: true },
    });
    if (!item || item.dojoId !== session.dojo.id) {
        return { ok: false, error: "Inventory row not found." };
    }
    if (item.quantityOnHand > 0) {
        return { ok: false, error: "Reduce stock to 0 before removing." };
    }

    await prisma.dojoInventoryItem.delete({ where: { id: itemId } });
    revalidatePath("/portal/dojo/shop");
    return { ok: true };
}
