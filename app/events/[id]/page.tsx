import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Calendar, MapPin, Users } from "lucide-react";
import Navbar from "@/components/navbar";
import Footer from "@/components/footer";
import AttachmentViewer from "@/components/attachment-viewer";
import { prisma } from "@/lib/prisma";

type Props = { params: Promise<{ id: string }> };

const CATEGORY_LABEL: Record<string, string> = {
    BELT_TEST: "Belt Test",
    TOURNAMENT: "Tournament",
    SEMINAR: "Seminar",
    TRAINING_CAMP: "Training Camp",
    OTHER: "Event",
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
    const { id } = await params;
    const e = await prisma.event.findUnique({
        where: { id },
        select: { title: true, description: true },
    });
    if (!e) return { title: "Event — JKA Bangladesh" };
    return {
        title: `${e.title} — JKA Bangladesh`,
        description: e.description?.slice(0, 160) ?? undefined,
    };
}

function formatDate(d: Date): string {
    return d.toLocaleString("en-GB", {
        weekday: "long",
        day: "numeric",
        month: "long",
        year: "numeric",
        hour: "numeric",
        minute: "2-digit",
    });
}

export default async function EventDetailPage({ params }: Props) {
    const { id } = await params;
    const e = await prisma.event.findUnique({
        where: { id },
        include: {
            dojo: { select: { id: true, name: true } },
            postedBy: { select: { fullName: true } },
            _count: { select: { registrations: true } },
        },
    });

    if (!e || !e.isPublished) notFound();

    return (
        <main className="min-h-screen bg-bg-deep w-full overflow-hidden">
            <Navbar />
            <article className="pt-32 pb-24">
                <div className="max-w-4xl mx-auto px-6 lg:px-12">
                    <Link
                        href="/events"
                        className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-zinc-500 hover:text-accent-red transition-colors mb-8"
                    >
                        <ArrowLeft size={14} />
                        All announcements & events
                    </Link>

                    <div className="flex flex-wrap items-center gap-2 mb-5">
                        <span className="text-[10px] tracking-widest uppercase font-bold px-3 py-1 rounded-full border border-accent-red/20 bg-accent-red/5 text-accent-red">
                            {CATEGORY_LABEL[e.category] ?? e.category}
                        </span>
                        {e.dojo && (
                            <span className="text-[10px] tracking-widest uppercase font-bold px-3 py-1 rounded-full border border-blue-200 bg-blue-50 text-blue-700">
                                {e.dojo.name}
                            </span>
                        )}
                    </div>

                    <h1 className="font-karate text-3xl md:text-5xl text-zinc-900 mb-6 uppercase tracking-wider font-bold leading-tight">
                        {e.title}
                    </h1>

                    <div className="grid sm:grid-cols-2 gap-4 mb-10 border-b border-zinc-200 pb-6">
                        <div className="flex items-start gap-3">
                            <Calendar
                                size={18}
                                className="text-accent-red mt-0.5 shrink-0"
                            />
                            <div>
                                <p className="text-[10px] tracking-widest uppercase font-bold text-zinc-400 mb-1">
                                    When
                                </p>
                                <p className="text-sm text-zinc-700 font-semibold">
                                    {formatDate(e.eventDate)}
                                </p>
                            </div>
                        </div>
                        {e.location && (
                            <div className="flex items-start gap-3">
                                <MapPin
                                    size={18}
                                    className="text-accent-red mt-0.5 shrink-0"
                                />
                                <div>
                                    <p className="text-[10px] tracking-widest uppercase font-bold text-zinc-400 mb-1">
                                        Where
                                    </p>
                                    <p className="text-sm text-zinc-700 font-semibold">
                                        {e.location}
                                    </p>
                                </div>
                            </div>
                        )}
                        <div className="flex items-start gap-3">
                            <Users
                                size={18}
                                className="text-accent-red mt-0.5 shrink-0"
                            />
                            <div>
                                <p className="text-[10px] tracking-widest uppercase font-bold text-zinc-400 mb-1">
                                    RSVPs
                                </p>
                                <p className="text-sm text-zinc-700 font-semibold">
                                    {e._count.registrations}
                                    {e.maxCapacity
                                        ? ` of ${e.maxCapacity}`
                                        : ""}
                                </p>
                            </div>
                        </div>
                        {e.postedBy?.fullName && (
                            <div className="flex items-start gap-3">
                                <div>
                                    <p className="text-[10px] tracking-widest uppercase font-bold text-zinc-400 mb-1">
                                        Posted by
                                    </p>
                                    <p className="text-sm text-zinc-700 font-semibold">
                                        {e.postedBy.fullName}
                                    </p>
                                </div>
                            </div>
                        )}
                    </div>

                    {e.description && (
                        <div className="prose prose-zinc max-w-none mb-10 text-zinc-700 leading-relaxed whitespace-pre-line text-base md:text-lg">
                            {e.description}
                        </div>
                    )}

                    {e.attachmentUrl && e.attachmentType && (
                        <div className="mt-8">
                            <AttachmentViewer
                                url={e.attachmentUrl}
                                type={e.attachmentType}
                                title={e.title}
                            />
                        </div>
                    )}
                </div>
            </article>
            <Footer />
        </main>
    );
}
