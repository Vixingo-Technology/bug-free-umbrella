"use client";

import { useEffect } from "react";
import { useCart } from "./cart-context";

export default function ClearCartOnMount() {
    const { clear, hydrated } = useCart();
    useEffect(() => {
        if (hydrated) clear();
    }, [hydrated, clear]);
    return null;
}
