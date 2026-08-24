import type { Metadata } from "next";
import Link from "next/link";
import { Mail, RefreshCcw, XCircle } from "lucide-react";
import { prisma } from "@/lib/prisma";

export const metadata: Metadata = {
    title: "Divisions not added — JKA Bangladesh",
    robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

type SearchParams = Promise<{
    regId?: string;
    eventId?: string;
    reason?: string;
    cancelled?: string;
}>;

export default async function AddDivisionsFailedPage({
    searchParams,
}: {
    searchParams: SearchParams;
}) {
    const { regId, eventId: eventIdFromQuery, reason, cancelled } =
        await searchParams;

    const isCancelled = cancelled === "1";
    const explanation =
        reason?.trim() ||
        (isCancelled
            ? "You cancelled the payment before it was completed. Your original registration is untouched."
            : "The payment gateway declined the transaction. No charge has been made and your original registration is untouched.");

    let eventId: string | null = eventIdFromQuery ?? null;
    let eventTitle: string | null = null;
    let cardToken: string | null = null;
    if (regId) {
        try {
            const reg = await prisma.eventRegistration.findUnique({
                where: { id: regId },
                select: {
                    qrToken: true,
                    parentRegistrationId: true,
                    event: { select: { id: true, title: true } },
                    parent: { select: { qrToken: true } },
                },
            });
            if (reg) {
                eventId = eventId ?? reg.event.id;
                eventTitle = reg.event.title;
                // Shadow rows point their qrToken at a doomed record; land the
                // "back to card" link on the parent when there is one.
                cardToken = reg.parent?.qrToken ?? reg.qrToken;
            }
        } catch {
            /* ignore — page still renders without the row context */
        }
    }

    const retryHref = eventId
        ? `/portal/events/${eventId}/add-divisions`
        : "/portal/events";

    return (
        <main className="min-h-screen bg-bg-charcoal pb-24 pt-24">
            <div className="mx-auto max-w-xl px-6">
                <div className="rounded-2xl border border-zinc-200 bg-white p-8 shadow-xl md:p-12">
                    <div className="flex flex-col items-center text-center">
                        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-red-50 text-red-600">
                            <XCircle size={36} />
                        </div>
                        <p className="mt-6 text-[11px] uppercase tracking-[0.4em] text-red-600">
                            {isCancelled
                                ? "Payment cancelled"
                                : "Payment unsuccessful"}
                        </p>
                        <h1 className="mt-3 font-serif text-3xl text-zinc-900 md:text-4xl">
                            {eventTitle
                                ? `We couldn't add your divisions for ${eventTitle}`
                                : "We couldn't add your divisions"}
                        </h1>
                        <p className="mt-3 max-w-md text-sm text-zinc-500">
                            {explanation}
                        </p>
                    </div>

                    <div className="mt-8 flex flex-col gap-3">
                        <Link
                            href={retryHref}
                            className="inline-flex items-center justify-center gap-2 rounded-sm bg-accent-red px-6 py-3 text-xs font-semibold uppercase tracking-widest text-white transition hover:bg-accent-red/90"
                        >
                            <RefreshCcw size={14} />
                            Try adding divisions again
                        </Link>
                        {cardToken && (
                            <Link
                                href={`/participants/${cardToken}`}
                                className="inline-flex items-center justify-center rounded-sm border border-zinc-200 px-6 py-3 text-xs font-semibold uppercase tracking-widest text-zinc-700 transition hover:border-accent-red hover:text-accent-red"
                            >
                                Back to my participation card
                            </Link>
                        )}
                        <a
                            href="mailto:support@jkabangladesh.com?subject=Add%20divisions%20payment%20issue"
                            className="inline-flex items-center justify-center gap-2 rounded-sm border border-zinc-200 px-6 py-3 text-xs font-semibold uppercase tracking-widest text-zinc-700 transition hover:border-accent-red hover:text-accent-red"
                        >
                            <Mail size={14} />
                            Contact support
                        </a>
                    </div>
                </div>
            </div>
        </main>
    );
}
