import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { CheckCircle2, AlertCircle, ArrowRight } from "lucide-react";
import Navbar from "@/components/navbar";
import Footer from "@/components/footer";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { checkInParticipantAction } from "@/app/actions/event-registration";

type Props = { params: Promise<{ token: string }> };

export const metadata: Metadata = {
    title: "Check in — JKA Bangladesh",
};

export const dynamic = "force-dynamic";

function formatTime(d: Date): string {
    return d.toLocaleString("en-GB", {
        day: "numeric",
        month: "short",
        year: "numeric",
        hour: "numeric",
        minute: "2-digit",
    });
}

export default async function CheckInPage({ params }: Props) {
    const { token } = await params;

    // Require sign-in. If signed out, send them through login and back here.
    const supabase = await createClient();
    const {
        data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
        redirect(`/login?next=/check-in/${encodeURIComponent(token)}`);
    }

    const me = await prisma.member.findUnique({
        where: { id: user.id },
        select: { role: true, fullName: true },
    });

    // Non-authority viewer (e.g. a regular STUDENT scans their own QR): bounce
    // them to their participation card instead.
    if (!me || (me.role !== "ADMIN" && me.role !== "DOJO_OWNER")) {
        redirect(`/participants/${encodeURIComponent(token)}`);
    }

    const result = await checkInParticipantAction(token);

    return (
        <main className="min-h-screen bg-bg-deep w-full overflow-hidden">
            <Navbar />
            <section className="pt-32 pb-24">
                <div className="max-w-xl mx-auto px-6 lg:px-12">
                    {result.ok ? (
                        <div className="bg-white border border-zinc-200 rounded-sm shadow-lg overflow-hidden">
                            <div
                                className={`px-6 py-8 text-center ${
                                    result.alreadyCheckedIn
                                        ? "bg-amber-50 border-b border-amber-200"
                                        : "bg-emerald-50 border-b border-emerald-200"
                                }`}
                            >
                                <CheckCircle2
                                    size={48}
                                    className={`mx-auto mb-3 ${
                                        result.alreadyCheckedIn
                                            ? "text-amber-600"
                                            : "text-emerald-600"
                                    }`}
                                />
                                <p
                                    className={`text-[10px] tracking-widest uppercase font-bold mb-2 ${
                                        result.alreadyCheckedIn
                                            ? "text-amber-700"
                                            : "text-emerald-700"
                                    }`}
                                >
                                    {result.alreadyCheckedIn
                                        ? "Already checked in"
                                        : "Checked in"}
                                </p>
                                <h1 className="font-karate text-2xl md:text-3xl text-zinc-900 uppercase tracking-wider font-bold leading-tight">
                                    {result.participantName}
                                </h1>
                            </div>
                            <div className="px-6 py-6 space-y-3">
                                <div>
                                    <p className="text-[10px] tracking-widest uppercase font-bold text-zinc-400 mb-1">
                                        Event
                                    </p>
                                    <p className="text-base font-semibold text-zinc-900">
                                        {result.eventTitle}
                                    </p>
                                </div>
                                <div>
                                    <p className="text-[10px] tracking-widest uppercase font-bold text-zinc-400 mb-1">
                                        {result.alreadyCheckedIn
                                            ? "Original check-in"
                                            : "Check-in time"}
                                    </p>
                                    <p className="text-sm text-zinc-700">
                                        {formatTime(result.checkedInAt)}
                                    </p>
                                </div>
                                <div>
                                    <p className="text-[10px] tracking-widest uppercase font-bold text-zinc-400 mb-1">
                                        Authority
                                    </p>
                                    <p className="text-sm text-zinc-700">
                                        {me.fullName}
                                    </p>
                                </div>

                                <div className="pt-4 border-t border-zinc-150 grid sm:grid-cols-2 gap-3">
                                    <Link
                                        href={`/portal/admin/events/${result.eventId}/participants`}
                                        className="inline-flex items-center justify-center gap-2 bg-accent-red text-white px-4 py-2.5 text-xs font-bold tracking-widest uppercase hover:bg-accent-red/90 transition-colors rounded-sm"
                                    >
                                        Open participants
                                        <ArrowRight size={12} />
                                    </Link>
                                    <Link
                                        href={`/events/${result.eventId}`}
                                        className="inline-flex items-center justify-center gap-2 border border-zinc-300 text-zinc-700 hover:border-accent-red hover:text-accent-red px-4 py-2.5 text-xs font-bold tracking-widest uppercase rounded-sm transition-colors"
                                    >
                                        View event
                                    </Link>
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="bg-white border border-zinc-200 rounded-sm shadow-lg px-6 py-8 text-center">
                            <AlertCircle
                                size={48}
                                className="mx-auto mb-3 text-red-600"
                            />
                            <p className="text-[10px] tracking-widest uppercase font-bold text-red-700 mb-2">
                                Check-in failed
                            </p>
                            <p className="text-base font-semibold text-zinc-900 mb-4">
                                {result.error}
                            </p>
                            <Link
                                href="/portal"
                                className="inline-flex items-center justify-center gap-2 border border-zinc-300 text-zinc-700 hover:border-accent-red hover:text-accent-red px-4 py-2.5 text-xs font-bold tracking-widest uppercase rounded-sm transition-colors"
                            >
                                Back to portal
                            </Link>
                        </div>
                    )}
                </div>
            </section>
            <Footer />
        </main>
    );
}
