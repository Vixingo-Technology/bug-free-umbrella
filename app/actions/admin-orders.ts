"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/admin-guard";

type ActionResult = { ok: true } | { ok: false; error: string };

const STATUSES = ["PENDING", "PAID", "FAILED", "REFUNDED"] as const;
type Status = (typeof STATUSES)[number];

const FULFILLMENT_STATUSES = ["PREPARING", "IN_TRANSIT", "DELIVERED", "RETURNED"] as const;
type FulfillmentStatus = (typeof FULFILLMENT_STATUSES)[number];

export async function updateOrderStatusAction(formData: FormData): Promise<ActionResult> {
    await requireAdmin();

    const id = formData.get("id") as string;
    const status = formData.get("status") as Status;

    if (!id) return { ok: false, error: "Order id is required." };
    if (!STATUSES.includes(status)) return { ok: false, error: "Invalid status." };

    await prisma.shopOrder.update({
        where: { id },
        data: { paymentStatus: status },
    });

    revalidatePath("/portal/admin/orders");
    return { ok: true };
}

export async function updateOrderFulfillmentAction(formData: FormData): Promise<ActionResult> {
    await requireAdmin();

    const id = formData.get("id") as string;
    const status = formData.get("status") as FulfillmentStatus;

    if (!id) return { ok: false, error: "Order id is required." };
    if (!FULFILLMENT_STATUSES.includes(status)) return { ok: false, error: "Invalid fulfillment status." };

    await prisma.shopOrder.update({
        where: { id },
        data: { fulfillmentStatus: status },
    });

    revalidatePath("/portal/admin/orders");
    return { ok: true };
}

export async function updateOrderNotesAction(formData: FormData): Promise<ActionResult> {
    await requireAdmin();
    const id = formData.get("id") as string;
    const notes = ((formData.get("notes") as string) ?? "").trim() || null;
    if (!id) return { ok: false, error: "Order id is required." };

    await prisma.shopOrder.update({
        where: { id },
        data: { notes },
    });

    revalidatePath("/portal/admin/orders");
    return { ok: true };
}
