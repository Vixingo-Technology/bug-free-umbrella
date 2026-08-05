import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowRight, CheckCircle2, Ticket } from "lucide-react";
import { prisma } from "@/lib/prisma";

export const metadata: Metadata = {
    title: "Ticket confirmed — JKA Bangladesh",
    robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

type SearchParams = Promise<{ regId?: string }>;

export default async function EventPaymentSuccessPage({
    searchParams,
}: {
    searchParams: SearchParams;
}) {
    const { regId } = await searchParams;
    if (!regId) redirect("/events");

    const reg = await prisma.eventRegistration.findUnique({
        where: { id: regId },
        select: {
            id: true,
            qrToken: true,
            paymentStatus: true,
            amountDue: true,
            paymentGroupId: true,
            guestName: true,
            user: { select: { fullName: true } },
            event: {
                select: {
                    title: true,
                    eventDate: true,
                    location: true,
                },
            },
        },
    });

    if (!reg) redirect("/events");

    // A multi-division submit splits amountDue across sibling rows sharing
    // paymentGroupId — the paid total is their sum, not this row's slice.
    const paidTotal = reg.paymentGroupId
        ? await prisma.eventRegistration
              .aggregate({
                  where: { paymentGroupId: reg.paymentGroupId },
                  _sum: { amountDue: true },
              })
              .then((r) => (r._sum.amountDue ? Number(r._sum.amountDue) : null))
        : reg.amountDue
          ? Number(reg.amountDue)
          : null;

    const participantName =
        reg.user?.fullName ?? reg.guestName ?? "Participant";
    const eventDate = reg.event.eventDate.toLocaleString("en-GB", {
        day: "numeric",
        month: "long",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
    });

    return (
        <main className="min-h-screen bg-bg-charcoal pb-24 pt-24">
            <div className="mx-auto max-w-xl px-6">
                <div className="rounded-2xl border border-zinc-200 bg-white p-8 shadow-xl md:p-12">
                    <div className="flex flex-col items-center text-center">
                        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-emerald-50 text-emerald-600">
                            <CheckCircle2 size={36} />
                        </div>
                        <p className="mt-6 text-[11px] uppercase tracking-[0.4em] text-emerald-600">
                            Ticket confirmed
                        </p>
                        <h1 className="mt-3 font-serif text-3xl text-zinc-900 md:text-4xl">
                            You&apos;re in, {participantName}!
                        </h1>
                        <p className="mt-3 max-w-md text-sm text-zinc-500">
                            Your payment was received. Show your participation
                            card at the venue for check-in.
                        </p>
                    </div>

                    <div className="mt-8 border-t border-zinc-100 pt-6 text-sm">
                        <div className="flex justify-between mb-2">
                            <span className="text-zinc-500">Event</span>
                            <span className="font-semibold text-zinc-900">
                                {reg.event.title}
                            </span>
                        </div>
                        <div className="flex justify-between mb-2">
                            <span className="text-zinc-500">Date</span>
                            <span className="text-zinc-900">{eventDate}</span>
                        </div>
                        <div className="flex justify-between mb-2">
                            <span className="text-zinc-500">Location</span>
                            <span className="text-zinc-900">
                                {reg.event.location}
                            </span>
                        </div>
                        {paidTotal !== null && (
                            <div className="flex justify-between pt-3 mt-3 border-t border-zinc-100">
                                <span className="text-zinc-500">
                                    Amount paid
                                </span>
                                <span className="font-semibold text-zinc-900">
                                    BDT {paidTotal.toLocaleString()}
                                </span>
                            </div>
                        )}
                    </div>

                    <div className="mt-8 flex flex-col gap-3">
                        <Link
                            href={`/participants/${reg.qrToken}?paid=1`}
                            className="inline-flex items-center justify-center gap-2 rounded-sm bg-accent-red px-6 py-3 text-xs font-semibold uppercase tracking-widest text-white transition hover:bg-accent-red/90"
                        >
                            <Ticket size={14} />
                            View my participation card
                            <ArrowRight size={14} />
                        </Link>
                        <Link
                            href="/events"
                            className="inline-flex items-center justify-center rounded-sm border border-zinc-200 px-6 py-3 text-xs font-semibold uppercase tracking-widest text-zinc-700 transition hover:border-accent-red hover:text-accent-red"
                        >
                            Browse more events
                        </Link>
                    </div>
                </div>
            </div>
        </main>
    );
}
