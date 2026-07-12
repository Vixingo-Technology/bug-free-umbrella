import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import {
    ArrowLeft,
    Calendar,
    MapPin,
    Ticket,
    ShieldAlert,
    LogIn,
} from "lucide-react";
import Navbar from "@/components/navbar";
import Footer from "@/components/footer";
import { prisma } from "@/lib/prisma";
import { createClient } from "@/lib/supabase/server";
import { registerForEventAndRedirect } from "@/app/actions/event-registration";
import {
    checkEligibility,
    loadViewerContext,
    PARTICIPANT_TYPE_LABEL,
    type EventGates,
} from "@/lib/events/eligibility";

type Props = {
    params: Promise<{ id: string }>;
    searchParams: Promise<{ error?: string }>;
};

export const metadata: Metadata = {
    title: "Register — JKA Bangladesh",
};

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

export default async function RegisterPage({ params, searchParams }: Props) {
    const { id } = await params;
    const { error } = await searchParams;

    const event = await prisma.event.findUnique({
        where: { id },
        select: {
            id: true,
            title: true,
            isPublished: true,
            eventDate: true,
            location: true,
            maxCapacity: true,
            dojoId: true,
            isPremium: true,
            ticketPrice: true,
            minAge: true,
            participantType: true,
            minRank: { select: { id: true, name: true, orderIndex: true } },
            _count: { select: { registrations: true } },
        },
    });
    if (!event || !event.isPublished) notFound();

    const ticketPrice = event.ticketPrice ? Number(event.ticketPrice) : null;
    const isPremium =
        event.isPremium && ticketPrice !== null && ticketPrice > 0;

    const gates: EventGates = {
        id: event.id,
        dojoId: event.dojoId,
        eventDate: event.eventDate,
        participantType: event.participantType,
        minAge: event.minAge,
        minRank: event.minRank,
        isPremium,
        ticketPrice,
    };

    // If signed in already, check whether this member is already registered;
    // skip the form and send them straight to their card (the card handles
    // the unpaid-ticket state).
    const supabase = await createClient();
    const {
        data: { user },
    } = await supabase.auth.getUser();

    const viewer = await loadViewerContext(user?.id ?? null);
    if (viewer.userId) {
        const existing = await prisma.eventRegistration.findFirst({
            where: { eventId: event.id, userId: viewer.userId },
            select: { qrToken: true },
        });
        if (existing) redirect(`/participants/${existing.qrToken}`);
    }

    const eligibility = checkEligibility(gates, viewer);

    const isFull =
        event.maxCapacity !== null &&
        event._count.registrations >= event.maxCapacity;

    const requirements: string[] = [];
    if (event.participantType !== "PUBLIC") {
        requirements.push(PARTICIPANT_TYPE_LABEL[event.participantType]);
    }
    if (event.minAge !== null) requirements.push(`Age ${event.minAge}+`);
    if (event.minRank) requirements.push(`${event.minRank.name} or above`);

    return (
        <main className="min-h-screen bg-bg-deep w-full overflow-hidden">
            <Navbar />
            <section className="pt-32 pb-24">
                <div className="max-w-2xl mx-auto px-6 lg:px-12">
                    <Link
                        href={`/events/${event.id}`}
                        className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-zinc-500 hover:text-accent-red transition-colors mb-8"
                    >
                        <ArrowLeft size={14} />
                        Back to event
                    </Link>

                    <p className="text-[10px] tracking-[0.4em] uppercase text-accent-red font-bold mb-3">
                        Register
                    </p>
                    <h1 className="font-karate text-2xl md:text-4xl text-zinc-900 mb-4 uppercase tracking-widest font-bold leading-tight">
                        {event.title}
                    </h1>

                    <div className="flex flex-col sm:flex-row gap-4 sm:gap-8 text-sm text-zinc-600 mb-4">
                        <span className="inline-flex items-center gap-2">
                            <Calendar
                                size={14}
                                className="text-accent-red"
                            />
                            {formatDate(event.eventDate)}
                        </span>
                        {event.location && (
                            <span className="inline-flex items-center gap-2">
                                <MapPin
                                    size={14}
                                    className="text-accent-red"
                                />
                                {event.location}
                            </span>
                        )}
                    </div>

                    {(isPremium || requirements.length > 0) && (
                        <div className="flex flex-wrap items-center gap-2 mb-8 border-b border-zinc-200 pb-6">
                            {isPremium && (
                                <span className="inline-flex items-center gap-1.5 text-[10px] tracking-widest uppercase font-bold px-3 py-1 rounded-full border border-amber-200 bg-amber-50 text-amber-700">
                                    <Ticket size={12} />
                                    Ticket ৳{ticketPrice?.toLocaleString()}
                                </span>
                            )}
                            {requirements.map((r) => (
                                <span
                                    key={r}
                                    className="text-[10px] tracking-widest uppercase font-bold px-3 py-1 rounded-full border border-zinc-200 bg-zinc-50 text-zinc-600"
                                >
                                    {r}
                                </span>
                            ))}
                        </div>
                    )}

                    {isFull ? (
                        <div className="bg-white border border-zinc-200 rounded-sm shadow-sm p-6 text-center">
                            <p className="text-base font-semibold text-zinc-900 mb-2">
                                This event is fully booked.
                            </p>
                            <p className="text-sm text-zinc-500">
                                Check back later — organisers may release more spots.
                            </p>
                        </div>
                    ) : !eligibility.ok && eligibility.requiresSignIn ? (
                        <div className="bg-white border border-zinc-200 rounded-sm shadow-sm p-6 text-center">
                            <p className="text-sm text-zinc-700 mb-5">
                                {eligibility.reason}
                            </p>
                            <Link
                                href={`/login?next=/events/${event.id}/register`}
                                className="inline-flex items-center justify-center gap-2 bg-accent-red text-white px-8 py-3 text-xs font-bold tracking-widest uppercase hover:bg-accent-red/90 transition-colors rounded-sm"
                            >
                                <LogIn size={14} />
                                Sign in to continue
                            </Link>
                        </div>
                    ) : !eligibility.ok ? (
                        <div className="bg-white border border-zinc-200 rounded-sm shadow-sm p-6 text-center">
                            <ShieldAlert
                                size={28}
                                className="text-accent-red mx-auto mb-3"
                            />
                            <p className="text-base font-semibold text-zinc-900 mb-2">
                                You&apos;re not eligible for this event.
                            </p>
                            <p className="text-sm text-zinc-500">
                                {eligibility.reason}
                            </p>
                        </div>
                    ) : (
                        <form
                            action={registerForEventAndRedirect}
                            className="bg-white border border-zinc-200 rounded-sm shadow-sm p-6"
                        >
                            <input type="hidden" name="eventId" value={event.id} />

                            {viewer.userId ? (
                                <div className="text-sm text-zinc-700 mb-5 bg-emerald-50 border border-emerald-200 rounded-sm px-4 py-3">
                                    Registering as <b>{viewer.fullName}</b> ({viewer.email}).
                                </div>
                            ) : (
                                <>
                                    <Field label="Full name" required>
                                        <input
                                            name="name"
                                            type="text"
                                            required
                                            className="w-full bg-zinc-50 border border-zinc-200 text-zinc-900 px-3 py-2.5 focus:outline-none focus:border-accent-red text-sm transition-colors rounded-sm"
                                        />
                                    </Field>
                                    <Field label="Email" required>
                                        <input
                                            name="email"
                                            type="email"
                                            required
                                            className="w-full bg-zinc-50 border border-zinc-200 text-zinc-900 px-3 py-2.5 focus:outline-none focus:border-accent-red text-sm transition-colors rounded-sm"
                                        />
                                    </Field>
                                    <Field label="Phone" required>
                                        <input
                                            name="phone"
                                            type="tel"
                                            required
                                            inputMode="numeric"
                                            pattern="\d{11}"
                                            maxLength={11}
                                            minLength={11}
                                            title="Phone number must be exactly 11 digits."
                                            placeholder="01XXXXXXXXX"
                                            className="w-full bg-zinc-50 border border-zinc-200 text-zinc-900 px-3 py-2.5 focus:outline-none focus:border-accent-red text-sm transition-colors rounded-sm"
                                        />
                                    </Field>
                                    <p className="text-xs text-zinc-500 mb-5">
                                        Already a JKA member?{" "}
                                        <Link
                                            href={`/login?next=/events/${event.id}/register`}
                                            className="text-accent-red font-semibold hover:underline"
                                        >
                                            Sign in
                                        </Link>{" "}
                                        for a faster registration.
                                    </p>
                                </>
                            )}

                            {eligibility.needsDateOfBirth && (
                                <Field
                                    label={`Date of birth (must be ${event.minAge}+ on the event date)`}
                                    required
                                >
                                    <input
                                        name="dateOfBirth"
                                        type="date"
                                        required
                                        className="w-full bg-zinc-50 border border-zinc-200 text-zinc-900 px-3 py-2.5 focus:outline-none focus:border-accent-red text-sm transition-colors rounded-sm"
                                    />
                                </Field>
                            )}

                            {eligibility.needsChildMemberNumber && (
                                <Field label="Your child's member number" required>
                                    <input
                                        name="childMemberNumber"
                                        type="text"
                                        required
                                        placeholder="e.g. JKA-2026-0123"
                                        className="w-full bg-zinc-50 border border-zinc-200 text-zinc-900 px-3 py-2.5 focus:outline-none focus:border-accent-red text-sm transition-colors rounded-sm"
                                    />
                                </Field>
                            )}

                            {error && (
                                <p className="text-sm text-red-600 mb-5">
                                    {error}
                                </p>
                            )}

                            {isPremium ? (
                                <>
                                    <div className="flex items-center justify-between text-sm text-zinc-700 border-t border-zinc-200 pt-4 mb-4">
                                        <span className="font-semibold">
                                            Ticket price
                                        </span>
                                        <span className="font-bold text-zinc-900">
                                            ৳{ticketPrice?.toLocaleString()}
                                        </span>
                                    </div>
                                    <button
                                        type="submit"
                                        className="w-full inline-flex items-center justify-center gap-2 bg-accent-red text-white px-4 py-3 text-xs font-bold tracking-widest uppercase hover:bg-accent-red/90 transition-colors rounded-sm"
                                    >
                                        <Ticket size={14} />
                                        Continue to payment
                                    </button>
                                    <p className="text-[11px] text-zinc-500 mt-3 text-center">
                                        You&apos;ll get your participation card
                                        as soon as the payment is confirmed.
                                    </p>
                                </>
                            ) : (
                                <button
                                    type="submit"
                                    className="w-full inline-flex items-center justify-center gap-2 bg-accent-red text-white px-4 py-3 text-xs font-bold tracking-widest uppercase hover:bg-accent-red/90 transition-colors rounded-sm"
                                >
                                    Get my participation card
                                </button>
                            )}
                        </form>
                    )}
                </div>
            </section>
            <Footer />
        </main>
    );
}

function Field({
    label,
    required,
    children,
}: {
    label: string;
    required?: boolean;
    children: React.ReactNode;
}) {
    return (
        <label className="block mb-4">
            <span className="text-[10px] tracking-widest uppercase font-bold text-zinc-500 block mb-1">
                {label}
                {required && <span className="text-accent-red ml-1">*</span>}
            </span>
            {children}
        </label>
    );
}
