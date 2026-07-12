import type { Metadata } from "next";
import CheckoutClient from "@/components/shop/checkout-client";

export const metadata: Metadata = {
    title: "Checkout — JKA Bangladesh Shop",
};

export default async function ShopCheckoutPage({
    searchParams,
}: {
    searchParams: Promise<{ failed?: string; orderId?: string }>;
}) {
    const { failed, orderId } = await searchParams;
    return (
        <CheckoutClient
            paymentFailed={failed === "1"}
            resumedOrderId={orderId?.trim() || null}
        />
    );
}
