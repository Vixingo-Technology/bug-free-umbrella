import type { Metadata } from "next";
import Navbar from "@/components/navbar";
import Footer from "@/components/footer";
import Branches from "@/components/branches";

export const metadata: Metadata = {
    title: "Branches — JKA Bangladesh",
    description:
        "Find a certified JKA Bangladesh dojo near you — over 50 registered branches nationwide.",
};

export default function BranchesPage() {
    return (
        <main className="min-h-screen bg-bg-deep w-full overflow-hidden">
            <Navbar />
            <div className="pt-24">
                <Branches />
            </div>
            <Footer />
        </main>
    );
}
