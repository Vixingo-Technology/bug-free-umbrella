import type { Metadata } from "next";
import Navbar from "@/components/navbar";
import Footer from "@/components/footer";
import Techniques from "@/components/techniques";

export const metadata: Metadata = {
    title: "Techniques — JKA Bangladesh",
    description:
        "Kihon, Kata, and Kumite — the three pillars of Shotokan Karate practiced at JKA Bangladesh.",
};

export default function TechniquesPage() {
    return (
        <main className="min-h-screen bg-bg-deep w-full overflow-hidden">
            <Navbar />
            <div className="pt-24">
                <Techniques />
            </div>
            <Footer />
        </main>
    );
}
