import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import {
    Calendar,
    MapPin,
    CheckCircle2,
    ArrowLeft,
    AlertCircle,
    Ticket,
} from "lucide-react";
import QRCode from "qrcode";
import Logo from "@/assets/jka_logo.svg";
import PrintButton from "@/components/print-button";
import { prisma } from "@/lib/prisma";
import { createClient } from "@/lib/supabase/server";
import {
    checkInFromCardAction,
    payForRegistrationAction,
} from "@/app/actions/event-registration";

type Props = {
    params: Promise<{ token: string }>;
    searchParams: Promise<{
        checked?: string;
        error?: string;
        paid?: string;
        payfailed?: string;
    }>;
};

export const metadata: Metadata = {
    title: "Participation Card — JKA Bangladesh",
};

export const dynamic = "force-dynamic";

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

function formatCheckedInAt(d: Date): string {
    return d.toLocaleString("en-GB", {
        day: "numeric",
        month: "short",
        year: "numeric",
        hour: "numeric",
        minute: "2-digit",
    });
}

export default async function ParticipationCardPage({
    params,
    searchParams,
}: Props) {
    const { token } = await params;
    const { checked, error, paid, payfailed } = await searchParams;

    const registration = await prisma.eventRegistration.findUnique({
        where: { qrToken: token },
        include: {
            event: {
                include: {
                    dojo: { select: { name: true } },
                },
            },
            user: {
                select: {
                    fullName: true,
                    email: true,
                    phone: true,
                    memberNumber: true,
                },
            },
        },
    });

    if (!registration) notFound();

    const participantName =
        registration.user?.fullName ?? registration.guestName ?? "Participant";
    const participantEmail =
        registration.user?.email ?? registration.guestEmail ?? "";
    const participantPhone =
        registration.user?.phone ?? registration.guestPhone ?? "";
    const memberNumber = registration.user?.memberNumber ?? null;

    const appUrl =
        process.env.NEXT_PUBLIC_APP_URL ??
        process.env.APP_URL ??
        "http://localhost:3000";
    // Scanning the QR lands on this very page so the door staff sees the
    // participant's details and a check-in button if they have authority.
    const cardUrl = `${appUrl}/participants/${token}`;

    // Generate the QR as an inline SVG string — keeps the page server-rendered
    // and avoids a client-side QR library.
    const qrSvg = await QRCode.toString(cardUrl, {
        type: "svg",
        errorCorrectionLevel: "M",
        margin: 1,
        width: 260,
    });

    const checkedIn = !!registration.checkedInAt;
    const paymentPending =
        registration.paymentStatus === "PENDING" ||
        registration.paymentStatus === "FAILED";
    const amountDue = registration.amountDue
        ? Number(registration.amountDue)
        : null;

    // Does the current viewer have authority to check this participant in?
    const supabase = await createClient();
    const {
        data: { user },
    } = await supabase.auth.getUser();

    let canCheckIn = false;
    if (user) {
        const { loadCurrentUser } = await import("@/lib/auth/load-current-user");
        const me = await loadCurrentUser(user.id);
        if (me) {
            if (me.role === "ADMIN") {
                canCheckIn = true;
            } else if (me.role === "DOJO_OWNER" || me.role === "DOJO_MANAGER") {
                const ownsByDojo =
                    !!registration.event.dojoId &&
                    registration.event.dojoId === me.dojoId;
                const ownsByPost = registration.event.postedById === user.id;
                canCheckIn = ownsByDojo || ownsByPost;
            }
        }
    }

    return (
        <main className="min-h-screen bg-bg-deep w-full overflow-hidden print:bg-white print:min-h-0">
            <section className="py-12 md:py-20 print:py-0">
                <div className="max-w-2xl mx-auto px-6 lg:px-12 print:px-0 print:max-w-none">
                    <Link
                        href={`/events/${registration.event.id}`}
                        className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-zinc-500 hover:text-accent-red transition-colors mb-8 print:hidden"
                    >
                        <ArrowLeft size={14} />
                        Back to event
                    </Link>

                    {paid === "1" && !paymentPending && (
                        <div className="mb-6 flex items-center gap-2 text-sm font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-4 py-3 rounded-sm print:hidden">
                            <CheckCircle2 size={16} className="shrink-0" />
                            Payment confirmed — your participation card is ready.
                        </div>
                    )}
                    {payfailed === "1" && paymentPending && (
                        <div className="mb-6 flex items-center gap-2 text-sm font-semibold text-red-700 bg-red-50 border border-red-200 px-4 py-3 rounded-sm print:hidden">
                            <AlertCircle size={16} className="shrink-0" />
                            The payment didn&apos;t go through. You can try again below.
                        </div>
                    )}

                    <div className="bg-white border-2 border-zinc-900 shadow-xl rounded-sm overflow-hidden print:shadow-none print:border print:rounded-none">
                        {/* Header strip */}
                        <div className="bg-white border-b border-zinc-200 px-6 py-4 flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <Image
                                    src={Logo}
                                    alt="JKA Bangladesh logo"
                                    width={40}
                                    height={40}
                                />
                                <div>
                                    <p className="text-[10px] tracking-[0.3em] uppercase font-bold text-zinc-500">
                                        JKA Bangladesh
                                    </p>
                                    <p className="text-xs font-bold tracking-widest uppercase text-zinc-900">
                                        Participation Card
                                    </p>
                                </div>
                            </div>
                            {paymentPending ? (
                                <span className="inline-flex items-center gap-1.5 text-[10px] tracking-widest uppercase font-bold px-3 py-1 rounded-full bg-amber-50 text-amber-700 border border-amber-200">
                                    <Ticket size={12} />
                                    Payment due
                                </span>
                            ) : checkedIn ? (
                                <span className="inline-flex items-center gap-1.5 text-[10px] tracking-widest uppercase font-bold px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                                    <CheckCircle2 size={12} />
                                    Checked in
                                </span>
                            ) : null}
                        </div>

                        {/* Body */}
                        <div className="p-6 md:p-8 grid md:grid-cols-[1fr_auto] gap-8 items-start">
                            <div className="min-w-0">
                                <p className="text-[10px] tracking-widest uppercase font-bold text-accent-red mb-2">
                                    Event
                                </p>
                                <h2 className="font-karate text-xl md:text-2xl text-zinc-900 uppercase tracking-wider font-bold leading-tight mb-4">
                                    {registration.event.title}
                                </h2>

                                <ul className="space-y-2 text-xs text-zinc-600 mb-6">
                                    <li className="flex items-center gap-2">
                                        <Calendar
                                            size={12}
                                            className="text-accent-red shrink-0"
                                        />
                                        {formatDate(registration.event.eventDate)}
                                    </li>
                                    {registration.event.location && (
                                        <li className="flex items-center gap-2">
                                            <MapPin
                                                size={12}
                                                className="text-accent-red shrink-0"
                                            />
                                            {registration.event.location}
                                        </li>
                                    )}
                                    {registration.event.dojo?.name && (
                                        <li className="text-[10px] tracking-widest uppercase font-bold text-zinc-400">
                                            {registration.event.dojo.name}
                                        </li>
                                    )}
                                </ul>

                                <div className="border-t border-zinc-200 pt-4">
                                    <p className="text-[10px] tracking-widest uppercase font-bold text-zinc-400 mb-1">
                                        Participant
                                    </p>
                                    <p className="text-base font-bold text-zinc-900 mb-1">
                                        {participantName}
                                    </p>
                                    {participantEmail && (
                                        <p className="text-xs text-zinc-500">
                                            {participantEmail}
                                        </p>
                                    )}
                                    {participantPhone && (
                                        <p className="text-xs text-zinc-500">
                                            {participantPhone}
                                        </p>
                                    )}
                                    {memberNumber && (
                                        <p className="text-[10px] tracking-widest uppercase font-bold text-zinc-400 mt-1">
                                            Member #{memberNumber}
                                        </p>
                                    )}
                                </div>
                            </div>

                            {paymentPending ? (
                                <div className="flex flex-col items-center justify-center bg-amber-50 border border-amber-200 rounded-sm p-6 text-center max-w-[240px]">
                                    <Ticket
                                        size={28}
                                        className="text-amber-600 mb-3"
                                    />
                                    <p className="text-sm font-bold text-zinc-900 mb-1">
                                        Ticket not paid yet
                                    </p>
                                    <p className="text-xs text-zinc-600">
                                        Your QR code will appear here once the
                                        {amountDue
                                            ? ` ৳${amountDue.toLocaleString()}`
                                            : ""}{" "}
                                        ticket payment is confirmed.
                                    </p>
                                </div>
                            ) : (
                                <div className="flex flex-col items-center md:items-end">
                                    <div
                                        className="bg-white p-3 border border-zinc-200 rounded-sm"
                                        dangerouslySetInnerHTML={{ __html: qrSvg }}
                                    />
                                    <p className="text-[10px] tracking-widest uppercase font-bold text-zinc-400 mt-3 text-center md:text-right">
                                        Show this at the door
                                    </p>
                                    <p className="text-[10px] font-mono text-zinc-400 mt-1 select-all break-all max-w-[180px] text-center md:text-right">
                                        {token}
                                    </p>
                                </div>
                            )}
                        </div>

                        {checkedIn && registration.checkedInAt && (
                            <div className="px-6 md:px-8 py-3 bg-emerald-50 border-t border-emerald-200 text-xs text-emerald-700 font-semibold flex items-center gap-2">
                                <CheckCircle2 size={14} />
                                Checked in {formatCheckedInAt(registration.checkedInAt)}
                            </div>
                        )}
                    </div>

                    {paymentPending && (
                        <div className="mt-6 bg-white border border-amber-200 rounded-sm shadow-sm p-5 print:hidden">
                            <p className="text-[10px] tracking-widest uppercase font-bold text-amber-600 mb-2">
                                Payment required
                            </p>
                            <p className="text-sm text-zinc-600 mb-4">
                                This is a premium event. Complete the
                                {amountDue
                                    ? ` ৳${amountDue.toLocaleString()}`
                                    : ""}{" "}
                                ticket payment to activate your participation
                                card.
                            </p>
                            <form action={payForRegistrationAction}>
                                <input type="hidden" name="token" value={token} />
                                <button
                                    type="submit"
                                    className="w-full inline-flex items-center justify-center gap-2 bg-accent-red text-white px-4 py-3 text-xs font-bold tracking-widest uppercase hover:bg-accent-red/90 transition-colors rounded-sm"
                                >
                                    <Ticket size={14} />
                                    Pay now{amountDue ? ` · ৳${amountDue.toLocaleString()}` : ""}
                                </button>
                            </form>
                        </div>
                    )}

                    {canCheckIn && (
                        <div className="mt-6 bg-white border border-zinc-200 rounded-sm shadow-sm p-5 print:hidden">
                            <p className="text-[10px] tracking-widest uppercase font-bold text-zinc-400 mb-3">
                                Authority controls
                            </p>

                            {error && (
                                <div className="mb-3 flex items-center gap-2 text-xs font-semibold text-red-700 bg-red-50 border border-red-200 px-3 py-2 rounded-sm">
                                    <AlertCircle size={14} className="shrink-0" />
                                    {error}
                                </div>
                            )}
                            {checked === "1" && (
                                <div className="mb-3 flex items-center gap-2 text-xs font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-3 py-2 rounded-sm">
                                    <CheckCircle2 size={14} className="shrink-0" />
                                    Marked as checked in.
                                </div>
                            )}
                            {checked === "already" && (
                                <div className="mb-3 flex items-center gap-2 text-xs font-semibold text-amber-700 bg-amber-50 border border-amber-200 px-3 py-2 rounded-sm">
                                    <CheckCircle2 size={14} className="shrink-0" />
                                    This participant was already checked in.
                                </div>
                            )}

                            {checkedIn ? (
                                <p className="text-sm text-zinc-600">
                                    {participantName} is already marked present
                                    {registration.checkedInAt
                                        ? ` (${formatCheckedInAt(registration.checkedInAt)})`
                                        : ""}
                                    .
                                </p>
                            ) : (
                                <form action={checkInFromCardAction}>
                                    <input type="hidden" name="token" value={token} />
                                    <button
                                        type="submit"
                                        className="w-full inline-flex items-center justify-center gap-2 bg-accent-red text-white px-4 py-3 text-xs font-bold tracking-widest uppercase hover:bg-accent-red/90 transition-colors rounded-sm"
                                    >
                                        <CheckCircle2 size={14} />
                                        Mark as checked in
                                    </button>
                                </form>
                            )}
                        </div>
                    )}

                    <div className="mt-8 grid sm:grid-cols-2 gap-3 print:hidden">
                        <PrintButton />
                        <Link
                            href={`/events/${registration.event.id}`}
                            className="inline-flex items-center justify-center gap-2 border border-zinc-300 text-zinc-700 hover:border-accent-red hover:text-accent-red px-4 py-2.5 text-xs font-bold tracking-widest uppercase rounded-sm transition-colors"
                        >
                            Back to event
                        </Link>
                    </div>

                    <p className="text-xs text-zinc-500 mt-6 text-center print:hidden">
                        Save this page — the URL is your private link to this card.
                    </p>
                </div>
            </section>
        </main>
    );
}
