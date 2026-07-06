import { CartProvider } from "@/components/shop/cart-context";
import FloatingCart from "@/components/shop/floating-cart";
import Navbar from "@/components/navbar";
import Footer from "@/components/footer";

export default function ShopLayout({ children }: { children: React.ReactNode }) {
    return (
        <CartProvider>
            <Navbar />
            {children}
            <FloatingCart />
            <Footer />
        </CartProvider>
    );
}
