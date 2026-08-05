import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Calendar, Clock, MapPin, Users, UserPlus, Ticket } from "lucide-react";
import Navbar from "@/components/navbar";
import Footer from "@/components/footer";
import AttachmentViewer from "@/components/attachment-viewer";
import { prisma } from "@/lib/prisma";
import { applyDiscount, currentUserIsJkaMember } from "@/lib/auth/is-jka-member";
import { countUniqueParticipants } from "@/lib/events/participant-count";

type Props = { params: Promise<{ id: string }> };

const CATEGORY_LABEL: Record<string, string> = {
    SEMINAR: "Seminar",
    TRAINING_CAMP: "Training Camp",
    TOURNAMENT: "Tournament",
    // Legacy values still present on old rows.
    BELT_TEST: "Belt Test",
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
            tournamentDetail: {
                select: {
                    customDivisions: true,
                    registrationDeadline: true,
                },
            },
        },
    });

    if (!e || !e.isPublished) notFound();

    // Count distinct people, not division-entries — see participant-count.ts.
    const rsvpCount = await countUniqueParticipants(e.id);

    const divisions = e.tournamentDetail
        ? (await import("@/lib/tournaments/divisions")).parseCustomDivisions(
              e.tournamentDetail.customDivisions,
          )
        : [];
    const divisionPrices = divisions
        .map((d) => d.priceBdt)
        .filter((p): p is number => p !== null && p > 0);
    const isPremium = divisionPrices.length > 0;
    const minPrice = isPremium ? Math.min(...divisionPrices) : null;
    const maxPrice = isPremium ? Math.max(...divisionPrices) : null;
    const isMember = await currentUserIsJkaMember().catch(() => false);
    const memberDiscountActive =
        isPremium && isMember && e.memberDiscountPercent > 0;
    const displayMin =
        minPrice !== null && memberDiscountActive
            ? applyDiscount(minPrice, e.memberDiscountPercent)
            : minPrice;
    const displayMax =
        maxPrice !== null && memberDiscountActive
            ? applyDiscount(maxPrice, e.memberDiscountPercent)
            : maxPrice;
    const priceLabel =
        displayMin !== null && displayMax !== null
            ? displayMin === displayMax
                ? `৳${displayMin.toLocaleString()}`
                : `৳${displayMin.toLocaleString()} – ৳${displayMax.toLocaleString()}`
            : null;

    // eslint-disable-next-line react-hooks/purity -- server component re-renders per request (force-dynamic)
    const isPast = e.eventDate.getTime() < Date.now();
    const isFull = e.maxCapacity !== null && rsvpCount >= e.maxCapacity;
    const registrationDeadline = e.tournamentDetail?.registrationDeadline ?? null;
    const registrationClosed = registrationDeadline
        ? registrationDeadline.getTime() < Date.now()
        : false;

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
                        {isPremium && priceLabel ? (
                            <>
                                <span className="inline-flex items-center gap-1.5 text-[10px] tracking-widest uppercase font-bold px-3 py-1 rounded-full border border-amber-200 bg-amber-50 text-amber-700">
                                    <Ticket size={12} />
                                    {priceLabel} / division
                                </span>
                                {memberDiscountActive && (
                                    <span className="text-[10px] tracking-widest uppercase font-bold px-3 py-1 rounded-full border border-emerald-200 bg-emerald-50 text-emerald-700">
                                        Member −{e.memberDiscountPercent}%
                                    </span>
                                )}
                                {!isMember && e.memberDiscountPercent > 0 && (
                                    <span className="text-[10px] tracking-widest uppercase font-bold px-3 py-1 rounded-full border border-emerald-200 bg-emerald-50 text-emerald-700">
                                        Members save {e.memberDiscountPercent}%
                                    </span>
                                )}
                            </>
                        ) : (
                            <span className="text-[10px] tracking-widest uppercase font-bold px-3 py-1 rounded-full border border-emerald-200 bg-emerald-50 text-emerald-700">
                                Free entry
                            </span>
                        )}
                        {divisions.length > 0 && (
                            <span className="text-[10px] tracking-widest uppercase font-bold px-3 py-1 rounded-full border border-zinc-200 bg-zinc-50 text-zinc-600">
                                {divisions.length} divisions
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
                        {registrationDeadline && (
                            <div className="flex items-start gap-3">
                                <Clock
                                    size={18}
                                    className={`mt-0.5 shrink-0 ${
                                        registrationClosed
                                            ? "text-zinc-400"
                                            : "text-accent-red"
                                    }`}
                                />
                                <div>
                                    <p className="text-[10px] tracking-widest uppercase font-bold text-zinc-400 mb-1">
                                        Registration deadline
                                    </p>
                                    <p
                                        className={`text-sm font-semibold ${
                                            registrationClosed
                                                ? "text-zinc-400 line-through"
                                                : "text-zinc-700"
                                        }`}
                                    >
                                        {formatDate(registrationDeadline)}
                                    </p>
                                    {registrationClosed && (
                                        <p className="text-[11px] uppercase tracking-widest font-bold text-zinc-500 mt-1">
                                            Closed
                                        </p>
                                    )}
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
                                    {rsvpCount}
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

                    {isPast ? (
                        <div className="mt-12 bg-zinc-100 border border-zinc-200 rounded-sm p-6 text-center text-sm text-zinc-500">
                            This event has already taken place.
                        </div>
                    ) : (
                        <div className="mt-12 bg-white border border-zinc-200 rounded-sm shadow-sm p-6 md:p-8 flex flex-col md:flex-row md:items-center justify-between gap-6">
                            <div>
                                <h3 className="font-serif font-bold text-lg text-zinc-900 mb-1">
                                    Join this event
                                </h3>
                                <p className="text-sm text-zinc-600">
                                    {isPremium
                                        ? `Pick your divisions, pay online, and get your participation card by email as soon as payment is confirmed.`
                                        : "Pick your divisions to get your participation card with a QR code to show at the door."}
                                </p>
                            </div>
                            {isFull ? (
                                <span className="inline-flex items-center justify-center px-6 py-3 text-xs font-bold tracking-widest uppercase border border-zinc-200 bg-zinc-50 text-zinc-400 rounded-sm">
                                    Fully booked
                                </span>
                            ) : registrationClosed ? (
                                <span className="inline-flex items-center justify-center px-6 py-3 text-xs font-bold tracking-widest uppercase border border-zinc-200 bg-zinc-50 text-zinc-400 rounded-sm">
                                    Registration closed
                                </span>
                            ) : (
                                <Link
                                    href={`/events/${e.id}/register`}
                                    className="inline-flex items-center justify-center gap-2 bg-accent-red text-white px-8 py-3 text-xs font-bold tracking-widest uppercase hover:bg-accent-red/90 transition-colors rounded-sm shrink-0"
                                >
                                    <UserPlus size={14} />
                                    Register now
                                </Link>
                            )}
                        </div>
                    )}
                </div>
            </article>
            <Footer />
        </main>
    );
}
