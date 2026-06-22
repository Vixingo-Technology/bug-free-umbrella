import type { Metadata } from "next";
import Navbar from "@/components/navbar";
import Footer from "@/components/footer";
import Events from "@/components/events";

export const metadata: Metadata = {
    title: "Events — JKA Bangladesh",
    description:
        "Tournaments, gradings, seminars, and training camps hosted by JKA Bangladesh.",
};

export default function EventsPage() {
    return (
        <main className="min-h-screen bg-bg-deep w-full overflow-hidden">
            <Navbar />
            <div className="pt-24">
                <Events />
            </div>
            <Footer />
        </main>
    );
}
