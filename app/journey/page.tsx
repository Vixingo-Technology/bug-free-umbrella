import type { Metadata } from "next";
import Navbar from "@/components/navbar";
import Footer from "@/components/footer";
import Journey from "@/components/journey";

export const metadata: Metadata = {
    title: "Journey — JKA Bangladesh",
    description:
        "Follow the path from white belt to black belt — the structured Shotokan ranking journey at JKA Bangladesh.",
};

export default function JourneyPage() {
    return (
        <main className="min-h-screen bg-bg-deep w-full overflow-hidden">
            <Navbar />
            <div className="pt-24">
                <Journey />
            </div>
            <Footer />
        </main>
    );
}
