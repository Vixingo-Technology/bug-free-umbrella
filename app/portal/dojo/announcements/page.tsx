import type { Metadata } from "next";
import DojoPageHeader from "@/components/dojo/page-header";
import AnnouncementForm from "@/components/dojo/announcements/announcement-form";
import DeleteAnnouncementButton from "@/components/dojo/announcements/delete-button";
import PostedNewTabs, { type TabValue } from "@/components/portal/posted-new-tabs";
import Pager from "@/components/portal/pager";
import { requireDojoRole } from "@/lib/dojo-session";
import { prisma } from "@/lib/prisma";

export const metadata: Metadata = {
    title: "Announcements — Dojo Dashboard",
};

export const dynamic = "force-dynamic";

const BASE = "/portal/dojo/announcements";
const PAGE_SIZE = 8;

function formatPostedAt(date: Date): string {
    const diff = Date.now() - date.getTime();
    const minutes = Math.round(diff / 60_000);
    if (minutes < 60) return `Posted ${minutes}m ago`;
    const hours = Math.round(minutes / 60);
    if (hours < 24) return `Posted ${hours}h ago`;
    const days = Math.round(hours / 24);
    if (days < 7) return `Posted ${days}d ago`;
    return `Posted ${date.toLocaleDateString("en-GB", { day: "numeric", month: "short" })}`;
}

export default async function AnnouncementsPage({
    searchParams,
}: {
    searchParams: Promise<{ tab?: string; page?: string }>;
}) {
    const session = await requireDojoRole("DOJO_OWNER");
    const sp = await searchParams;
    const tab: TabValue = sp.tab === "new" ? "new" : "posted";
    const page = Math.max(1, Number.parseInt(sp.page ?? "1", 10) || 1);

    const total = session.dojo
        ? await prisma.announcement.count({ where: { dojoId: session.dojo.id } })
        : 0;
    const pageCount = Math.max(1, Math.ceil(total / PAGE_SIZE));
    const safePage = Math.min(page, pageCount);

    const posts =
        tab === "posted" && session.dojo
            ? await prisma.announcement.findMany({
                  where: { dojoId: session.dojo.id },
                  orderBy: { publishedAt: "desc" },
                  take: PAGE_SIZE,
                  skip: (safePage - 1) * PAGE_SIZE,
              })
            : [];

    return (
        <>
            <DojoPageHeader
                eyebrow="Dojo Head"
                title="Announcements"
                description="Post a message to your dojo. Published announcements appear on your dojo page and the federation landing page."
            />

            <PostedNewTabs current={tab} basePath={BASE} postedCount={total} />

            {tab === "new" ? (
                <div className="max-w-2xl">
                    <AnnouncementForm
                        eyebrow="New dojo announcement"
                        redirectAfter={BASE}
                    />
                </div>
            ) : (
                <div className="bg-white border border-zinc-200 rounded-sm shadow-sm">
                    <div className="px-5 py-4 border-b border-zinc-200">
                        <h3 className="text-xs tracking-widest uppercase font-bold text-zinc-500">
                            Recent posts
                        </h3>
                    </div>
                    {posts.length === 0 ? (
                        <p className="p-8 text-sm text-zinc-500 text-center">
                            No announcements yet. Switch to <b>New</b> to publish your first.
                        </p>
                    ) : (
                        <ul className="divide-y divide-zinc-200">
                            {posts.map((p) => (
                                <li key={p.id} className="p-5">
                                    <div className="flex items-start justify-between gap-4">
                                        <div className="flex-1">
                                            <h4 className="font-serif font-bold text-zinc-900 mb-2">
                                                {p.title}
                                            </h4>
                                            {p.body && (
                                                <p className="text-sm text-zinc-600 leading-relaxed mb-3 whitespace-pre-line">
                                                    {p.body}
                                                </p>
                                            )}
                                            <p className="text-[10px] tracking-widest uppercase font-bold text-zinc-400">
                                                {formatPostedAt(p.publishedAt)} ·{" "}
                                                {p.isPublished ? "Published" : "Hidden"}
                                            </p>
                                        </div>
                                        <DeleteAnnouncementButton id={p.id} />
                                    </div>
                                </li>
                            ))}
                        </ul>
                    )}
                </div>
            )}

            {tab === "posted" && (
                <Pager page={safePage} pageCount={pageCount} basePath={BASE} />
            )}
        </>
    );
}
