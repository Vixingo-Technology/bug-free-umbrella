"use client";

import {
    createContext,
    useCallback,
    useContext,
    useEffect,
    useMemo,
    useState,
} from "react";

export type CartItem = {
    productId: string;
    name: string;
    price: number;
    imageUrl: string | null;
    quantity: number;
    size?: string | null;
};

// A cart "row" is uniquely identified by product + chosen size.
function rowKey(productId: string, size?: string | null) {
    return `${productId}::${size ?? ""}`;
}

type CartContextValue = {
    items: CartItem[];
    totalCount: number;
    totalAmount: number;
    hydrated: boolean;
    add: (product: Omit<CartItem, "quantity">, quantity?: number) => void;
    remove: (productId: string, size?: string | null) => void;
    setQuantity: (productId: string, quantity: number, size?: string | null) => void;
    clear: () => void;
};

const STORAGE_KEY = "jka:shop:cart:v1";

const CartContext = createContext<CartContextValue | null>(null);

export function CartProvider({ children }: { children: React.ReactNode }) {
    const [items, setItems] = useState<CartItem[]>([]);
    const [hydrated, setHydrated] = useState(false);

    // Hydrate from localStorage on mount.
    useEffect(() => {
        try {
            const raw = localStorage.getItem(STORAGE_KEY);
            if (raw) {
                const parsed = JSON.parse(raw) as CartItem[];
                if (Array.isArray(parsed)) setItems(parsed);
            }
        } catch {
            /* ignore corrupt storage */
        }
        setHydrated(true);
    }, []);

    // Persist changes.
    useEffect(() => {
        if (!hydrated) return;
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
        } catch {
            /* ignore quota errors */
        }
    }, [items, hydrated]);

    const add = useCallback<CartContextValue["add"]>((product, quantity = 1) => {
        const key = rowKey(product.productId, product.size);
        setItems((prev) => {
            const existing = prev.find(
                (i) => rowKey(i.productId, i.size) === key,
            );
            if (existing) {
                return prev.map((i) =>
                    rowKey(i.productId, i.size) === key
                        ? { ...i, quantity: i.quantity + quantity }
                        : i,
                );
            }
            return [...prev, { ...product, quantity }];
        });
    }, []);

    const remove = useCallback<CartContextValue["remove"]>((productId, size) => {
        const key = rowKey(productId, size);
        setItems((prev) => prev.filter((i) => rowKey(i.productId, i.size) !== key));
    }, []);

    const setQuantity = useCallback<CartContextValue["setQuantity"]>(
        (productId, quantity, size) => {
            const key = rowKey(productId, size);
            setItems((prev) =>
                quantity <= 0
                    ? prev.filter((i) => rowKey(i.productId, i.size) !== key)
                    : prev.map((i) =>
                          rowKey(i.productId, i.size) === key
                              ? { ...i, quantity }
                              : i,
                      ),
            );
        },
        [],
    );

    const clear = useCallback(() => setItems([]), []);

    const totalCount = useMemo(
        () => items.reduce((sum, i) => sum + i.quantity, 0),
        [items],
    );
    const totalAmount = useMemo(
        () => items.reduce((sum, i) => sum + i.price * i.quantity, 0),
        [items],
    );

    const value = useMemo(
        () => ({
            items,
            totalCount,
            totalAmount,
            hydrated,
            add,
            remove,
            setQuantity,
            clear,
        }),
        [items, totalCount, totalAmount, hydrated, add, remove, setQuantity, clear],
    );

    return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
    const ctx = useContext(CartContext);
    if (!ctx) throw new Error("useCart must be used inside <CartProvider>");
    return ctx;
}
