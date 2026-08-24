import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft, Calendar, MapPin } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { createClient } from "@/lib/supabase/server";
import { isJkaMember } from "@/lib/auth/is-jka-member";
import { DEFAULT_TIME_ZONE } from "@/lib/format/datetime";
import { parseCustomDivisions } from "@/lib/tournaments/divisions";
import AddDivisionsForm, {
    type AddDivisionsEvent,
    type ExistingMember,
} from "@/components/events/add-divisions-form";

type Props = {
    params: Promise<{ eventId: string }>;
    searchParams: Promise<{ error?: string }>;
};

export const metadata: Metadata = {
    title: "Add divisions — JKA Bangladesh",
};

export const dynamic = "force-dynamic";

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

export default async function AddDivisionsPage({
    params,
    searchParams,
}: Props) {
    const { eventId } = await params;
    const { error } = await searchParams;

    const supabase = await createClient();
    const {
        data: { user },
    } = await supabase.auth.getUser();
    if (!user) redirect(`/login?next=/portal/events/${eventId}/add-divisions`);

    const [event, beltRanks] = await Promise.all([
        prisma.event.findUnique({
            where: { id: eventId },
            select: {
                id: true,
                title: true,
                isPublished: true,
                eventDate: true,
                location: true,
                multiDivisionDiscountType: true,
                multiDivisionDiscountPercent: true,
                tournamentDetail: true,
            },
        }),
        prisma.beltRank.findMany({
            orderBy: { orderIndex: "asc" },
            select: { id: true, name: true, orderIndex: true },
        }),
    ]);
    if (!event || !event.isPublished) notFound();

    const divisions = event.tournamentDetail
        ? parseCustomDivisions(event.tournamentDetail.customDivisions)
        : [];
    if (divisions.length === 0) {
        redirect(`/portal/events`);
    }

    const allExistingRows = await prisma.eventRegistration.findMany({
        where: { eventId, userId: user.id },
        orderBy: { createdAt: "asc" },
        select: {
            divisionCode: true,
            entrantGender: true,
            entrantBeltRank: true,
            entrantWeightKg: true,
            entrantDojoName: true,
            guestDateOfBirth: true,
            selectedOptionalFees: true,
            paymentStatus: true,
        },
    });
    // Only PAID rows (or null status = free registrations) count as
    // "already registered". PENDING/FAILED shadow rows from an in-flight or
    // failed add-flow payment must not lock addons or divisions — otherwise
    // a failed payment would leave the addon appearing as "Paid" on next
    // visit, blocking a retry. Stale PENDING/FAILED rows for the same
    // division get cleaned up on submit by addDivisionsToRegistrationAction.
    const existingRows = allExistingRows.filter(
        (r) => r.paymentStatus === "PAID" || r.paymentStatus === null,
    );
    if (existingRows.length === 0) {
        // Not registered yet — send them through the full flow instead.
        redirect(`/events/${eventId}/register`);
    }

    const existingDivisionCodes = Array.from(
        new Set(
            existingRows
                .map((r) => r.divisionCode)
                .filter((c): c is string => !!c),
        ),
    );

    // Aggregate every addon the member has already PAID for on each division —
    // several add-flow purchases may have piled up. PENDING shadow rows are
    // intentionally excluded above so a failed payment doesn't lock the addon.
    const pickedAddonIdsByCode: Record<string, string[]> = {};
    for (const r of existingRows) {
        if (!r.divisionCode) continue;
        const raw = r.selectedOptionalFees;
        if (!Array.isArray(raw)) continue;
        for (const item of raw) {
            if (!item || typeof item !== "object") continue;
            const id = (item as Record<string, unknown>).id;
            if (typeof id !== "string" || !id) continue;
            const list =
                pickedAddonIdsByCode[r.divisionCode] ??
                (pickedAddonIdsByCode[r.divisionCode] = []);
            if (!list.includes(id)) list.push(id);
        }
    }

    // Nothing left to add when every division is already registered AND every
    // optional fee on those divisions has already been picked.
    const nothingLeftToAdd =
        divisions.every((d) => existingDivisionCodes.includes(d.code)) &&
        divisions.every((d) => {
            const optional = d.fees?.filter((f) => !f.required) ?? [];
            const picked = pickedAddonIdsByCode[d.code] ?? [];
            return optional.every((f) => picked.includes(f.id));
        });
    if (nothingLeftToAdd) {
        redirect(`/portal/events`);
    }

    const me = await prisma.user.findUnique({
        where: { id: user.id },
        select: {
            fullName: true,
            memberNumber: true,
            profile: { select: { dateOfBirth: true, gender: true } },
            student: { select: { currentRank: true, dojo: { select: { name: true } } } },
        },
    });

    const base = existingRows[0];
    const dob =
        me?.profile?.dateOfBirth ??
        base.guestDateOfBirth ??
        null;
    const beltRank = me?.student?.currentRank ?? base.entrantBeltRank ?? null;
    let rankOrderIndex: number | null = null;
    if (beltRank) {
        const rank = await prisma.beltRank.findUnique({
            where: { name: beltRank },
            select: { orderIndex: true },
        });
        rankOrderIndex = rank?.orderIndex ?? null;
    }

    const memberDiscountActive = await isJkaMember(user.id);

    const registrationEvent: AddDivisionsEvent = {
        id: event.id,
        title: event.title,
        eventDate: event.eventDate.toISOString(),
        memberDiscountActive,
        divisions,
        multiDivisionDiscountType:
            event.multiDivisionDiscountType === "FIXED" ? "FIXED" : "PERCENT",
        multiDivisionDiscountPercent: Number(event.multiDivisionDiscountPercent),
        registrationDeadline: event.tournamentDetail?.registrationDeadline
            ? event.tournamentDetail.registrationDeadline.toISOString()
            : null,
        beltRanks,
    };

    const member: ExistingMember = {
        fullName: me?.fullName ?? "You",
        memberNumber: me?.memberNumber ?? null,
        gender: (base.entrantGender ?? me?.profile?.gender ?? null) as
            | "MALE"
            | "FEMALE"
            | null,
        dateOfBirth: dob ? dob.toISOString().slice(0, 10) : null,
        beltRank,
        dojoName: base.entrantDojoName ?? me?.student?.dojo?.name ?? null,
        weightKg: base.entrantWeightKg ? Number(base.entrantWeightKg) : null,
        existingDivisionCodes,
        pickedAddonIdsByCode,
        rankOrderIndex,
    };

    return (
        <div className="space-y-6 max-w-3xl mx-auto">
            <div>
                <Link
                    href="/portal/events"
                    className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-zinc-500 hover:text-accent-red transition-colors mb-6"
                >
                    <ArrowLeft size={14} />
                    Back to events
                </Link>
                <p className="text-[10px] tracking-[0.4em] uppercase text-accent-red font-bold mb-3">
                    Add divisions
                </p>
                <h1 className="font-karate text-2xl md:text-3xl text-zinc-900 uppercase tracking-widest font-bold leading-tight">
                    {event.title}
                </h1>
                <div className="flex flex-col sm:flex-row gap-3 sm:gap-6 text-sm text-zinc-600 mt-4">
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
            </div>

            <AddDivisionsForm
                event={registrationEvent}
                member={member}
                initialError={error ?? null}
            />
        </div>
    );
}
