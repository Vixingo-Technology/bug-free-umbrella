import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, MapPin, Users } from "lucide-react";
import Navbar from "@/components/navbar";
import Footer from "@/components/footer";
import { prisma } from "@/lib/prisma";

export const metadata: Metadata = {
    title: "Branches — JKA Bangladesh",
    description:
        "Find a certified JKA Bangladesh dojo near you — explore active branches nationwide.",
};

export const dynamic = "force-dynamic";

type DojoCard = {
    id: string;
    name: string;
    city: string | null;
    address: string | null;
    logoUrl: string | null;
    studentCount: number;
};

async function loadActiveDojos(): Promise<DojoCard[]> {
    try {
        const rows = await prisma.dojo.findMany({
            where: { isActive: true },
            orderBy: [{ city: "asc" }, { name: "asc" }],
            select: {
                id: true,
                name: true,
                city: true,
                address: true,
                logoUrl: true,
            },
        });
        const counts = await Promise.all(
            rows.map((d) =>
                prisma.member.count({
                    where: { dojoId: d.id, isActive: true },
                }),
            ),
        );
        return rows.map((d, i) => ({
            id: d.id,
            name: d.name,
            city: d.city,
            address: d.address,
            logoUrl: d.logoUrl,
            studentCount: counts[i],
        }));
    } catch {
        return [];
    }
}

export default async function BranchesPage() {
    const dojos = await loadActiveDojos();

    return (
        <main className="min-h-screen bg-bg-deep w-full overflow-hidden">
            <Navbar />

            <section className="pt-32 pb-12 bg-bg-charcoal border-b border-zinc-200">
                <div className="max-w-7xl mx-auto px-6 lg:px-12">
                    <p className="text-xs tracking-[0.4em] uppercase text-accent-red font-bold mb-4">
                        Nationwide network
                    </p>
                    <h1 className="font-karate text-3xl md:text-5xl text-zinc-900 mb-6 uppercase tracking-widest font-bold">
                        Our Branches
                    </h1>
                    <div className="h-px w-24 bg-accent-red mb-6" />
                    <p className="text-zinc-650 max-w-2xl leading-relaxed">
                        {dojos.length} active {dojos.length === 1 ? "dojo" : "dojos"} across Bangladesh.
                        Tap a branch to view its profile, instructors, and students.
                    </p>
                </div>
            </section>

            <section className="py-16 bg-bg-charcoal">
                <div className="max-w-7xl mx-auto px-6 lg:px-12">
                    {dojos.length === 0 ? (
                        <div className="bg-white border border-zinc-200 rounded-sm p-12 text-center">
                            <p className="text-zinc-500 text-sm tracking-widest uppercase font-bold">
                                No active branches yet
                            </p>
                            <p className="text-zinc-500 mt-2 text-sm">
                                Check back soon — dojos are being onboarded.
                            </p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                            {dojos.map((d) => (
                                <DojoCardItem key={d.id} dojo={d} />
                            ))}
                        </div>
                    )}
                </div>
            </section>

            <section className="py-24 bg-bg-deep border-t border-zinc-200">
                <div className="max-w-5xl mx-auto px-6 lg:px-12">
                    <div className="bg-white border border-zinc-200 rounded-sm shadow-sm p-10 md:p-14 flex flex-col md:flex-row md:items-center md:justify-between gap-8">
                        <div className="max-w-2xl">
                            <p className="text-xs tracking-[0.4em] uppercase text-accent-red font-bold mb-4">
                                For dojo owners
                            </p>
                            <h2 className="font-karate text-2xl md:text-3xl font-bold text-zinc-900 uppercase tracking-wider leading-[1.15] mb-4">
                                Run a dojo?{" "}
                                <span className="text-accent-red italic lowercase font-serif font-normal">
                                    Enlist with us.
                                </span>
                            </h2>
                            <p className="text-zinc-600 leading-relaxed">
                                Affiliate your dojo with JKA Bangladesh to certify your
                                students, host official gradings, and access our digital
                                student management portal.
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

function DojoCardItem({ dojo }: { dojo: DojoCard }) {
    const initial = dojo.name.charAt(0).toUpperCase();
    return (
        <Link
            href={`/branches/${dojo.id}`}
            className="group bg-white border border-zinc-200 rounded-sm shadow-sm hover:shadow-md hover:border-zinc-300 transition-all flex flex-col overflow-hidden"
        >
            <div className="relative h-32 bg-gradient-to-br from-zinc-900 via-zinc-800 to-zinc-900 flex items-center justify-center">
                <div className="absolute inset-0 bg-accent-red/10" />
                <div className="relative w-20 h-20 rounded-full bg-white border-4 border-white shadow-lg flex items-center justify-center overflow-hidden">
                    {dojo.logoUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                            src={dojo.logoUrl}
                            alt={`${dojo.name} logo`}
                            className="w-full h-full object-cover"
                        />
                    ) : (
                        <span className="text-2xl font-karate font-bold text-zinc-900">
                            {initial}
                        </span>
                    )}
                </div>
            </div>
            <div className="p-5 flex-1 flex flex-col">
                <h3 className="font-karate text-lg font-bold text-zinc-900 uppercase tracking-wide leading-tight group-hover:text-accent-red transition-colors">
                    {dojo.name}
                </h3>
                {dojo.city && (
                    <p className="flex items-center gap-1.5 text-xs text-zinc-500 mt-2 tracking-widest uppercase font-bold">
                        <MapPin size={12} className="text-accent-red" />
                        {dojo.city}
                    </p>
                )}
                {dojo.address && (
                    <p className="text-sm text-zinc-600 mt-2 line-clamp-2 leading-snug">
                        {dojo.address}
                    </p>
                )}
                <div className="mt-auto pt-4 flex items-center justify-between border-t border-zinc-100 mt-4">
                    <span className="flex items-center gap-1.5 text-xs text-zinc-500">
                        <Users size={12} />
                        <span className="font-mono font-bold text-zinc-700">
                            {dojo.studentCount}
                        </span>
                        {dojo.studentCount === 1 ? "student" : "students"}
                    </span>
                    <span className="text-xs font-bold tracking-widest uppercase text-accent-red inline-flex items-center gap-1 group-hover:gap-2 transition-all">
                        View
                        <ArrowRight size={12} />
                    </span>
                </div>
            </div>
        </Link>
    );
}
