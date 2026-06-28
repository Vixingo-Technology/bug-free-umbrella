import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Calendar, ExternalLink } from "lucide-react";
import Navbar from "@/components/navbar";
import Footer from "@/components/footer";
import AttachmentViewer from "@/components/attachment-viewer";
import { prisma } from "@/lib/prisma";

type Props = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
    const { id } = await params;
    const a = await prisma.announcement.findUnique({
        where: { id },
        select: { title: true, body: true },
    });
    if (!a) return { title: "Announcement — JKA Bangladesh" };
    return {
        title: `${a.title} — JKA Bangladesh`,
        description: a.body?.slice(0, 160) ?? undefined,
    };
}

function formatDate(d: Date): string {
    return d.toLocaleDateString("en-GB", {
        weekday: "long",
        day: "numeric",
        month: "long",
        year: "numeric",
    });
}

export default async function AnnouncementDetailPage({ params }: Props) {
    const { id } = await params;
    const a = await prisma.announcement.findUnique({
        where: { id },
        include: {
            dojo: { select: { id: true, name: true } },
            postedBy: { select: { fullName: true } },
        },
    });

    if (!a || !a.isPublished) notFound();

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
                            Announcement
                        </span>
                        {a.dojo && (
                            <span className="text-[10px] tracking-widest uppercase font-bold px-3 py-1 rounded-full border border-blue-200 bg-blue-50 text-blue-700">
                                {a.dojo.name}
                            </span>
                        )}
                    </div>

                    <h1 className="font-karate text-3xl md:text-5xl text-zinc-900 mb-6 uppercase tracking-wider font-bold leading-tight">
                        {a.title}
                    </h1>

                    <div className="flex flex-wrap items-center gap-5 text-xs text-zinc-500 mb-10 border-b border-zinc-200 pb-6">
                        <span className="inline-flex items-center gap-2">
                            <Calendar size={14} className="text-accent-red" />
                            {formatDate(a.publishedAt)}
                        </span>
                        {a.postedBy?.fullName && (
                            <span className="font-semibold text-zinc-600">
                                Posted by {a.postedBy.fullName}
                            </span>
                        )}
                    </div>

                    {a.body && (
                        <div className="prose prose-zinc max-w-none mb-10 text-zinc-700 leading-relaxed whitespace-pre-line text-base md:text-lg">
                            {a.body}
                        </div>
                    )}

                    {a.link && (
                        <a
                            href={a.link}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-2 text-accent-red font-semibold hover:underline mb-10"
                        >
                            <ExternalLink size={16} />
                            {a.link}
                        </a>
                    )}

                    {a.attachmentUrl && a.attachmentType && (
                        <div className="mt-8">
                            <AttachmentViewer
                                url={a.attachmentUrl}
                                type={a.attachmentType}
                                title={a.title}
                            />
                        </div>
                    )}
                </div>
            </article>
            <Footer />
        </main>
    );
}
