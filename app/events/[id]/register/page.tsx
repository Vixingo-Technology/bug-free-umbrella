import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Calendar, MapPin } from "lucide-react";
import Navbar from "@/components/navbar";
import Footer from "@/components/footer";
import { prisma } from "@/lib/prisma";
import { createClient } from "@/lib/supabase/server";
import { isJkaMember } from "@/lib/auth/is-jka-member";
import { DEFAULT_TIME_ZONE } from "@/lib/format/datetime";
import TournamentRegistrationForm, {
    type MemberAutofill,
    type TournamentRegistrationEvent,
} from "@/components/events/tournament-registration-form";
import { parseCustomDivisions } from "@/lib/tournaments/divisions";

type Props = {
    params: Promise<{ id: string }>;
    searchParams: Promise<{ error?: string }>;
};

export const metadata: Metadata = {
    title: "Register — JKA Bangladesh",
};

function formatDate(d: Date): string {
    return new Intl.DateTimeFormat("en-GB", {
        weekday: "long",
        day: "numeric",
        month: "long",
        year: "numeric",
        hour: "numeric",
        minute: "2-digit",
        timeZone: DEFAULT_TIME_ZONE,
    }).format(d);
}

export default async function RegisterPage({ params, searchParams }: Props) {
    const { id } = await params;
    const { error } = await searchParams;

    const [event, beltRanks] = await Promise.all([
        prisma.event.findUnique({
            where: { id },
            select: {
                id: true,
                title: true,
                isPublished: true,
                eventDate: true,
                location: true,
                maxCapacity: true,
                multiDivisionDiscountType: true,
                multiDivisionDiscountPercent: true,
                ticketPrice: true,
                tournamentDetail: true,
            },
        }),
        prisma.beltRank.findMany({
            orderBy: { orderIndex: "asc" },
            select: { id: true, name: true, orderIndex: true },
        }),
    ]);
    if (!event || !event.isPublished) notFound();

    const supabase = await createClient();
    const {
        data: { user },
    } = await supabase.auth.getUser();

    const divisions = event.tournamentDetail
        ? parseCustomDivisions(event.tournamentDetail.customDivisions)
        : [];
    const registrantIsMember = user ? await isJkaMember(user.id) : false;
    // Any per-fee discount kicks in only for signed-in JKA members with an
    // active membership.
    const memberDiscountActive = registrantIsMember;

    let memberAutofill: MemberAutofill = null;
    if (user) {
        const [me, lastRegistration] = await Promise.all([
            prisma.user.findUnique({
                where: { id: user.id },
                select: {
                    fullName: true,
                    email: true,
                    phone: true,
                    memberNumber: true,
                    profile: {
                        select: {
                            dateOfBirth: true,
                            gender: true,
                            emergencyContactName: true,
                            emergencyContactPhone: true,
                        },
                    },
                    student: {
                        select: {
                            currentRank: true,
                            dojo: { select: { name: true } },
                        },
                    },
                },
            }),
            // Fall back to values the user has previously typed on their own
            // registrations so gender/coach carry over when the profile
            // hasn't captured them.
            prisma.eventRegistration.findFirst({
                where: { userId: user.id },
                orderBy: { createdAt: "desc" },
                select: {
                    entrantGender: true,
                    coachName: true,
                },
            }),
        ]);
        if (me) {
            let rankOrderIndex: number | null = null;
            if (me.student?.currentRank) {
                const rank = await prisma.beltRank.findUnique({
                    where: { name: me.student.currentRank },
                    select: { orderIndex: true },
                });
                rankOrderIndex = rank?.orderIndex ?? null;
            }
            memberAutofill = {
                userId: user.id,
                fullName: me.fullName ?? "",
                email: me.email ?? "",
                phone: me.phone,
                memberNumber: me.memberNumber ?? null,
                dateOfBirth: me.profile?.dateOfBirth
                    ? me.profile.dateOfBirth.toISOString().slice(0, 10)
                    : null,
                gender: me.profile?.gender ?? lastRegistration?.entrantGender ?? null,
                currentRank: me.student?.currentRank ?? null,
                dojoName: me.student?.dojo?.name ?? null,
                coachName: lastRegistration?.coachName ?? null,
                emergencyContactName: me.profile?.emergencyContactName ?? null,
                emergencyContactPhone: me.profile?.emergencyContactPhone ?? null,
                rankOrderIndex,
            };
        }
    }

    const registrationEvent: TournamentRegistrationEvent = {
        id: event.id,
        title: event.title,
        eventDate: event.eventDate.toISOString(),
        memberDiscountActive,
        divisions,
        eventTicketPriceBdt: event.ticketPrice ? Number(event.ticketPrice) : null,
        multiDivisionDiscountType:
            event.multiDivisionDiscountType === "FIXED" ? "FIXED" : "PERCENT",
        multiDivisionDiscountPercent: Number(event.multiDivisionDiscountPercent),
        registrationDeadline: event.tournamentDetail?.registrationDeadline
            ? event.tournamentDetail.registrationDeadline.toISOString()
            : null,
        beltRanks,
    };

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
                    <div className="flex flex-col sm:flex-row gap-4 sm:gap-8 text-sm text-zinc-600 mb-8">
                        <span className="inline-flex items-center gap-2">
                            <Calendar size={14} className="text-accent-red" />
                            {formatDate(event.eventDate)}
                        </span>
                        {event.location && (
                            <span className="inline-flex items-center gap-2">
                                <MapPin size={14} className="text-accent-red" />
                                {event.location}
                            </span>
                        )}
                    </div>
                    <TournamentRegistrationForm
                        event={registrationEvent}
                        member={memberAutofill}
                        signInHref={`/login?next=/events/${event.id}/register`}
                        initialError={error ?? null}
                    />
                </div>
            </section>
            <Footer />
        </main>
    );
}
