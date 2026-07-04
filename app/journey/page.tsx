import type { Metadata } from "next";
import Navbar from "@/components/navbar";
import Footer from "@/components/footer";
import Journey from "@/components/journey";
import Techniques from "@/components/techniques";

export const metadata: Metadata = {
    title: "Journey — JKA Bangladesh",
    description:
        "Follow the path from white belt to black belt — the structured Shotokan ranking journey and the three pillars of practice at JKA Bangladesh.",
};

export default function JourneyPage() {
    return (
        <main className="min-h-screen bg-bg-deep w-full overflow-hidden">
            <Navbar />
            <div className="pt-24">
                <Journey />
                <Techniques />
            </div>
            <Footer />
        </main>
    );
}
