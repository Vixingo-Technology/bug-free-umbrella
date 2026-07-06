"use server";

import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { notifyAdmins } from "@/lib/notify";

export type CheckoutItem = {
    productId: string;
    quantity: number;
    size?: string | null;
};

export type CheckoutInput = {
    fullName: string;
    phone: string;
    address: string;
    email?: string;
    notes?: string;
    items: CheckoutItem[];
};

export type CheckoutResult = { error?: string };

// ─── Place order + start SSLCommerz session ────────────────────────────────

export async function placeGuestOrderAction(
    input: CheckoutInput,
): Promise<CheckoutResult> {
    const name = input.fullName?.trim();
    const phone = input.phone?.trim();
    const address = input.address?.trim();
    const email = input.email?.trim() || null;

    if (!name || name.length < 2) return { error: "Please enter your full name." };
    if (!phone || phone.length < 7)
        return { error: "Please enter a valid phone number." };
    if (!address || address.length < 5)
        return { error: "Please enter a delivery address." };
    if (!input.items?.length) return { error: "Your cart is empty." };

    // Load fresh product data — never trust client-supplied prices.
    const productIds = input.items.map((i) => i.productId);
    const products = await prisma.shopProduct.findMany({
        where: { id: { in: productIds }, isActive: true },
    });
    if (products.length !== productIds.length) {
        return { error: "One or more items are no longer available." };
    }

    let total = 0;
    let sizeMissing = false;
    let sizeInvalid = false;
    const itemRows = input.items.map((it) => {
        const product = products.find((p) => p.id === it.productId)!;
        const qty = Math.max(1, Math.floor(it.quantity));
        const unitPrice = Number(product.price);
        total += unitPrice * qty;

        let size: string | null = null;
        if (product.hasSizes && product.sizes.length > 0) {
            if (!it.size) sizeMissing = true;
            else if (!product.sizes.includes(it.size)) sizeInvalid = true;
            else size = it.size;
        }

        return { productId: product.id, quantity: qty, unitPrice, size };
    });

    if (sizeMissing)
        return { error: "One of your items is missing a size selection." };
    if (sizeInvalid)
        return { error: "One of your items has an unknown size. Please re-add it." };

    if (total <= 0) return { error: "Order total is invalid." };

    const order = await prisma.shopOrder.create({
        data: {
            userId: null,
            isGuestOrder: true,
            guestName: name,
            guestPhone: phone,
            guestAddress: address,
            guestEmail: email,
            total,
            currency: "BDT",
            notes: input.notes?.trim() || null,
            orderItems: { create: itemRows },
        },
    });

    // Notify admins so someone can pack + dispatch.
    try {
        await notifyAdmins({
            title: "New shop order",
            message: `${name} placed an order worth BDT ${total.toLocaleString()}.`,
            type: "PAYMENT",
            link: "/portal/admin/orders",
        });
    } catch {
        /* notifications are best-effort */
    }

    // ─── Start SSLCommerz session ─────────────────────────────────────────
    const storeId = process.env.SSLCOMMERZ_STORE_ID;
    const storePassword = process.env.SSLCOMMERZ_STORE_PASSWORD;
    const isSandbox = process.env.SSLCOMMERZ_ENV !== "live";
    const appUrl = process.env.APP_URL ?? "http://localhost:3000";

    // Dev bypass — no gateway credentials configured.
    if (!storeId || storeId === "your-sslcommerz-store-id" || !storePassword) {
        redirect(
            `/api/webhooks/sslcommerz/shop-success?orderId=${order.id}&dev=1`,
        );
    }

    const baseUrl = isSandbox
        ? "https://sandbox.sslcommerz.com/gwprocess/v4/api.php"
        : "https://securepay.sslcommerz.com/gwprocess/v4/api.php";

    const params = new URLSearchParams({
        store_id: storeId,
        store_passwd: storePassword,
        total_amount: total.toFixed(2),
        currency: "BDT",
        tran_id: order.id,
        success_url: `${appUrl}/api/webhooks/sslcommerz/shop-success?orderId=${order.id}`,
        fail_url: `${appUrl}/shop/failed?orderId=${order.id}`,
        cancel_url: `${appUrl}/shop/failed?orderId=${order.id}&cancelled=1`,
        ipn_url: `${appUrl}/api/webhooks/sslcommerz`,
        cus_name: name,
        cus_email: email ?? "shop@jkabangladesh.com",
        cus_phone: phone,
        cus_add1: address,
        cus_city: "Dhaka",
        cus_postcode: "1000",
        cus_country: "Bangladesh",
        shipping_method: "Courier",
        ship_name: name,
        ship_add1: address,
        ship_city: "Dhaka",
        ship_postcode: "1000",
        ship_country: "Bangladesh",
        product_name: "JKA Shop Order",
        product_category: "Merchandise",
        product_profile: "physical-goods",
        num_of_item: String(itemRows.length),
    });

    try {
        const res = await fetch(baseUrl, {
            method: "POST",
            headers: { "Content-Type": "application/x-www-form-urlencoded" },
            body: params.toString(),
        });
        const json = await res.json();
        if (json.status === "SUCCESS" && json.GatewayPageURL) {
            redirect(json.GatewayPageURL);
        }
        return {
            error: json.failedreason ?? "Payment gateway error. Please try again.",
        };
    } catch (err: unknown) {
        if (
            err &&
            typeof err === "object" &&
            "digest" in err &&
            typeof (err as { digest?: string }).digest === "string" &&
            (err as { digest: string }).digest.startsWith("NEXT_REDIRECT")
        ) {
            throw err;
        }
        return { error: "Failed to reach the payment gateway. Please try again." };
    }
}
