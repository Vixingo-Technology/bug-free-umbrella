import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { notifyAdmins } from "@/lib/notify";

// Called by SSLCommerz after a successful guest shop-order payment. We
// validate the IPN (or dev-bypass with GET when no gateway is configured),
// mark the order paid, then redirect the buyer to /shop/thank-you.

async function finalizeShopOrder(orderId: string, valId: string | null) {
    const order = await prisma.shopOrder.findUnique({ where: { id: orderId } });
    if (!order || order.paymentStatus === "PAID") return;

    await prisma.shopOrder.update({
        where: { id: orderId },
        data: {
            paymentStatus: "PAID",
            transactionId: valId ?? order.transactionId,
        },
    });

    // Decrement stock for each item — safe here because the order just landed.
    const items = await prisma.shopOrderItem.findMany({
        where: { orderId },
    });
    await Promise.all(
        items.map((it) =>
            prisma.shopProduct
                .update({
                    where: { id: it.productId },
                    data: { stock: { decrement: it.quantity } },
                })
                .catch(() => null),
        ),
    );

    try {
        await notifyAdmins({
            title: "Shop order paid",
            message: `${order.guestName ?? "A customer"} paid BDT ${Number(order.total).toLocaleString()} for a shop order.`,
            type: "PAYMENT",
            link: "/portal/admin/orders",
        });
    } catch {
        /* best-effort */
    }
}

export async function POST(request: Request) {
    try {
        const formData = await request.formData();
        const valId = (formData.get("val_id") as string) ?? null;
        const tranId = formData.get("tran_id") as string;
        const url = new URL(request.url);
        const orderId = url.searchParams.get("orderId") ?? tranId;

        const storeId = process.env.SSLCOMMERZ_STORE_ID;
        const storePassword = process.env.SSLCOMMERZ_STORE_PASSWORD;
        const isSandbox = process.env.SSLCOMMERZ_ENV !== "live";

        if (!storeId || !storePassword) {
            await finalizeShopOrder(orderId, valId);
            return NextResponse.redirect(
                new URL(`/shop/thank-you?orderId=${orderId}`, request.url),
            );
        }

        const validateUrl = `https://${isSandbox ? "sandbox" : "securepay"}.sslcommerz.com/validator/api/validationserverAPI.php?val_id=${valId}&store_id=${storeId}&store_passwd=${storePassword}&v=1&format=json`;
        const validation = await fetch(validateUrl);
        const json = await validation.json();

        if (json.status !== "VALID" && json.status !== "VALIDATED") {
            return NextResponse.redirect(
                new URL(`/shop/failed?orderId=${orderId}`, request.url),
            );
        }

        await finalizeShopOrder(orderId, valId);
        return NextResponse.redirect(
            new URL(`/shop/thank-you?orderId=${orderId}`, request.url),
        );
    } catch (err) {
        console.error("SSLCommerz shop-success webhook error:", err);
        return NextResponse.redirect(new URL("/shop", request.url));
    }
}

// Dev bypass — SSLCommerz not configured, initiator redirects here with GET.
export async function GET(request: Request) {
    const url = new URL(request.url);
    const orderId = url.searchParams.get("orderId");
    if (!orderId) return NextResponse.redirect(new URL("/shop", request.url));
    await finalizeShopOrder(orderId, null);
    return NextResponse.redirect(
        new URL(`/shop/thank-you?orderId=${orderId}`, request.url),
    );
}
