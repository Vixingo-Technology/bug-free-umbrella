import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
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

            {/* Enlist your dojo CTA */}
            <section className="py-24 bg-bg-deep border-t border-zinc-200">
                <div className="max-w-5xl mx-auto px-6 lg:px-12">
                    <div className="bg-white border border-zinc-200 rounded-sm shadow-sm p-10 md:p-14 flex flex-col md:flex-row md:items-center md:justify-between gap-8">
                        <div className="max-w-2xl">
                            <p className="text-xs tracking-[0.4em] uppercase text-accent-red font-bold mb-4">
                                For dojo owners
                            </p>
                            <h2 className="font-karate text-2xl md:text-3xl font-bold text-zinc-900 uppercase tracking-wider mb-4">
                                Run a dojo?{" "}
                                <span className="text-accent-red italic lowercase font-serif font-normal">
                                    Enlist with us.
                                </span>
                            </h2>
                            <p className="text-zinc-600 leading-relaxed">
                                Affiliate your dojo with JKA Bangladesh to
                                certify your students, host official gradings,
                                and access our digital student management
                                portal.
                            </p>
                        </div>
                        <Link
                            href="/enlist-dojo"
                            className="inline-flex items-center gap-3 bg-accent-red text-white px-8 py-4 text-xs font-bold tracking-widest uppercase hover:bg-accent-red/90 transition-colors group shrink-0"
                        >
                            Enlist Your Dojo
                            <ArrowRight
                                size={16}
                                className="group-hover:translate-x-1 transition-transform"
                            />
                        </Link>
                    </div>
                </div>
            </section>

            <Footer />
        </main>
    );
}
