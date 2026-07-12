"use client";

import { useEffect } from "react";
import { useCart } from "./cart-context";

export default function ClearCartOnMount() {
    const { clear, hydrated } = useCart();
    useEffect(() => {
        if (!hydrated) return;
        clear();
        // The order landed — wipe the saved delivery form and pending order id
        // so the next checkout starts fresh.
        try {
            localStorage.removeItem("jka:shop:checkout-form:v1");
            localStorage.removeItem("jka:shop:pending-order-id:v1");
        } catch {
            /* ignore */
        }
    }, [hydrated, clear]);
    return null;
}
