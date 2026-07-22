import type { Metadata } from "next";
import Navbar from "@/components/navbar";
import Footer from "@/components/footer";
import AboutSidebar from "@/components/about-sidebar";
import Breadcrumbs from "@/components/breadcrumbs";

import AboutHeader from "@/components/about-header";

export const metadata: Metadata = {
    title: "About the JKA WF Bangladesh| JKA WF Bangladesh",
    description:
        "About the Japan Karate Association World Federation. History, Masters, JKA Karate, and Instructors.",
};

export default function AboutLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <main className="min-h-screen bg-bg-deep w-full flex flex-col">
            <Navbar />

            {/* Hero / Header area for About section */}
            <AboutHeader />

            <section className="flex-1 max-w-6xl w-full mx-auto px-6 lg:px-12 py-12 flex flex-col lg:flex-row gap-12">
                <div className="order-2 lg:order-1 w-full lg:w-auto">
                    <AboutSidebar />
                </div>

                <div className="order-1 lg:order-2 flex-1 w-full overflow-hidden flex flex-col">
                    <div className="bg-white p-1 md:p-12 shadow-sm rounded-sm min-h-[500px]">
                        {children}
                    </div>
                </div>
            </section>

            <Footer />
        </main>
    );
}
