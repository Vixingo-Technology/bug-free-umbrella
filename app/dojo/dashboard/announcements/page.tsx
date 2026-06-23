import type { Metadata } from "next";
import { Bell, Megaphone, Send } from "lucide-react";
import DojoPageHeader from "@/components/dojo/page-header";
import { requireDojoRole } from "@/lib/dojo-session";

export const metadata: Metadata = {
    title: "Announcements — Dojo Dashboard",
};

const POSTS = [
    {
        title: "Class cancelled — Fri 28 Jun",
        body: "Sensei Karim will be representing the dojo at the JKA national meeting. Friday 6 PM kihon class is cancelled.",
        sentTo: "All members",
        sentAt: "Posted 2 hours ago",
        opens: 41,
    },
    {
        title: "New gi shipment arrived",
        body: "Junior and adult sizes back in stock. Drop by the counter before Saturday's open mat.",
        sentTo: "All members",
        sentAt: "Posted yesterday",
        opens: 39,
    },
    {
        title: "Belt test results — June batch",
        body: "Congratulations to all 14 candidates who passed. Certificates from JKA HQ will arrive within 2 weeks.",
        sentTo: "Brown & above",
        sentAt: "Posted 5 days ago",
        opens: 18,
    },
];

export default async function AnnouncementsPage() {
    await requireDojoRole("DOJO_OWNER");
    return (
        <>
            <DojoPageHeader
                eyebrow="Dojo Head"
                title="Announcements"
                description="Push a message to your members. Delivered via email, in-app notification, and (if configured) WhatsApp."
                actions={
                    <button
                        type="button"
                        className="inline-flex items-center gap-2 bg-accent-red text-white px-4 py-2.5 text-xs font-bold tracking-widest uppercase hover:bg-accent-red/90 transition-colors rounded-sm"
                    >
                        <Megaphone size={14} />
                        New announcement
                    </button>
                }
            />

            <div className="grid lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 bg-white border border-zinc-200 rounded-sm shadow-sm">
                    <div className="px-5 py-4 border-b border-zinc-200">
                        <h3 className="text-xs tracking-widest uppercase font-bold text-zinc-500">
                            Recent posts
                        </h3>
                    </div>
                    <ul className="divide-y divide-zinc-200">
                        {POSTS.map((p) => (
                            <li key={p.title} className="p-5">
                                <div className="flex items-start justify-between gap-4">
                                    <div className="flex-1">
                                        <h4 className="font-serif font-bold text-zinc-900 mb-2">
                                            {p.title}
                                        </h4>
                                        <p className="text-sm text-zinc-600 leading-relaxed mb-3">
                                            {p.body}
                                        </p>
                                        <p className="text-[10px] tracking-widest uppercase font-bold text-zinc-400">
                                            {p.sentAt} · {p.sentTo}
                                        </p>
                                    </div>
                                    <span className="inline-flex items-center gap-1.5 text-xs text-zinc-500 shrink-0">
                                        <Bell size={12} />
                                        {p.opens} opens
                                    </span>
                                </div>
                            </li>
                        ))}
                    </ul>
                </div>

                <div className="bg-white border border-zinc-200 rounded-sm shadow-sm p-5">
                    <h3 className="text-xs tracking-widest uppercase font-bold text-zinc-500 mb-4">
                        Quick post
                    </h3>
                    <input
                        type="text"
                        placeholder="Headline"
                        className="w-full bg-zinc-50 border border-zinc-200 text-zinc-900 px-3 py-2 focus:outline-none focus:border-accent-red text-sm transition-colors rounded-sm mb-3"
                    />
                    <textarea
                        rows={5}
                        placeholder="Write your announcement…"
                        className="w-full bg-zinc-50 border border-zinc-200 text-zinc-900 px-3 py-2 focus:outline-none focus:border-accent-red text-sm transition-colors rounded-sm mb-3"
                    />
                    <button
                        type="button"
                        className="w-full inline-flex items-center justify-center gap-2 bg-accent-red text-white px-4 py-2.5 text-xs font-bold tracking-widest uppercase hover:bg-accent-red/90 transition-colors rounded-sm"
                    >
                        <Send size={14} />
                        Send to all members
                    </button>
                </div>
            </div>
        </>
    );
}
